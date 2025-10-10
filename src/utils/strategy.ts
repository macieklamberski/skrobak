import { type CheerioAPI, load } from 'cheerio'
import defaults from '../defaults.json' with { type: 'json' }
import locales from '../locales.json' with { type: 'json' }
import type { BrowserEngine } from '../types/browser.js'
import { HttpError } from '../types/error.js'
import type { ScrapeHooks } from '../types/hooks.js'
import type { RequestOptions, ScrapeConfig, ScrapeStrategy } from '../types/index.js'
import type { RetryConfig, RetryType } from '../types/options.js'
import type {
  ScrapeResult,
  ScrapeResultBrowser,
  ScrapeResultCustom,
  ScrapeResultFetch,
} from '../types/result.js'
import { createContext, createPage, getBrowser } from './browser.js'
import { sleep } from './common.js'
import { composeFetchOptions } from './fetch.js'

export const calculateRetryDelay = (
  attempt: number,
  baseDelay: number,
  retryType: RetryType,
): number => {
  switch (retryType) {
    case 'exponential':
      return baseDelay * 2 ** attempt
    case 'linear':
      return baseDelay * (attempt + 1)
    case 'constant':
      return baseDelay
    default:
      return baseDelay * 2 ** attempt
  }
}

export const getRandomFrom: {
  <_T>(items: undefined): undefined
  <_T>(items: []): undefined
  <T>(items: Array<T>): T
  <T>(items: Array<T> | undefined): T | undefined
} = (items) => {
  if (!items || items.length === 0) {
    return
  }

  return items[Math.floor(Math.random() * items.length)]
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retryConfig?: RetryConfig,
  hooks?: ScrapeHooks,
): Promise<T> => {
  if (!retryConfig?.count) {
    return fn()
  }

  const delay = retryConfig.delay ?? defaults.retry.delay
  const type = retryConfig.type ?? (defaults.retry.type as RetryType)
  const retriableStatusCodes = retryConfig.statusCodes ?? defaults.retry.statusCodes

  let lastError: unknown

  for (let attempt = 0; attempt <= retryConfig.count; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (error instanceof HttpError) {
        if (!retriableStatusCodes.includes(error.statusCode)) {
          throw error
        }
      }

      if (attempt < retryConfig.count) {
        const retryDelay = calculateRetryDelay(attempt, delay, type)

        hooks?.onRetryAttempt?.({
          error,
          attempt: attempt + 1,
          maxAttempts: retryConfig.count + 1,
          nextRetryDelay: retryDelay,
          retryConfig,
        })

        await sleep(retryDelay)
      }
    }
  }

  hooks?.onRetryExhausted?.({
    error: lastError,
    totalAttempts: retryConfig.count + 1,
    retryConfig,
  })

  throw lastError
}

const executeFetchMechanism = async <TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>,
  options: RequestOptions,
): Promise<ScrapeResultFetch> => {
  const headers = new Headers(options.headers)
  const signal = options.timeout ? AbortSignal.timeout(options.timeout) : undefined

  if (options.userAgent) {
    headers.set('User-Agent', options.userAgent)
  }

  const fetchOptions = composeFetchOptions(headers, signal, options.proxy)
  const response = await fetch(url, fetchOptions)

  if (!response) {
    throw new Error(locales.noResponseReceived)
  }

  if (config.options?.validateResponse) {
    if (!config.options.validateResponse({ mechanism: 'fetch', response })) {
      throw new Error(locales.responseValidationFailed)
    }
  }

  const html = await response.clone().text()
  let cached$: CheerioAPI | null = null

  return {
    mechanism: 'fetch',
    response,
    get $() {
      if (!cached$) {
        cached$ = load(html)
      }
      return cached$
    },
  }
}

const executeBrowserMechanism = async <TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>,
  options: RequestOptions,
): Promise<ScrapeResultBrowser> => {
  const browserConfig = config.browser ?? {}

  const engine = browserConfig.engine ?? (defaults.browser.engine as BrowserEngine)
  const browser = await getBrowser(engine)
  const context = await createContext(browser, options)

  try {
    const page = await createPage(context, browserConfig, options)
    const response = await page.goto(url, {
      waitUntil: browserConfig.waitUntil,
      timeout: options.timeout,
    })

    if (!response) {
      throw new Error(locales.noResponseReceived)
    }

    if (config.options?.validateResponse) {
      if (!config.options.validateResponse({ mechanism: 'browser', response })) {
        throw new Error(locales.responseValidationFailed)
      }
    }

    return {
      mechanism: 'browser',
      page,
      response,
      cleanup: async () => await context.close(),
    }
  } catch (error) {
    await context.close()
    throw error
  }
}

export const executeCustomMechanism = async <TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>,
  options: RequestOptions,
): Promise<ScrapeResultCustom<TCustomResponse>> => {
  if (!config.custom?.fn) {
    throw new Error(locales.customFetchNotProvided)
  }

  const response = await config.custom.fn(url, options)

  if (response === null || response === undefined) {
    throw new Error(locales.customFetchNoResponse)
  }

  if (config.options?.validateResponse) {
    if (!config.options.validateResponse({ mechanism: 'custom', response })) {
      throw new Error(locales.responseValidationFailed)
    }
  }

  return { mechanism: 'custom', response }
}

const executeMechanism = async <TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>,
  strategy: ScrapeStrategy,
  options: RequestOptions,
): Promise<ScrapeResult<TCustomResponse>> => {
  let result: ScrapeResult<TCustomResponse>
  let status: number | undefined

  switch (strategy.mechanism) {
    case 'fetch':
      result = await executeFetchMechanism(url, config, options)
      status = result.response.status
      break
    case 'browser':
      result = await executeBrowserMechanism(url, config, options)
      status = result.response.status()
      break
    case 'custom':
      result = await executeCustomMechanism(url, config, options)
      // TODO: Figure out how to handle status code for custom mechanism.
      break
  }

  if (status !== undefined && (status < 200 || status >= 300)) {
    throw new HttpError(`HTTP error ${status}`, status)
  }

  return result
}

export const executeStrategy = async <TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>,
  strategy: ScrapeStrategy,
): Promise<ScrapeResult<TCustomResponse>> => {
  const options: RequestOptions = {
    proxy: strategy.useProxy ? getRandomFrom(config.options?.proxies) : undefined,
    userAgent: getRandomFrom(config.options?.userAgents),
    viewport: getRandomFrom(config.options?.viewports),
    headers: config.options?.headers,
    timeout: config.options?.timeout,
  }

  return withRetry(
    () => executeMechanism(url, config, strategy, options),
    config.options?.retries,
    config.hooks,
  )
}
