import type { ViewportSize } from 'playwright'
import type { ValidateResponse } from './validate.js'

export type RetryType = 'exponential' | 'linear' | 'constant'

export type RetryConfig = {
  count?: number
  delay?: number
  type?: RetryType
}

export type ScrapeOptions<TCustomResponse = unknown> = {
  timeout?: number
  retries?: RetryConfig
  proxies?: Array<string>
  userAgents?: Array<string>
  viewports?: Array<ViewportSize>
  headers?: Record<string, string>
  validateResponse?: ValidateResponse<TCustomResponse>
}
