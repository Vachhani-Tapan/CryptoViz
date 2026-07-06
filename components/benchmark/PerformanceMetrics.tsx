'use client'

import { BenchmarkResult } from '@/types/benchmark'
import { calculateComparison } from '@/lib/utils/benchmark'

interface PerformanceMetricsProps {
  results: BenchmarkResult[]
}

export default function PerformanceMetrics({ results }: PerformanceMetricsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">No benchmark results yet. Run a benchmark to see metrics.</p>
      </div>
    )
  }

  const comparison = calculateComparison(results)

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
          <div className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            Fastest Algorithm
          </div>
          <div className="mt-2 text-lg font-bold text-green-900 dark:text-green-200">
            {comparison.fastest.cipherName}
          </div>
          <div className="mt-1 text-sm text-green-700 dark:text-green-400">
            {comparison.fastest.averageTime.toFixed(4)} ms/op
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            Slowest Algorithm
          </div>
          <div className="mt-2 text-lg font-bold text-red-900 dark:text-red-200">
            {comparison.slowest.cipherName}
          </div>
          <div className="mt-1 text-sm text-red-700 dark:text-red-400">
            {comparison.slowest.averageTime.toFixed(4)} ms/op
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Speed Ratio
          </div>
          <div className="mt-2 text-lg font-bold text-blue-900 dark:text-blue-200">
            {comparison.speedupRatio.toFixed(2)}x
          </div>
          <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
            Fastest is {comparison.speedupRatio.toFixed(2)}x faster
          </div>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-white">
                Algorithm
              </th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                Avg Time (ms)
              </th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                Min/Max (ms)
              </th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                Std Dev
              </th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                Ops/Sec
              </th>
            </tr>
          </thead>
          <tbody>
            {results
              .sort((a, b) => a.averageTime - b.averageTime)
              .map((result, index) => (
                <tr
                  key={`${result.cipherId}-${index}`}
                  className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-white">{result.cipherName}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{result.category}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-900 dark:text-white">
                    {result.averageTime.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {result.minTime.toFixed(4)} / {result.maxTime.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-900 dark:text-white">
                    ±{result.stdDev.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-teal-600 dark:text-teal-400">
                    {result.operationsPerSecond.toFixed(0)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
