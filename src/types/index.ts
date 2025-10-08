import type { ViewportSize } from 'playwright'
import type { BrowserConfig } from './browser.js'
import type { ScrapeHooks } from './hooks.js'
import type { ScrapeOptions } from './options.js'

export type RequestOptions = {
  proxy?: string
  userAgent?: string
  viewport?: ViewportSize
  headers?: Record<string, string>
  timeout?: number
}

export type CustomFetchFn<TCustomResponse = unknown> = (
  url: string,
  options: RequestOptions,
) => Promise<TCustomResponse>

export type CustomConfig<TCustomResponse = unknown> = {
  fn: CustomFetchFn<TCustomResponse>
}

export type StrategyMechanism = 'fetch' | 'browser' | 'custom'

export type ScrapeStrategy = {
  mechanism: StrategyMechanism
  useProxy?: boolean
}

export type ScrapeConfig<TCustomResponse = unknown> = {
  options?: ScrapeOptions<TCustomResponse>
  browser?: BrowserConfig
  custom?: CustomConfig<TCustomResponse>
  strategies?: Array<ScrapeStrategy>
  hooks?: ScrapeHooks
}
