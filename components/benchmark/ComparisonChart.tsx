'use client'

import React, { useMemo, useCallback } from 'react'
import { BenchmarkResult } from '@/types/benchmark'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  LabelList,
  Cell,
} from 'recharts'

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'classical':
      return '#0d9488' // Teal-600
    case 'symmetric':
      return '#2563eb' // Blue-600
    case 'asymmetric':
      return '#db2777' // Pink-600
    case 'hash':
      return '#16a34a' // Green-600
    default:
      return '#7c3aed' // Purple-600
  }
}

const getItemColor = (item: any, index: number, chartType: string) => {
  if (chartType === 'scatter') {
    return getCategoryColor(item.category)
  }
  return index === 0 ? '#14b8a6' : index % 2 === 0 ? '#22c55e' : '#ef4444'
}

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-md dark:border-zinc-800 dark:bg-zinc-950/95 font-sans">
        <p className="font-semibold text-zinc-900 dark:text-white">{data.fullName}</p>
        <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400 font-sans">
          <p>
            <span className="font-medium text-zinc-500">Category:</span>{' '}
            <span className="capitalize">{data.category}</span>
          </p>
          <p>
            <span className="font-medium text-zinc-500">Ops/Second:</span>{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">{data.opsPerSec.toLocaleString()}</span>
          </p>
          <p>
            <span className="font-medium text-zinc-500">Avg Time:</span>{' '}
            <span className="font-mono">{data.avgTime.toFixed(4)} ms</span>
          </p>
          <p>
            <span className="font-medium text-zinc-500">Min/Max:</span>{' '}
            <span className="font-mono text-zinc-500">{data.minTime.toFixed(4)} / {data.maxTime.toFixed(4)} ms</span>
          </p>
        </div>
      </div>
    )
  }
  return null
}


interface ComparisonChartProps {
  results: BenchmarkResult[]
  chartType?: 'bar' | 'line' | 'scatter'
}

export default React.memo(function ComparisonChart({
  results,
  chartType = 'bar',
}: ComparisonChartProps) {
  if (results.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">No data to display. Run a benchmark first.</p>
      </div>
    )
  }

  const chartData = useMemo(() => results.map((result) => ({
    name: result.cipherName.substring(0, 15), // Truncate long names
    avgTime: parseFloat(result.averageTime.toFixed(4)),
    minTime: parseFloat(result.minTime.toFixed(4)),
    maxTime: parseFloat(result.maxTime.toFixed(4)),
    opsPerSec: parseFloat(result.operationsPerSecond.toFixed(0)),
    fullName: result.cipherName,
    category: result.category,
  })), [results])

  const sortedData = useMemo(() => [...chartData].sort((a, b) => a.avgTime - b.avgTime), [chartData])

  const renderChart = useCallback(() => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: any) => (typeof value === 'number' ? value.toFixed(4) : value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgTime"
              stroke="#14b8a6"
              name="Average Time"
              dot={{ fill: '#14b8a6' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="minTime"
              stroke="#22c55e"
              name="Min Time"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="maxTime"
              stroke="#ef4444"
              name="Max Time"
              strokeDasharray="5 5"
            />
          </LineChart>
        )

      case 'scatter':
        return (
          <ScatterChart
            margin={{ top: 25, right: 35, bottom: 25, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis
              type="number"
              dataKey="opsPerSec"
              name="Ops/Second"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              label={{ value: 'Operations/Second (higher is better)', position: 'insideBottom', offset: -10, fill: '#888888', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="avgTime"
              name="Avg Time (ms)"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              label={{ value: 'Avg Time (ms) (lower is better)', angle: -90, position: 'insideLeft', fill: '#888888', fontSize: 11 }}
            />
            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Algorithms" data={sortedData} fill="#14b8a6">
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
              ))}
              <LabelList
                dataKey="name"
                position="top"
                offset={10}
                style={{ fill: '#71717a', fontSize: '9px', fontWeight: 500 }}
              />
            </Scatter>
          </ScatterChart>
        )

      default:
        return (
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: any) => (typeof value === 'number' ? value.toFixed(4) : value)}
            />
            <Legend />
            <Bar dataKey="avgTime" fill="#14b8a6" name="Average Time" radius={[8, 8, 0, 0]} />
            <Bar dataKey="minTime" fill="#22c55e" name="Min Time" radius={[8, 8, 0, 0]} />
            <Bar dataKey="maxTime" fill="#ef4444" name="Max Time" radius={[8, 8, 0, 0]} />
          </BarChart>
        )
    }
  }, [chartType, sortedData])

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Performance Comparison
      </h3>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        {chartType === 'scatter' && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <span className="font-semibold text-zinc-900 dark:text-white">Categories:</span>
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded bg-[#0d9488]" />
              <span>Classical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded bg-[#2563eb]" />
              <span>Symmetric</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded bg-[#db2777]" />
              <span>Asymmetric</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded bg-[#16a34a]" />
              <span>Hash</span>
            </div>
          </div>
        )}
        <p className="font-medium">Algorithms (sorted by average time):</p>
        <div className="mt-2 space-y-1">
          {sortedData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded"
                style={{
                  backgroundColor: getItemColor(item, index, chartType),
                }}
              ></div>
              <span>{item.fullName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
