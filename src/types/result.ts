import type { CheerioAPI } from 'cheerio'
import type { Page, Response as PlaywrightResponse } from 'playwright'

export type ScrapeResultFetch = {
  mechanism: 'fetch'
  response: Response
  readonly $: CheerioAPI
}

export type ScrapeResultBrowser = {
  mechanism: 'browser'
  response: PlaywrightResponse
  page: Page
  cleanup: () => Promise<void>
}

export type ScrapeResultCustom<TCustomResponse> = {
  mechanism: 'custom'
  response: TCustomResponse
}

export type ScrapeResult<TCustomResponse> =
  | ScrapeResultFetch
  | ScrapeResultBrowser
  | ScrapeResultCustom<TCustomResponse>
