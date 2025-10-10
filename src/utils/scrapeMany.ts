import { scrape } from '../index.js'
import type { ScrapeConfig } from '../types/index.js'
import type { ScrapeManyConfig, ScrapeManyResult, ScrapeManyStats } from '../types/scrapeMany.js'
import { randomSleep } from './sleep.js'

export const scrapeMany = async <TCustomResponse = unknown>(
  urls: Array<string>,
  scrapeConfig: ScrapeConfig<TCustomResponse>,
  scrapeManyConfig?: ScrapeManyConfig<TCustomResponse>,
): Promise<ScrapeManyResult> => {
  const queue = new Set<string>(urls)
  const processed = new Set<string>()
  const initialCount = urls.length

  let discoveredCount = 0
  let succeededCount = 0
  let failedCount = 0
  let currentIndex = 0

  const createAddUrls = () => {
    return (newUrls: string | Array<string>): void => {
      const urlArray = Array.isArray(newUrls) ? newUrls : [newUrls]

      for (const url of urlArray) {
        if (processed.has(url) || queue.has(url)) {
          continue
        }

        queue.add(url)
        discoveredCount++
      }
    }
  }

  const createStats = (): ScrapeManyStats => ({
    initial: initialCount,
    discovered: discoveredCount,
    processed: succeededCount + failedCount,
    remaining: queue.size,
    succeeded: succeededCount,
    failed: failedCount,
  })

  while (queue.size > 0) {
    const url = queue.values().next().value

    if (!url) {
      continue
    }

    if (processed.has(url)) {
      queue.delete(url)
      continue
    }

    const addUrls = createAddUrls()
    const stats = createStats()

    try {
      const result = await scrape(url, scrapeConfig)

      try {
        await scrapeManyConfig?.onSuccess?.({
          result,
          url,
          index: currentIndex,
          addUrls,
          stats,
        })
      } finally {
        if (result.mechanism === 'browser') {
          await result.cleanup()
        }
      }

      succeededCount++
    } catch (error) {
      await scrapeManyConfig?.onError?.({
        error,
        url,
        index: currentIndex,
        addUrls,
        stats,
      })

      failedCount++
    }

    processed.add(url)
    queue.delete(url)
    currentIndex++

    if (scrapeManyConfig?.delays && queue.size > 0) {
      await randomSleep(scrapeManyConfig.delays.min, scrapeManyConfig.delays.max)
    }
  }

  return {
    total: succeededCount + failedCount,
    succeeded: succeededCount,
    failed: failedCount,
  }
}
