import { createHmac, createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as r2 from "../scripts/lib/r2.mjs";

// r2.mjs is a plain script module with no type declarations; TypeScript infers
// loose shapes for its exports, so bind the two under test to the signatures
// this suite actually exercises.
const buildSignedRequest = r2.buildSignedRequest as (
  creds: { accountId: string; accessKeyId: string; secretAccessKey: string },
  req: {
    method: string;
    bucket: string;
    key?: string;
    query?: Record<string, string>;
    body?: Buffer;
    contentType?: string;
  },
  now?: Date,
) => { url: string; headers: Record<string, string> };
const credentialsFromEnv = r2.credentialsFromEnv as (
  env: Record<string, string | undefined>,
) => unknown;

// The illustration pipeline talks to R2 over the S3 API with hand-rolled SigV4
// (scripts/lib/r2.mjs) rather than pulling in the AWS SDK. There is no R2 to
// call from CI, so the signing is pinned here against an independently computed
// signature: if the canonical request, the scope, or the key derivation drifts,
// these fail loudly instead of turning into a 403 during a generation run.

const CREDS = {
  accountId: "acct123",
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "secretkey",
};
const NOW = new Date("2026-07-29T01:02:03.456Z");

/** Independent reimplementation of the SigV4 signature for one known request. */
function expectedSignature({
  method,
  bucket,
  key,
  canonicalQuery,
  payloadHash,
  contentType,
}: {
  method: string;
  bucket: string;
  key: string;
  canonicalQuery: string;
  payloadHash: string;
  contentType?: string;
}) {
  const amzDate = "20260729T010203Z";
  const dateStamp = "20260729";
  const host = `${CREDS.accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}${key ? `/${key}` : ""}`;

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;
  const names = Object.keys(headers).sort();
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    names.map((n) => `${n}:${headers[n]}\n`).join(""),
    names.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const hmac = (k: Buffer | string, d: string) => createHmac("sha256", k).update(d).digest();
  const signing = hmac(
    hmac(hmac(hmac(`AWS4${CREDS.secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );
  return createHmac("sha256", signing).update(stringToSign).digest("hex");
}

describe("R2 SigV4 signing", () => {
  it("signs a PUT with the payload hash and content type", () => {
    const body = Buffer.from("hello illustration");
    const { url, headers } = buildSignedRequest(
      CREDS,
      {
        method: "PUT",
        bucket: "dataslope-illustrations",
        key: "illustrations/run1/python-basics-loops/v1/original.png",
        body,
        contentType: "image/png",
      },
      NOW,
    );

    expect(url).toBe(
      "https://acct123.r2.cloudflarestorage.com/dataslope-illustrations/" +
        "illustrations/run1/python-basics-loops/v1/original.png",
    );
    const payloadHash = createHash("sha256").update(body).digest("hex");
    expect(headers["x-amz-content-sha256"]).toBe(payloadHash);
    expect(headers["x-amz-date"]).toBe("20260729T010203Z");
    expect(headers.Authorization).toContain(
      "Credential=AKIAEXAMPLE/20260729/auto/s3/aws4_request",
    );
    expect(headers.Authorization).toContain(
      "SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date",
    );
    expect(headers.Authorization).toContain(
      `Signature=${expectedSignature({
        method: "PUT",
        bucket: "dataslope-illustrations",
        key: "illustrations/run1/python-basics-loops/v1/original.png",
        canonicalQuery: "",
        payloadHash,
        contentType: "image/png",
      })}`,
    );
  });

  it("hashes an empty payload for a GET and sorts query parameters", () => {
    const { url, headers } = buildSignedRequest(
      CREDS,
      {
        method: "GET",
        bucket: "b",
        query: { prefix: "illustrations/run1/", "list-type": "2" },
      },
      NOW,
    );
    // Canonical query must be sorted by key: list-type before prefix.
    expect(url).toBe(
      "https://acct123.r2.cloudflarestorage.com/b?list-type=2&prefix=illustrations%2Frun1%2F",
    );
    const emptyHash = createHash("sha256").update("").digest("hex");
    expect(headers["x-amz-content-sha256"]).toBe(emptyHash);
    expect(headers.Authorization).toContain(
      `Signature=${expectedSignature({
        method: "GET",
        bucket: "b",
        key: "",
        canonicalQuery: "list-type=2&prefix=illustrations%2Frun1%2F",
        payloadHash: emptyHash,
      })}`,
    );
  });

  it("escapes each key segment but keeps the separators", () => {
    const { url } = buildSignedRequest(
      CREDS,
      { method: "GET", bucket: "b", key: "illustrations/run 1/a+b/original.png" },
      NOW,
    );
    expect(url).toContain("/b/illustrations/run%201/a%2Bb/original.png");
  });

  it("names every missing credential rather than failing on the first", () => {
    expect(() => credentialsFromEnv({ R2_ACCOUNT_ID: "x" })).toThrow(
      /R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY/,
    );
  });
});
