import type { ScrapeStrategy } from './index.js'
import type { RetryConfig } from './options.js'

export type RetryAttemptContext = {
  error: unknown
  attempt: number
  maxAttempts: number
  nextRetryDelay: number
  retryConfig: RetryConfig
}

export type RetryExhaustedContext = {
  error: unknown
  totalAttempts: number
  retryConfig: RetryConfig
}

export type StrategyFailedContext = {
  error: unknown
  strategy: ScrapeStrategy
  strategyIndex: number
  totalStrategies: number
}

export type AllStrategiesFailedContext = {
  lastError: unknown
  strategies: Array<ScrapeStrategy>
  totalAttempts: number
}

export type ScrapeHooks = {
  onRetryAttempt?: (context: RetryAttemptContext) => void
  onRetryExhausted?: (context: RetryExhaustedContext) => void
  onStrategyFailed?: (context: StrategyFailedContext) => void
  onAllStrategiesFailed?: (context: AllStrategiesFailedContext) => void
}
