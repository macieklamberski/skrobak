import type { ViewportSize } from 'playwright'
import type { BrowserConfig } from './browser.js'
import type { ScrapeOptions } from './options.js'

export type RequestOptions = {
  proxy?: string
  userAgent?: string
  viewport?: ViewportSize
  headers?: Record<string, string>
  timeout?: number
}

export type CustomFetchFn<TCustomResponse> = (
  url: string,
  options: RequestOptions,
) => Promise<TCustomResponse>

export type CustomConfig<TCustomResponse> = {
  fn: CustomFetchFn<TCustomResponse>
}

export type StrategyMechanism = 'fetch' | 'browser' | 'custom'

export type ScrapeStrategy = {
  mechanism: StrategyMechanism
  useProxy?: boolean
}

export type ScrapeConfig<TCustomResponse> = {
  options?: ScrapeOptions<TCustomResponse>
  browser?: BrowserConfig
  custom?: CustomConfig<TCustomResponse>
  strategies?: Array<ScrapeStrategy>
}
