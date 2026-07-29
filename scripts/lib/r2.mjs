/**
 * Minimal R2 (S3-compatible) client for the illustration pipeline.
 *
 * Why hand-rolled rather than `@aws-sdk/client-s3`: the only operations this
 * pipeline needs are put/get/list/delete on one bucket, and the AWS SDK is a
 * very large dependency to add to a repo that otherwise ships no AWS code.
 * SigV4 is about sixty lines against `node:crypto`, so it is written out here.
 *
 * Why not the Worker's R2 binding: these are authoring scripts run from a
 * laptop or CI, and a binding only exists inside a request. Talking to the S3
 * endpoint keeps content authoring decoupled from deploying the app.
 *
 * Credentials come from the environment (see `credentialsFromEnv`):
 *   R2_ACCOUNT_ID          Cloudflare account id
 *   R2_ACCESS_KEY_ID       R2 API token access key
 *   R2_SECRET_ACCESS_KEY   R2 API token secret
 *   R2_BUCKET              default bucket name (optional; may be passed instead)
 *
 * Create the token under Cloudflare dashboard → R2 → Manage API tokens, with
 * Object Read & Write scoped to the illustrations bucket.
 */
import { createHash, createHmac } from "node:crypto";

const SERVICE = "s3";
const REGION = "auto"; // R2 ignores region but SigV4 requires one in the scope.

const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding. S3 canonical requests need `!'()*` escaped too, and
 *  `encodeURIComponent` leaves them alone. */
function uriEncode(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Encode an object key for the URL path: each segment escaped, `/` kept. */
function encodeKey(key) {
  return key.split("/").map(uriEncode).join("/");
}

/** Read credentials from the environment, failing with an actionable message. */
export function credentialsFromEnv(env = process.env) {
  const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"].filter(
    (k) => !env[k],
  );
  if (missing.length) {
    throw new Error(
      `Missing R2 credentials: ${missing.join(", ")}.\n` +
        "Create an R2 API token (Cloudflare dashboard → R2 → Manage API tokens,\n" +
        "Object Read & Write) and export those three variables.",
    );
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
  };
}

/** Derive the SigV4 signing key: kDate → kRegion → kService → kSigning. */
function signingKey(secret, dateStamp) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

/**
 * Build the signed URL + headers for one S3 request. Pure given `now`, which is
 * why it is exported: the vitest suite pins a known request against a fixed
 * clock, so the signing can regress loudly without any network access.
 *
 * `body` must be a Buffer (or undefined). R2 requires the real payload hash in
 * `x-amz-content-sha256`, so streaming uploads are out of scope here — the
 * illustrations are a few MB each, well within a buffered PUT.
 */
export function buildSignedRequest(
  creds,
  { method, bucket, key = "", query = {}, body, contentType },
  now = new Date(),
) {
  const host = `${creds.accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}${key ? `/${encodeKey(key)}` : ""}`;

  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20260729T010203Z
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body ?? "");

  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaders.map((h) => `${h}:${headers[h]}\n`).join("");
  const signedHeaderList = signedHeaders.join(";");

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join("&");

  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderList,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = createHmac("sha256", signingKey(creds.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");

  return {
    url: `https://${host}${path}${canonicalQuery ? `?${canonicalQuery}` : ""}`,
    headers: {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaderList}, Signature=${signature}`,
    },
  };
}

/** Sign and send one S3 request against R2. */
async function signedFetch(creds, req) {
  const { url, headers } = buildSignedRequest(creds, req);
  const res = await fetch(url, { method: req.method, headers, body: req.body });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `R2 ${req.method} ${req.key || req.bucket} failed: ${res.status} ${detail.slice(0, 400)}`,
    );
  }
  return res;
}

export function createR2Client(creds = credentialsFromEnv(), bucket = creds.bucket) {
  if (!bucket) throw new Error("No R2 bucket given (set R2_BUCKET or pass one).");
  return {
    bucket,
    async put(key, body, contentType = "application/octet-stream") {
      await signedFetch(creds, { method: "PUT", bucket, key, body, contentType });
      return key;
    },
    async get(key) {
      const res = await signedFetch(creds, { method: "GET", bucket, key });
      return Buffer.from(await res.arrayBuffer());
    },
    async delete(key) {
      await signedFetch(creds, { method: "DELETE", bucket, key });
    },
    /** List every key under a prefix, following continuation tokens. */
    async list(prefix) {
      const keys = [];
      let token;
      do {
        const query = { "list-type": "2", prefix };
        if (token) query["continuation-token"] = token;
        const res = await signedFetch(creds, { method: "GET", bucket, query });
        const xml = await res.text();
        for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
          keys.push(m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
        }
        const next = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml);
        token = next ? next[1] : undefined;
      } while (token);
      return keys;
    },
  };
}
