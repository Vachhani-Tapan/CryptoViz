'use client'

import { useState, useCallback, useEffect } from 'react'
import { BenchmarkResult, BenchmarkSession } from '@/types/benchmark'
import { BenchmarkEngine, PRESET_INPUT_SIZES, PRESET_ITERATIONS } from '@/lib/utils/benchmark'
import { getDeviceInfo } from '@/lib/utils/deviceInfo'
import { useCipherWorker } from '@/lib/hooks/useCipherWorker'
import AlgorithmSelector from '@/components/benchmark/AlgorithmSelector'
import BenchmarkControls from '@/components/benchmark/BenchmarkControls'
import PerformanceMetrics from '@/components/benchmark/PerformanceMetrics'
import ComparisonChart from '@/components/benchmark/ComparisonChart'
import DeviceInfoDisplay from '@/components/benchmark/DeviceInfoDisplay'
import ExportButton from '@/components/benchmark/ExportButton'
import CategoryTabs from '@/components/benchmark/CategoryTabs'
import Navbar from '@/components/layout/Navbar'
import { CIPHER_REGISTRY } from '@/lib/cipher/registry'

// Helper to get benchmark parameters tailored to the cipher to ensure correct and successful execution
const getBenchmarkParams = (
  cipherId: string,
  category: string,
  inputSize: number,
  defaultKey: string,
): { input: string; key: string; options: any } => {
  const input = BenchmarkEngine.generateInput(inputSize)
  let key = ''
  let options: any = {}

  switch (cipherId) {
    case 'otp':
      // One-Time Pad key must be at least as long as the input
      key = BenchmarkEngine.generateInput(inputSize)
      break
    case 'caesar':
      // Shift value between 1 and 25
      key = Math.floor(Math.random() * 25 + 1).toString()
      break
    case 'railfence':
      // Number of rails (integer >= 2)
      key = Math.floor(Math.random() * 8 + 3).toString()
      break
    case 'rot13':
      key = ''
      break
    case 'aes':
      // AES-256 key: 32 bytes (64 hex characters), AES-128: 16 bytes (32 hex characters)
      key = BenchmarkEngine.generateKey(32)
      break
    case 'des':
      // DES key: 8 bytes (16 hex characters)
      key = BenchmarkEngine.generateKey(16)
      break
    case '3des':
      // 3DES key: 16 bytes (32 hex characters)
      key = BenchmarkEngine.generateKey(32)
      break
    case 'rsa':
      // RSA demo mode is slow and crashes on large inputs. Use simulated real mode.
      options = { mode: 'real' }
      key = defaultKey // "61,53" - needs a valid key format
      break
    case 'dh':
      // DH demo mode expects "a,b" format for input. Use simulated real mode.
      options = { mode: 'real' }
      key = defaultKey // "23,5" - needs a valid key format
      break
    case 'ecc':
      // ECC expects private key of 32 bytes (64 hex characters)
      key = BenchmarkEngine.generateKey(64)
      break
    case 'bcrypt':
      // Bcrypt is slow. For benchmarking, use a low cost factor/rounds
      options = { rounds: 4 }
      key = defaultKey
      break
    default:
      key = category === 'hash' ? '' : defaultKey
  }

  return { input, key, options }
}

export default function BenchmarkPage() {
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'classical' | 'symmetric' | 'asymmetric' | 'hash'
  >('all')
  const [inputSize, setInputSize] = useState<number>(1024)
  const [iterations, setIterations] = useState<number>(100)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [session, setSession] = useState<BenchmarkSession | null>(null)
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter'>('bar')
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>('')

  const { runCipher } = useCipherWorker()

  // Get device info on mount
  useEffect(() => {
    const deviceInfo = getDeviceInfo()
    setSession({
      id: `session-${Date.now()}`,
      timestamp: new Date(),
      deviceInfo,
      results: [],
    })
  }, [])

  // Filter algorithms based on selected category
  const handleCategoryChange = useCallback(
    (category: 'all' | 'classical' | 'symmetric' | 'asymmetric' | 'hash') => {
      setSelectedCategory(category)
      const filtered = CIPHER_REGISTRY.filter((c) => category === 'all' || c.category === category)
      setSelectedAlgorithms(filtered.map((c) => c.id).slice(0, 3)) // Pre-select first 3
    },
    [],
  )

  const handleBenchmarkStart = useCallback(async () => {
    if (selectedAlgorithms.length === 0) {
      setError('Please select at least one algorithm to benchmark')
      return
    }

    setIsRunning(true)
    setError(null)
    setResults([])
    setProgressMessage('')

    try {
      const benchmarkResults: BenchmarkResult[] = []

      for (let i = 0; i < selectedAlgorithms.length; i++) {
        const cipherId = selectedAlgorithms[i]
        const cipherDef = CIPHER_REGISTRY.find((c) => c.id === cipherId)

        if (!cipherDef) continue

        setProgressMessage(
          `Benchmarking ${i + 1}/${selectedAlgorithms.length}: ${cipherDef.name}...`,
        )

        const measurements: number[] = []

        try {
          const { input, key, options } = getBenchmarkParams(
            cipherId,
            cipherDef.category,
            inputSize,
            cipherDef.defaultKey,
          )

          // Warm-up run
          try {
            await runCipher('encrypt', cipherId, input, key, options)
          } catch (err) {
            // Warm-up might fail, that's ok
          }

          // Run actual benchmarks
          for (let j = 0; j < iterations; j++) {
            try {
              const result = await runCipher('encrypt', cipherId, input, key, options)
              measurements.push(BenchmarkEngine.measureCipherTime(result))
            } catch (err) {
              console.error(`Iteration ${j + 1} failed for ${cipherId}:`, err)
              // Continue with other iterations
            }
          }

          if (measurements.length > 0) {
            const benchmarkResult = BenchmarkEngine.createBenchmarkResult(
              cipherId,
              measurements,
              inputSize,
              measurements.length,
            )
            benchmarkResults.push(benchmarkResult)
          } else {
            setError((prev) => (prev || '') + `No successful measurements for ${cipherDef.name}. `)
          }
        } catch (err) {
          console.error(`Benchmark failed for ${cipherId}:`, err)
          setError((prev) => (prev || '') + `Benchmark error for ${cipherDef.name}. `)
        }

        // Small delay between algorithms to prevent CPU throttling
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setResults(benchmarkResults)
      if (session) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                results: benchmarkResults,
                timestamp: new Date(),
              }
            : null,
        )
      }
      setProgressMessage('')
    } finally {
      setIsRunning(false)
    }
  }, [selectedAlgorithms, inputSize, iterations, session, runCipher])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Performance Benchmark Dashboard
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Measure and compare the execution characteristics of cryptographic algorithms
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Progress Message */}
        {progressMessage && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
            {progressMessage}
          </div>
        )}

        {/* Main Layout */}
        <div className="space-y-8">
          {/* Category Selection */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Algorithm Categories
            </h2>
            <CategoryTabs
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </section>

          {/* Algorithm Selection */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Select Algorithms to Benchmark
            </h2>
            <AlgorithmSelector
              selectedAlgorithms={selectedAlgorithms}
              onSelectionChange={setSelectedAlgorithms}
              category={selectedCategory === 'all' ? null : selectedCategory}
            />
          </section>

          {/* Benchmark Configuration */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Benchmark Configuration
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <BenchmarkControls
                inputSize={inputSize}
                iterations={iterations}
                isRunning={isRunning}
                onInputSizeChange={setInputSize}
                onIterationsChange={setIterations}
                onBenchmarkStart={handleBenchmarkStart}
              />

              {/* Device Information */}
              {session && (
                <DeviceInfoDisplay deviceInfo={session.deviceInfo} />
              )}
            </div>
          </section>

          {/* Results Section */}
          {results.length > 0 && (
            <>
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Performance Metrics
                  </h2>
                  {session && <ExportButton results={results} session={session} />}
                </div>
                <PerformanceMetrics results={results} />
              </section>

              {/* Visualization */}
              <section>
                <div className="mb-4 space-y-3">
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Performance Visualization
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {(['bar', 'line', 'scatter'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`rounded-lg px-4 py-2 font-medium capitalize transition-colors ${
                          chartType === type
                            ? 'bg-teal-600 text-white dark:bg-teal-500'
                            : 'border border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        {type} Chart
                      </button>
                    ))}
                  </div>
                </div>
                <ComparisonChart results={results} chartType={chartType} />
              </section>

              {/* Export Section */}
              <section className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    Export Results
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Download benchmark results as CSV for further analysis
                  </p>
                </div>
                {session && <ExportButton results={results} session={session} />}
              </section>
            </>
          )}

          {/* Getting Started */}
          {results.length === 0 && !isRunning && (
            <section className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Ready to benchmark?
              </h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Select algorithms above and configure the benchmark parameters, then click "Start Benchmarks" to see performance metrics.
              </p>
              <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <p>💡 Tips:</p>
                <ul className="list-inside space-y-1">
                  <li>• Start with 100 iterations for quick results</li>
                  <li>• Increase iterations for more accurate measurements</li>
                  <li>• Compare different input sizes to observe scalability</li>
                  <li>• Export results to CSV for detailed analysis</li>
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
