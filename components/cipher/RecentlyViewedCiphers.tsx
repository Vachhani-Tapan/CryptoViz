"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CipherDefinition } from "../../lib/cipher/registry";
import {
  clearRecentCipherIds,
  loadRecentCipherIds,
} from "../../lib/utils/recentCiphers";

interface RecentlyViewedCiphersProps {
  ciphers: CipherDefinition[];
}

const statusStyles: Record<CipherDefinition["securityStatus"], string> = {
  secure:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400",
  deprecated:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400",
  broken:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400",
};

export default function RecentlyViewedCiphers({
  ciphers,
}: RecentlyViewedCiphersProps) {
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setRecentIds(loadRecentCipherIds());
    setHasLoaded(true);
  }, []);

  const recentCiphers = useMemo(() => {
    const cipherMap = new Map(ciphers.map((cipher) => [cipher.id, cipher]));
    return recentIds
      .map((id) => cipherMap.get(id))
      .filter((cipher): cipher is CipherDefinition => Boolean(cipher));
  }, [ciphers, recentIds]);

  if (!hasLoaded || recentCiphers.length === 0) return null;

  const handleClear = () => {
    clearRecentCipherIds();
    setRecentIds([]);
  };

  return (
    <section
      aria-labelledby="recently-viewed-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="recently-viewed-heading"
            className="text-xl font-bold text-zinc-950 dark:text-white"
          >
            Recently viewed
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Continue exploring the ciphers you opened most recently.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        >
          Clear history
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {recentCiphers.map((cipher) => (
          <Link
            key={cipher.id}
            href={`/visualizer/${cipher.id}/`}
            className="group rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-teal-700 dark:hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-zinc-900 group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-400">
                {cipher.name}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles[cipher.securityStatus]}`}
              >
                {cipher.securityStatus}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {cipher.category}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {cipher.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
