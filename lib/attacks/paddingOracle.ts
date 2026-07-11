/**
 * Padding Oracle Attack Simulator — oracle wrapper + byte-recovery algorithm.
 *
 * SAFETY / SCOPE NOTE:
 * This module exists purely to teach the mechanics of the classic CBC
 * padding-oracle attack (the vulnerability class behind POODLE and related
 * TLS/SSL exploits) using CryptoViz's own sandboxed decrypt() function.
 * It never leaves the browser, never makes a network request, and the
 * PaddingOracle class below exposes nothing but a boolean. Do not adapt
 * this module to wrap a remote endpoint — it is an in-app teaching tool,
 * not an offensive-security utility.
 *
 * INTEGRATION NOTES (based on the real lib/cipher/symmetric/aes.ts):
 * - `decrypt(input: string, key: string, options)` takes a hex string of
 *   `IV_hex + ciphertext_hex` and internally calls unpadPKCS7(), which
 *   throws distinct CipherError messages ("Invalid PKCS7 padding value."
 *   vs "Invalid PKCS7 padding bytes.") — this is the exact leak the issue
 *   describes, and the "vulnerable" oracle below calls this real function
 *   completely unmodified, one block at a time.
 * - Only `encrypt`, `decrypt`, `expandKey`, and `processBlock` are exported
 *   from aes.ts. `xorBlocks`, `unpadPKCS7`, and `getKeyBytes` are private
 *   to that module, so the "fixed" oracle (which can't reuse decrypt()'s
 *   naive unpadding at all) reimplements the small amount of glue it needs
 *   locally, using the same exported primitives aes.ts itself is built on.
 *   Exporting those three helpers from aes.ts would let this file shrink;
 *   consider it a small follow-up if reviewers want less duplication.
 */

import { decrypt, expandKey, processBlock } from "@/lib/cipher/symmetric/aes";
import { toByteArray, fromByteArray, CipherError } from "@/lib/utils";
import { constantTimeValidatePadding } from "./constantTimeCompare";

export const BLOCK_SIZE = 16;

export type OracleMode = "vulnerable" | "fixed";

export interface OracleQueryResult {
  isValidPadding: boolean;
}

export interface AttackStep {
  blockIndex: number;
  byteIndexFromEnd: number; // 1-based, counting from the end of the block
  guess: number; // 0-255
  isValidPadding: boolean;
  recoveredIntermediateByte?: number;
  recoveredPlaintextByte?: number;
}

function xorBlocks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) out[i] = a[i] ^ b[i];
  return out;
}

/**
 * Mirrors aes.ts's private getKeyBytes(): same hex-length sniffing, same
 * length validation. Needed here only because the "fixed" oracle calls
 * expandKey()/processBlock() directly and must derive key bytes itself;
 * the "vulnerable" oracle never needs this since it hands the raw key
 * string straight to the real decrypt().
 */
function deriveKeyBytes(key: string): Uint8Array {
  const isHexKey =
    /^[0-9a-fA-F]{32}$/.test(key) ||
    /^[0-9a-fA-F]{48}$/.test(key) ||
    /^[0-9a-fA-F]{64}$/.test(key);
  const keyBytes = isHexKey ? toByteArray(key, "hex") : toByteArray(key, "utf8");

  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new CipherError(
      "INVALID_KEY_LENGTH",
      `AES key must be exactly 16, 24, or 32 bytes (got ${keyBytes.length} bytes).`
    );
  }
  return keyBytes;
}

/**
 * Wraps the app's real decrypt() and exposes ONLY a boolean. Never returns
 * plaintext, never returns which CipherError fired, never logs anything.
 * This mirrors what a vulnerable (or, in "fixed" mode, patched) server
 * would leak to a network attacker: a distinguishable success/failure
 * response and nothing more.
 */
export class PaddingOracle {
  private readonly key: string;
  private readonly mode: OracleMode;
  private roundKeys: Uint8Array[] | null = null; // lazily computed, "fixed" mode only
  public queryCount = 0;

  constructor(key: string, mode: OracleMode = "vulnerable") {
    this.key = key;
    this.mode = mode;
  }

  /**
   * Query the oracle with a crafted "previous" block (acts as the IV for
   * this single-block CBC decryption) and the real target ciphertext
   * block. Returns only isValidPadding.
   */
  query(prevBlock: Uint8Array, targetBlock: Uint8Array): OracleQueryResult {
    this.queryCount++;

    if (this.mode === "fixed") {
      // Constant-time path: does NOT go through decrypt()/unpadPKCS7 (which
      // has no constant-time option). Instead it does the same AES block
      // decryption aes.ts does internally, via the same exported
      // primitives, then validates padding with a function that always
      // walks the whole block and returns a single boolean.
      try {
        if (!this.roundKeys) {
          this.roundKeys = expandKey(deriveKeyBytes(this.key));
        }
        const rawPlainBlock = processBlock(targetBlock, this.roundKeys, true);
        const plainBlock = xorBlocks(rawPlainBlock, prevBlock);
        return { isValidPadding: constantTimeValidatePadding(plainBlock) };
      } catch {
        return { isValidPadding: false };
      }
    }

    // Vulnerable path: call the real, unmodified decrypt() with a hex
    // string built from our crafted "IV" plus the real target block. This
    // is a genuine attack against genuine code — decrypt() internally
    // throws one of two distinct CipherError messages on bad padding, and
    // we deliberately discard everything except valid/invalid, exactly as
    // an attacker watching a distinguishable server response would.
    try {
      const ivHex = fromByteArray(prevBlock, "hex");
      const blockHex = fromByteArray(targetBlock, "hex");
      decrypt(ivHex + blockHex, this.key, { mode: "CBC", encoding: "hex" });
      return { isValidPadding: true };
    } catch {
      return { isValidPadding: false };
    }
  }
}

/**
 * Recovers a single 16-byte plaintext block using the classic CBC
 * padding-oracle byte-flipping technique, working from the last byte
 * back to the first.
 *
 * For each target pad value p (1..16), we craft a "previous" block C'
 * such that decrypting [C'] + [targetBlock] yields a plaintext whose
 * trailing bytes are all p. Bytes after the one we're currently attacking
 * are already known from earlier rounds (their intermediate state I[j]),
 * so we can force them to decrypt to p while brute-forcing C'[pos] over
 * all 256 values. The guess that yields valid padding reveals
 * I[pos] = guess ^ p, and the true plaintext byte is I[pos] ^ prevBlock[pos].
 */
export function recoverBlock(
  oracle: PaddingOracle,
  prevBlock: Uint8Array,
  targetBlock: Uint8Array,
  onStep?: (step: AttackStep) => void,
  blockIndex = 0
): Uint8Array {
  const intermediate = new Uint8Array(BLOCK_SIZE);
  const plaintext = new Uint8Array(BLOCK_SIZE);
  const crafted = new Uint8Array(BLOCK_SIZE);

  for (let byteIndexFromEnd = 1; byteIndexFromEnd <= BLOCK_SIZE; byteIndexFromEnd++) {
    const pos = BLOCK_SIZE - byteIndexFromEnd;
    const padVal = byteIndexFromEnd;

    for (let k = pos + 1; k < BLOCK_SIZE; k++) {
      crafted[k] = intermediate[k] ^ padVal;
    }

    let found = false;

    for (let guess = 0; guess < 256; guess++) {
      // Skip the guess equal to the real byte on the final position to
      // avoid a trivial false positive against the message's own
      // unmodified, already-valid padding.
      if (byteIndexFromEnd === 1 && guess === prevBlock[pos]) continue;

      crafted[pos] = guess;
      const { isValidPadding } = oracle.query(crafted, targetBlock);

      onStep?.({ blockIndex, byteIndexFromEnd, guess, isValidPadding });

      if (isValidPadding) {
        // Disambiguate remaining false positives on the last byte by
        // flipping the second-to-last byte and confirming padding holds.
        if (byteIndexFromEnd === 1 && pos > 0) {
          const saved = crafted[pos - 1];
          crafted[pos - 1] ^= 0xff;
          const confirm = oracle.query(crafted, targetBlock);
          crafted[pos - 1] = saved;
          if (!confirm.isValidPadding) continue;
        }

        intermediate[pos] = guess ^ padVal;
        plaintext[pos] = intermediate[pos] ^ prevBlock[pos];

        onStep?.({
          blockIndex,
          byteIndexFromEnd,
          guess,
          isValidPadding: true,
          recoveredIntermediateByte: intermediate[pos],
          recoveredPlaintextByte: plaintext[pos],
        });

        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(
        `Attack failed to recover byte at position ${pos} of block ${blockIndex}. ` +
          `Against a correctly patched constant-time oracle, this is expected.`
      );
    }
  }

  return plaintext;
}

/**
 * Recovers the full plaintext across all ciphertext blocks, given the IV
 * and ciphertext in the app's existing byte format.
 */
export function recoverPlaintext(
  oracle: PaddingOracle,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  onStep?: (step: AttackStep) => void
): Uint8Array {
  const numBlocks = ciphertext.length / BLOCK_SIZE;
  if (!Number.isInteger(numBlocks) || numBlocks < 1) {
    throw new Error("Ciphertext length must be a positive multiple of the block size.");
  }

  const blocks = [iv, ...chunk(ciphertext, BLOCK_SIZE)];
  const plaintextBlocks: Uint8Array[] = [];

  for (let i = 1; i < blocks.length; i++) {
    plaintextBlocks.push(
      recoverBlock(oracle, blocks[i - 1], blocks[i], onStep, i - 1)
    );
  }

  return concat(plaintextBlocks);
}

function chunk(data: Uint8Array, size: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.subarray(i, i + size));
  return out;
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}