import type { MaybePromise } from 'trousse'
import type { ScrapeResult } from './result.js'

export type ScrapeManyStats = {
  initial: number
  discovered: number
  processed: number
  remaining: number
  succeeded: number
  failed: number
}

export type ScrapeManySuccessContext<TCustomResponse = unknown> = {
  result: ScrapeResult<TCustomResponse>
  url: string
  index: number
  addUrls: (urls: string | Array<string>) => void
  stats: ScrapeManyStats
}

export type ScrapeManyErrorContext = {
  error: unknown
  url: string
  index: number
  addUrls: (urls: string | Array<string>) => void
  stats: ScrapeManyStats
}

export type ScrapeManyConfig<TCustomResponse = unknown> = {
  onSuccess?: (context: ScrapeManySuccessContext<TCustomResponse>) => MaybePromise<void>
  onError?: (context: ScrapeManyErrorContext) => MaybePromise<void>
  delays?: { min: number; max: number }
}

export type ScrapeManyResult = {
  total: number
  succeeded: number
  failed: number
}
