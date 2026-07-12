import type { BenchmarkSession } from "@/types/benchmark";

export const BENCHMARK_HISTORY_KEY = "cryptoviz-benchmark-history";
export const MAX_BENCHMARK_HISTORY = 20;

function reviveSession(session: BenchmarkSession): BenchmarkSession {
  return {
    ...session,
    timestamp: new Date(session.timestamp),
    results: session.results.map((result) => ({
      ...result,
      timestamp: new Date(result.timestamp),
    })),
  };
}

export function loadBenchmarkHistory(): BenchmarkSession[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(BENCHMARK_HISTORY_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as BenchmarkSession[];
    return parsed.map(reviveSession);
  } catch {
    return [];
  }
}

export function saveBenchmarkHistory(sessions: BenchmarkSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BENCHMARK_HISTORY_KEY,
    JSON.stringify(sessions.slice(0, MAX_BENCHMARK_HISTORY)),
  );
}

export function addBenchmarkSession(
  sessions: BenchmarkSession[],
  session: BenchmarkSession,
): BenchmarkSession[] {
  return [session, ...sessions.filter((item) => item.id !== session.id)].slice(
    0,
    MAX_BENCHMARK_HISTORY,
  );
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return "Unavailable";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}
