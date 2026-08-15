/**
 * Minimal R2 (S3-compatible) client for the illustration pipeline:
 * put/get/list/delete on one bucket, with SigV4 hand-rolled against
 * `node:crypto` rather than pulling in the AWS SDK. Credentials come from the
 * environment (see `credentialsFromEnv`): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, and optionally R2_BUCKET.
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
 * Build the signed URL + headers for one S3 request. Pure given `now`;
 * exported so the vitest suite can pin a known request against a fixed clock.
 * `body` must be a Buffer (or undefined): R2 requires the real payload hash
 * in `x-amz-content-sha256`, so streaming uploads are out of scope.
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

// Transient conditions worth retrying: R2 intermittently answers with a
// gateway status or DNS failure under concurrent bursts. Blanket retry is
// safe because every operation here is idempotent.
const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 6;

const nap = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sign and send one S3 request against R2, retrying transient failures. */
async function signedFetch(creds, req) {
  let lastDetail = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Re-sign per attempt: the signature covers x-amz-date, and stale headers
    // eventually fail the 15-minute skew check.
    const { url, headers } = buildSignedRequest(creds, req);
    let res;
    let networkErr;
    try {
      res = await fetch(url, { method: req.method, headers, body: req.body });
    } catch (err) {
      networkErr = err;
    }
    if (res?.ok) return res;

    const transient = networkErr !== undefined || RETRY_STATUS.has(res?.status);
    lastDetail = networkErr
      ? networkErr.message
      : `${res.status} ${(await res.text().catch(() => "")).slice(0, 400)}`;
    if (!transient || attempt === MAX_ATTEMPTS - 1) break;

    await nap(Math.min(16_000, 500 * 2 ** attempt));
  }
  throw new Error(`R2 ${req.method} ${req.key || req.bucket} failed: ${lastDetail}`);
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
      return (await this.listDetailed(prefix)).map((o) => o.key);
    },
    /** As `list`, but keeping the size and last-modified each `<Contents>`
     *  already carries — asking afterwards would be a HEAD per object. */
    async listDetailed(prefix) {
      const unescape = (s) =>
        s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const out = [];
      let token;
      do {
        const query = { "list-type": "2", prefix };
        if (token) query["continuation-token"] = token;
        const res = await signedFetch(creds, { method: "GET", bucket, query });
        const xml = await res.text();
        for (const entry of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
          const key = /<Key>([^<]*)<\/Key>/.exec(entry[1])?.[1];
          if (key === undefined) continue;
          out.push({
            key: unescape(key),
            size: Number(/<Size>(\d+)<\/Size>/.exec(entry[1])?.[1] ?? 0),
            lastModified: /<LastModified>([^<]+)<\/LastModified>/.exec(entry[1])?.[1] ?? null,
          });
        }
        const next = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml);
        token = next ? next[1] : undefined;
      } while (token);
      return out;
    },
  };
}
