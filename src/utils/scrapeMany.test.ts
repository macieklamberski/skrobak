import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { scrapeMany } from './scrapeMany.js'

describe('scrapeMany', () => {
  const server = setupServer(
    http.get('https://example.com/page1', () => {
      return new HttpResponse(
        '<html><head><title>Page 1</title></head><body><h1>Page 1</h1></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    }),

    http.get('https://example.com/page2', () => {
      return new HttpResponse(
        '<html><head><title>Page 2</title></head><body><h1>Page 2</h1></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    }),

    http.get('https://example.com/page3', () => {
      return new HttpResponse(
        '<html><head><title>Page 3</title></head><body><h1>Page 3</h1></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    }),

    http.get('https://example.com/error', () => {
      return HttpResponse.error()
    }),

    http.get('https://example.com/error2', () => {
      return HttpResponse.error()
    }),
  )

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('basic scraping', () => {
    test('should scrape multiple URLs sequentially', async () => {
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ]

      const result = await scrapeMany(urls, {
        strategies: [{ mechanism: 'fetch' }],
      })

      expect(result.total).toBe(3)
      expect(result.succeeded).toBe(3)
      expect(result.failed).toBe(0)
    })

    test('should return correct stats for empty URL array', async () => {
      const result = await scrapeMany([], {
        strategies: [{ mechanism: 'fetch' }],
      })

      expect(result.total).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
    })

    test('should scrape single URL', async () => {
      const result = await scrapeMany(['https://example.com/page1'], {
        strategies: [{ mechanism: 'fetch' }],
      })

      expect(result.total).toBe(1)
      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(0)
    })
  })

  describe('callbacks', () => {
    test('should call onSuccess for each successful scrape', async () => {
      const successCalls: Array<{ url: string; index: number }> = []

      await scrapeMany(
        ['https://example.com/page1', 'https://example.com/page2'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onSuccess: async ({ url, index }) => {
            successCalls.push({ url, index })
          },
        },
      )

      expect(successCalls).toHaveLength(2)
      expect(successCalls[0].url).toBe('https://example.com/page1')
      expect(successCalls[0].index).toBe(0)
      expect(successCalls[1].url).toBe('https://example.com/page2')
      expect(successCalls[1].index).toBe(1)
    })

    test('should call onError for failed scrapes', async () => {
      const errorCalls: Array<{ url: string; index: number }> = []

      await scrapeMany(
        ['https://example.com/page1', 'https://example.com/error'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onError: async ({ url, index }) => {
            errorCalls.push({ url, index })
          },
        },
      )

      expect(errorCalls).toHaveLength(1)
      expect(errorCalls[0].url).toBe('https://example.com/error')
      expect(errorCalls[0].index).toBe(1)
    })

    test('should provide result in onSuccess context', async () => {
      let capturedTitle: string | undefined

      await scrapeMany(
        ['https://example.com/page1'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onSuccess: async ({ result }) => {
            if (result.mechanism === 'fetch') {
              capturedTitle = result.$('title').text()
            }
          },
        },
      )

      expect(capturedTitle).toBe('Page 1')
    })

    test('should provide stats in callback context', async () => {
      const statsSnapshots: Array<{
        initial: number
        processed: number
        remaining: number
      }> = []

      await scrapeMany(
        ['https://example.com/page1', 'https://example.com/page2'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onSuccess: async ({ stats }) => {
            statsSnapshots.push({
              initial: stats.initial,
              processed: stats.processed,
              remaining: stats.remaining,
            })
          },
        },
      )

      expect(statsSnapshots[0].initial).toBe(2)
      expect(statsSnapshots[0].processed).toBe(0)
      expect(statsSnapshots[0].remaining).toBe(2)

      expect(statsSnapshots[1].processed).toBe(1)
      expect(statsSnapshots[1].remaining).toBe(1)
    })
  })

  describe('error handling', () => {
    test('should continue scraping after errors', async () => {
      const result = await scrapeMany(
        ['https://example.com/page1', 'https://example.com/error', 'https://example.com/page2'],
        { strategies: [{ mechanism: 'fetch' }] },
      )

      expect(result.total).toBe(3)
      expect(result.succeeded).toBe(2)
      expect(result.failed).toBe(1)
    })

    test('should track multiple failures', async () => {
      const result = await scrapeMany(
        ['https://example.com/error', 'https://example.com/error2', 'https://example.com/page1'],
        { strategies: [{ mechanism: 'fetch' }] },
      )

      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(2)
    })
  })

  describe('delays', () => {
    test('should apply delays between requests', async () => {
      const timestamps: Array<number> = []

      await scrapeMany(
        ['https://example.com/page1', 'https://example.com/page2'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          delays: { min: 100, max: 150 },
          onSuccess: async () => {
            timestamps.push(Date.now())
          },
        },
      )

      const delay = timestamps[1] - timestamps[0]
      expect(delay).toBeGreaterThanOrEqual(100)
      expect(delay).toBeLessThan(250) // Allow some overhead
    })

    test('should not apply delay after last URL', async () => {
      const startTime = Date.now()

      await scrapeMany(
        ['https://example.com/page1'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          delays: { min: 100, max: 200 },
        },
      )

      const totalTime = Date.now() - startTime
      // Should be much less than min delay since no delay after last URL
      expect(totalTime).toBeLessThan(100)
    })
  })

  describe('dynamic URL discovery', () => {
    test('should add URLs dynamically via addUrls', async () => {
      server.use(
        http.get('https://example.com/discover', () => {
          return new HttpResponse(
            '<html><body><a href="https://example.com/page1">Link</a></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          )
        }),
      )

      const processedUrls: Array<string> = []

      const result = await scrapeMany(
        ['https://example.com/discover'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onSuccess: async ({ result, url, addUrls }) => {
            processedUrls.push(url)

            if (result.mechanism === 'fetch' && url === 'https://example.com/discover') {
              const links = result
                .$('a')
                .map((_, el) => result.$(el).attr('href'))
                .get()
                .filter((href): href is string => typeof href === 'string')

              addUrls(links)
            }
          },
        },
      )

      expect(result.total).toBe(2)
      expect(result.succeeded).toBe(2)
      expect(processedUrls).toContain('https://example.com/discover')
      expect(processedUrls).toContain('https://example.com/page1')
    })

    test('should deduplicate URLs automatically', async () => {
      const processedUrls: Array<string> = []

      await scrapeMany(
        ['https://example.com/page1'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onSuccess: async ({ url, addUrls }) => {
            processedUrls.push(url)
            // Try to add the same URL again
            addUrls('https://example.com/page1')
          },
        },
      )

      expect(processedUrls).toHaveLength(1)
    })

    test('should accept single URL string in addUrls', async () => {
      const processedUrls: Array<string> = []

      await scrapeMany(
        ['https://example.com/page1'],
        { strategies: [{ mechanism: 'fetch' }] },
        {
          onSuccess: async ({ url, addUrls }) => {
            processedUrls.push(url)
            if (url === 'https://example.com/page1') {
              addUrls('https://example.com/page2')
            }
          },
        },
      )

      expect(processedUrls).toHaveLength(2)
      expect(processedUrls).toContain('https://example.com/page2')
    })
  })
})
