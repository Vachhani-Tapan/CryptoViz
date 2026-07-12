import { CIPHER_REGISTRY } from "../cipher/registry";

export const RECENT_CIPHERS_STORAGE_KEY = "cryptoviz-recent-ciphers";
export const MAX_RECENT_CIPHERS = 8;

export function getSupportedCipherIds(): ReadonlySet<string> {
  return new Set(CIPHER_REGISTRY.map((cipher) => cipher.id));
}

export function normalizeRecentCipherIds(
  value: unknown,
  supportedIds: ReadonlySet<string> = getSupportedCipherIds(),
): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string" || seen.has(item) || !supportedIds.has(item)) {
      continue;
    }

    seen.add(item);
    normalized.push(item);

    if (normalized.length === MAX_RECENT_CIPHERS) break;
  }

  return normalized;
}

export function loadRecentCipherIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_CIPHERS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeRecentCipherIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveRecentCipherIds(ids: string[]): string[] {
  const normalized = normalizeRecentCipherIds(ids);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        RECENT_CIPHERS_STORAGE_KEY,
        JSON.stringify(normalized),
      );
    } catch {
      // localStorage can be unavailable in private mode or when quota is full.
    }
  }

  return normalized;
}

export function recordRecentCipher(
  currentIds: string[],
  cipherId: string,
): string[] {
  const supportedIds = getSupportedCipherIds();
  if (!supportedIds.has(cipherId)) {
    return normalizeRecentCipherIds(currentIds, supportedIds);
  }

  return normalizeRecentCipherIds(
    [cipherId, ...currentIds.filter((id) => id !== cipherId)],
    supportedIds,
  );
}

export function clearRecentCipherIds(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(RECENT_CIPHERS_STORAGE_KEY);
  } catch {
    // Clearing history should remain a no-op when storage is unavailable.
  }
}
