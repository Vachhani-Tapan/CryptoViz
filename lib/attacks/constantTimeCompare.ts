/**
 * Constant-time comparison utilities used as the "Fix It" mitigation
 * reference implementation for the Padding Oracle Attack Simulator.
 *
 * A vulnerable oracle differentiates between "padding value wrong" and
 * "padding bytes wrong" failures, and/or short-circuits as soon as it finds
 * the first mismatching byte. Both behaviors leak information (a distinct
 * error message, or a timing difference) that an attacker can exploit.
 * The mitigation here always:
 *   1. Touches every byte of the block regardless of where the first
 *      mismatch occurs (no early return).
 *   2. Collapses every failure mode into a single boolean with no
 *      distinguishable reason.
 */

/**
 * Constant-time byte-array equality. Folds all mismatches into one bit
 * instead of returning as soon as a difference is found.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length; // length mismatch also folds into the result
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Constant-time PKCS#7 padding validation.
 *
 * Unlike a naive implementation that inspects the last byte, branches on
 * whether it's in range, then loops only over the claimed pad length and
 * returns immediately on the first bad byte (leaking both *which* check
 * failed and roughly *when* it failed), this walks every byte of the
 * block on every call and folds all outcomes into a single boolean.
 */
export function constantTimeValidatePadding(block: Uint8Array): boolean {
  const len = block.length;
  const padLen = block[len - 1];

  const padLenInRange = padLen >= 1 && padLen <= len ? 1 : 0;
  // Only used to keep the loop well-defined; doesn't change the timing
  // profile since every byte is still visited either way.
  const effectivePadLen = padLenInRange ? padLen : len;

  let mismatch = 0;
  for (let i = 0; i < len; i++) {
    const isPadByte = i >= len - effectivePadLen ? 1 : 0;
    // When isPadByte is 0 this contributes nothing (0 * anything), but the
    // XOR and multiply still execute — no branch, no early exit.
    mismatch |= isPadByte * (block[i] ^ padLen);
  }

  return padLenInRange === 1 && mismatch === 0;
}