import locales from './locales.json' with { type: 'json' }
import type { ScrapeConfig } from './types/index.js'
import type { ScrapeResult } from './types/result.js'
import { executeStrategy } from './utils/strategy.js'

export * from './types/browser.js'
export * from './types/error.js'
export * from './types/hooks.js'
export * from './types/index.js'
export * from './types/options.js'
export * from './types/result.js'
export * from './types/validate.js'
export { closeAllBrowsers } from './utils/browser.js'

export const scrape = async <TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>,
): Promise<ScrapeResult<TCustomResponse>> => {
  const strategies = config.strategies

  if (!strategies?.length) {
    throw new Error(locales.noStrategiesProvided)
  }

  for (const [index, strategy] of strategies.entries()) {
    try {
      const result = await executeStrategy(url, config, strategy)

      // TODO: Remember the working strategy for the future memory functionality.

      return result
    } catch (error) {
      config.hooks?.onStrategyFailed?.({
        error,
        strategy,
        strategyIndex: index,
        totalStrategies: strategies.length,
      })

      if (index === strategies.length - 1) {
        config.hooks?.onAllStrategiesFailed?.({
          lastError: error,
          strategies,
          totalAttempts: strategies.length,
        })

        throw error
      }
    }
  }

  throw new Error(locales.allStrategiesFailed)
}
