/**
 * Benchmark types for performance measurement of cryptographic algorithms
 */

export interface BenchmarkResult {
  cipherId: string
  cipherName: string
  category: string
  inputSize: number
  direction: 'encrypt' | 'decrypt' | 'hash'
  iterations: number
  averageTime: number
  minTime: number
  maxTime: number
  stdDev: number
  totalTime: number
  operationsPerSecond: number
  timestamp: Date
}

export interface BenchmarkComparison {
  inputSize: number
  results: BenchmarkResult[]
}

export interface BenchmarkSession {
  id: string
  timestamp: Date
  deviceInfo: DeviceInfo
  results: BenchmarkResult[]
}

export interface DeviceInfo {
  userAgent: string
  hardwareConcurrency: number
  deviceMemory?: number
  language: string
  platform: string
  timezone: string
  screen: {
    width: number
    height: number
    colorDepth: number
    pixelDepth: number
  }
}

export interface AlgorithmGroup {
  category: 'classical' | 'symmetric' | 'asymmetric' | 'hash'
  algorithms: string[]
}
