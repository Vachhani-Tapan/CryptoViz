import { describe, expect, it } from "vitest";
import {
  MAX_RECENT_CIPHERS,
  normalizeRecentCipherIds,
  recordRecentCipher,
} from "../../lib/utils/recentCiphers";

const supported = new Set([
  "caesar",
  "aes",
  "rsa",
  "sha256",
  "des",
  "xor",
  "otp",
  "md5",
  "dh",
]);

describe("recent cipher history utilities", () => {
  it("rejects malformed values", () => {
    expect(normalizeRecentCipherIds(null, supported)).toEqual([]);
    expect(normalizeRecentCipherIds("caesar", supported)).toEqual([]);
  });

  it("removes duplicates and unsupported cipher ids", () => {
    expect(
      normalizeRecentCipherIds(
        ["caesar", "missing", "aes", "caesar", 42],
        supported,
      ),
    ).toEqual(["caesar", "aes"]);
  });

  it("moves a revisited cipher to the beginning", () => {
    expect(recordRecentCipher(["aes", "caesar", "rsa"], "caesar")).toEqual([
      "caesar",
      "aes",
      "rsa",
    ]);
  });

  it("does not add unsupported cipher ids", () => {
    expect(recordRecentCipher(["caesar", "aes"], "unknown")).toEqual([
      "caesar",
      "aes",
    ]);
  });

  it("keeps history within the configured maximum", () => {
    const ids = [
      "caesar",
      "aes",
      "rsa",
      "sha256",
      "des",
      "xor",
      "otp",
      "md5",
      "dh",
    ];

    expect(normalizeRecentCipherIds(ids, supported)).toHaveLength(
      MAX_RECENT_CIPHERS,
    );
  });
});
