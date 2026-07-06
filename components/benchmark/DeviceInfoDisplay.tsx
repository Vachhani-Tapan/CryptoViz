'use client'

import { DeviceInfo } from '@/types/benchmark'
import { formatDeviceInfo } from '@/lib/utils/deviceInfo'

interface DeviceInfoDisplayProps {
  deviceInfo: DeviceInfo
}

export default function DeviceInfoDisplay({ deviceInfo }: DeviceInfoDisplayProps) {
  const formattedInfo = formatDeviceInfo(deviceInfo)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Device & Browser Information
      </h3>

      <div className="space-y-3">
        {Object.entries(formattedInfo).map(([key, value]) => (
          <div
            key={key}
            className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800 last:border-b-0 last:pb-0"
          >
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{key}:</span>
            <span className="break-words text-right text-sm text-zinc-600 dark:text-zinc-400">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
        <p className="font-medium">Why this matters:</p>
        <p className="mt-1">
          Device specifications affect benchmark results. CPU cores, memory, and browser implementation can cause significant variations in performance metrics.
        </p>
      </div>
    </div>
  )
}
