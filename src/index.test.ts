import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { HttpError, type RequestOptions, scrape } from './index.js'
import { closeAllBrowsers, getBrowser } from './utils/browser.js'

describe('scrape', () => {
  const server = setupServer(
    http.get('https://example.com/api', () => {
      return HttpResponse.json({ data: 'test' })
    }),

    http.get('https://example.com/html', () => {
      return new HttpResponse(
        '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    }),
  )

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('input validation', () => {
    it.todo('should throw error when url is empty string', () => {
      // Throw error when url is empty string
    })

    it.todo('should throw error when url is invalid format', () => {
      // Throw error when url is invalid format
    })

    it.todo('should handle URLs with special characters', () => {
      // Handle URLs with special characters
    })

    it.todo('should handle URLs with query parameters', () => {
      // Handle URLs with query parameters
    })

    it.todo('should handle URLs with hash fragments', () => {
      // Handle URLs with hash fragments
    })

    it.todo('should accept valid http URLs', () => {
      // Accept valid http URLs
    })

    it.todo('should accept valid https URLs', () => {
      // Accept valid https URLs
    })

    it.todo('should throw error when config is null/undefined', () => {
      // Throw error when config is null/undefined
    })

    it.todo('should throw error when strategies array is null', () => {
      // Throw error when strategies array is null
    })

    it.todo('should throw error when strategies array is undefined', () => {
      // Throw error when strategies array is undefined
    })
  })

  describe('fetch mechanism', () => {
    describe('basic requests', () => {
      it('should successfully fetch JSON response', async () => {
        const result = await scrape('https://example.com/api', {
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(result.mechanism).toBe('fetch')

        if (result.mechanism !== 'fetch') {
          throw new Error('Expected a fetch result')
        }

        const data = await result.response.json()
        expect(data).toEqual({ data: 'test' })
      })

      it('should successfully parse HTML with Cheerio', async () => {
        const result = await scrape('https://example.com/html', {
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(result.mechanism).toBe('fetch')

        if (result.mechanism !== 'fetch') {
          throw new Error('Expected a fetch result')
        }

        const title = result.$('title').text()
        const h1 = result.$('h1').text()

        expect(title).toBe('Test')
        expect(h1).toBe('Hello')
      })
    })

    describe('configuration', () => {
      it('should use custom user agent when provided', async () => {
        let capturedUserAgent: string | undefined

        server.use(
          http.get('https://example.com/check-ua', ({ request }) => {
            capturedUserAgent = request.headers.get('user-agent') ?? undefined
            return HttpResponse.json({ success: true })
          }),
        )

        await scrape('https://example.com/check-ua', {
          options: { userAgents: ['CustomBot/1.0'] },
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(capturedUserAgent).toBe('CustomBot/1.0')
      })

      it('should use custom headers when provided', async () => {
        let capturedHeaders: Record<string, string> = {}

        server.use(
          http.get('https://example.com/check-headers', ({ request }) => {
            capturedHeaders = {
              authorization: request.headers.get('authorization') || '',
              'x-custom': request.headers.get('x-custom') || '',
            }
            return HttpResponse.json({ success: true })
          }),
        )

        await scrape('https://example.com/check-headers', {
          options: {
            headers: {
              Authorization: 'Bearer token123',
              'X-Custom': 'custom-value',
            },
          },
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(capturedHeaders.authorization).toBe('Bearer token123')
        expect(capturedHeaders['x-custom']).toBe('custom-value')
      })
    })

    describe('retry', () => {
      it('should handle fetch failure and retry', async () => {
        let callCount = 0

        server.use(
          http.get('https://example.com/flaky', () => {
            callCount++
            if (callCount < 3) {
              return HttpResponse.error()
            }
            return HttpResponse.json({ success: true })
          }),
        )

        const result = await scrape('https://example.com/flaky', {
          options: { retries: { count: 3, delay: 0 } },
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(result.mechanism).toBe('fetch')
        expect(callCount).toBe(3)
      })
    })

    describe('HTTP status codes', () => {
      it.todo('should handle successful responses (2xx)', () => {
        // Handle successful responses (2xx)
      })

      it.todo('should handle client errors (4xx)', () => {
        // Handle client errors (4xx)
      })

      it.todo('should handle server errors (5xx)', () => {
        // Handle server errors (5xx)
      })
    })

    describe('network errors', () => {
      it.todo('should handle network errors (integration test)', () => {
        // Handle network errors (integration test)
      })
    })

    describe('response handling', () => {
      it.todo('should handle different content types (JSON, HTML, XML)', () => {
        // Handle different content types (JSON, HTML, XML)
      })
    })

    // Note: Fetch options composition tested in composeFetchOptions() unit tests (fetch.test.ts)
    // Note: Proxy configuration tested in fetch strategy integration tests (fetch.test.ts)
  })

  describe('browser mechanism', () => {
    describe('page loading', () => {
      it.todo('should successfully load page with browser (integration test)', () => {
        // Successfully load page with browser (integration test)
      })

      it.todo('should execute JavaScript in browser (integration test)', () => {
        // Execute JavaScript in browser (integration test)
      })

      it.todo('should handle dynamic content loading (integration test)', () => {
        // Handle dynamic content loading (integration test)
      })
    })

    describe('wait conditions', () => {
      it.todo('should respect waitUntil configuration (integration test)', () => {
        // Respect waitUntil configuration (integration test)
      })
    })

    describe('resource filtering', () => {
      it.todo('should block specific resource types (integration test)', () => {
        // Block specific resource types (integration test)
      })
    })

    describe('error handling', () => {
      it.todo('should handle browser navigation timeout', () => {
        // Handle browser navigation timeout
      })

      it.todo('should handle page errors gracefully', () => {
        // Handle page errors gracefully
      })
    })

    // Note: Browser engine creation/caching tested in getBrowser() unit tests (browser.test.ts)
    // Note: Browser context options tested in createContext() unit tests (browser.test.ts)
    // Note: Resource filtering logic tested in allowListedResources() unit tests (browser.test.ts)
  })

  describe('custom mechanism', () => {
    it('should execute custom fetch function', async () => {
      const result = await scrape('https://example.com/custom', {
        strategies: [{ mechanism: 'custom' }],
        custom: {
          fn: (url) => {
            return { customData: 'test', url }
          },
        },
      })

      const expected: typeof result = {
        mechanism: 'custom',
        response: {
          customData: 'test',
          url: 'https://example.com/custom',
        },
      }

      expect(result).toEqual(expected)
    })

    it('should pass url and options to custom fetch function', async () => {
      let capturedUrl: string | undefined
      let capturedOptions: RequestOptions | undefined

      await scrape('https://example.com/options', {
        options: {
          headers: { 'X-Custom': 'header' },
          timeout: 5000,
        },
        strategies: [{ mechanism: 'custom' }],
        custom: {
          fn: (url, options) => {
            capturedUrl = url
            capturedOptions = options
            return { success: true }
          },
        },
      })

      expect(capturedUrl).toBe('https://example.com/options')
      expect(capturedOptions?.headers).toEqual({ 'X-Custom': 'header' })
      expect(capturedOptions?.timeout).toBe(5000)
    })

    it('should return custom response type', async () => {
      const result = await scrape('https://example.com/typed', {
        strategies: [{ mechanism: 'custom' }],
        custom: {
          fn: () => {
            return { items: ['a', 'b', 'c'], count: 3 }
          },
        },
      })

      const expected: typeof result = {
        mechanism: 'custom',
        response: {
          items: ['a', 'b', 'c'],
          count: 3,
        },
      }

      expect(result).toEqual(expected)
    })

    it('should throw error when custom fetch function not provided', () => {
      const throwing = () =>
        scrape('https://example.com/no-fn', {
          strategies: [{ mechanism: 'custom' }],
        })

      expect(throwing()).rejects.toThrow('Custom fetch function not provided')
    })

    it('should validate custom response', async () => {
      const result = await scrape('https://example.com/validated', {
        strategies: [{ mechanism: 'custom' }],
        options: {
          validateResponse: (context) => {
            if (context.mechanism === 'custom') {
              return context.response.status === 'ok'
            }

            return true
          },
        },
        custom: {
          fn: () => {
            return { status: 'ok', data: 'test' }
          },
        },
      })

      expect(result.mechanism).toBe('custom')
    })

    it('should fail validation when custom response is invalid', () => {
      const throwing = () =>
        scrape('https://example.com/invalid', {
          strategies: [{ mechanism: 'custom' }],
          options: {
            validateResponse: (context) => {
              if (context.mechanism === 'custom') {
                return context.response.status === 'ok'
              }

              return true
            },
          },
          custom: {
            fn: () => {
              return { status: 'error', data: 'test' }
            },
          },
        })

      expect(throwing()).rejects.toThrow('Response validation failed')
    })

    it('should retry custom fetch on failure', async () => {
      let callCount = 0

      const result = await scrape('https://example.com/retry', {
        options: { retries: { count: 3, delay: 0 } },
        strategies: [{ mechanism: 'custom' }],
        custom: {
          fn: () => {
            callCount++

            if (callCount < 3) {
              throw new Error('Custom fetch failed')
            }

            return { success: true, attempt: callCount }
          },
        },
      })

      const expected: typeof result = {
        mechanism: 'custom',
        response: {
          success: true,
          attempt: 3,
        },
      }

      expect(result).toEqual(expected)
      expect(callCount).toBe(3)
    })
  })

  describe('strategy cascade', () => {
    describe('success cases', () => {
      it('should use first successful strategy', async () => {
        server.use(
          http.get('https://example.com/cascade', () => {
            return HttpResponse.json({ from: 'fetch' })
          }),
        )

        const result = await scrape('https://example.com/cascade', {
          strategies: [{ mechanism: 'fetch' }, { mechanism: 'browser' }],
        })

        expect(result.mechanism).toBe('fetch')

        if (result.mechanism !== 'fetch') {
          throw new Error('Expected a fetch result')
        }

        const data = await result.response.json()
        expect(data.from).toBe('fetch')
      })

      it.todo('should use second strategy when first fails', () => {
        // Use second strategy when first fails
      })

      it.todo('should use third strategy when first two fail', () => {
        // Use third strategy when first two fail
      })

      it.todo('should not execute remaining strategies after success', () => {
        // Not execute remaining strategies after success
      })

      it.todo('should handle mixed strategy types (fetch, browser, custom)', () => {
        // Handle mixed strategy types (fetch, browser, custom)
      })
    })

    describe('error cases', () => {
      it('should throw error when all strategies fail', () => {
        server.use(
          http.get('https://example.com/always-fails', () => {
            return HttpResponse.error()
          }),
        )

        const throwing = () => {
          return scrape('https://example.com/always-fails', {
            strategies: [{ mechanism: 'fetch' }],
          })
        }

        expect(throwing()).rejects.toThrow()
      })

      it('should throw error when no strategies provided', () => {
        const throwing = () => {
          return scrape('https://example.com/api', {
            strategies: [],
          })
        }

        expect(throwing()).rejects.toThrow('No strategies provided')
      })

      it.todo('should preserve error from last failed strategy', () => {
        // Preserve error from last failed strategy
      })
    })

    describe('hooks', () => {
      it.todo('should call onStrategyFailed hook when strategy fails', () => {
        // Call onStrategyFailed hook when strategy fails
      })

      it.todo('should pass correct context to onStrategyFailed (error, strategy, strategyIndex, totalStrategies)', () => {
        // Pass correct context to onStrategyFailed (error, strategy, strategyIndex, totalStrategies)
      })

      it.todo('should call onStrategyFailed for each failed strategy', () => {
        // Call onStrategyFailed for each failed strategy
      })

      it.todo('should not call onStrategyFailed when strategy succeeds', () => {
        // Not call onStrategyFailed when strategy succeeds
      })

      it.todo('should call onAllStrategiesFailed hook when all strategies fail', () => {
        // Call onAllStrategiesFailed hook when all strategies fail
      })

      it.todo('should pass correct context to onAllStrategiesFailed (lastError, strategies, totalAttempts)', () => {
        // Pass correct context to onAllStrategiesFailed (lastError, strategies, totalAttempts)
      })

      it.todo('should not call onAllStrategiesFailed when any strategy succeeds', () => {
        // Not call onAllStrategiesFailed when any strategy succeeds
      })

      it.todo('should call both onStrategyFailed and onAllStrategiesFailed for last failed strategy', () => {
        // Call both onStrategyFailed and onAllStrategiesFailed for last failed strategy
      })

      it.todo('should handle hooks throwing errors gracefully', () => {
        // Handle hooks throwing errors gracefully
      })

      it.todo('should not call hooks when not configured', () => {
        // Not call hooks when not configured
      })
    })
  })

  describe('custom validation', () => {
    describe('validation success', () => {
      it('should validate response with custom function', async () => {
        server.use(
          http.get('https://example.com/validated', () => {
            return HttpResponse.json({ data: 'test' }, { status: 200 })
          }),
        )

        const result = await scrape('https://example.com/validated', {
          options: {
            validateResponse: (context) => {
              if (context.mechanism === 'fetch') {
                return context.response.status === 200
              }

              return false
            },
          },
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(result.mechanism).toBe('fetch')
      })

      it('should validate response with custom function where second strategy is valid', async () => {
        server.use(
          http.get('https://example.com/validated', () => {
            return HttpResponse.json({ data: 'test' }, { status: 200 })
          }),
        )

        const result = await scrape('https://example.com/validated', {
          options: {
            validateResponse: (context) => {
              if (context.mechanism === 'custom') {
                return context.response.success === true
              }

              return false
            },
          },
          strategies: [{ mechanism: 'fetch' }, { mechanism: 'custom' }],
          custom: {
            fn: () => {
              return { success: true, data: 'custom data' }
            },
          },
        })

        expect(result.mechanism).toBe('custom')
      })
    })

    describe('validation failure', () => {
      it('should fail when custom validation returns false', () => {
        server.use(
          http.get('https://example.com/blocked', () => {
            return HttpResponse.json({ error: 'blocked' }, { status: 403 })
          }),
        )

        const throwing = () =>
          scrape('https://example.com/blocked', {
            options: {
              validateResponse: (context) => {
                if (context.mechanism === 'fetch') {
                  return context.response.status === 200
                }

                return true
              },
            },
            strategies: [{ mechanism: 'fetch' }],
          })

        expect(throwing()).rejects.toThrow('Response validation failed')
      })

      it.todo('should continue to next strategy on validation failure (integration test)', () => {
        // Continue to next strategy on validation failure (integration test)
      })

      it.todo('should handle validation function throwing error', () => {
        // Handle validation function throwing error
      })
    })

    describe('mechanism context', () => {
      it('should pass mechanism to validateResponse function', async () => {
        let capturedMechanism: string | undefined

        server.use(
          http.get('https://example.com/with-mechanism', () => {
            return HttpResponse.json({ success: true })
          }),
        )

        await scrape('https://example.com/with-mechanism', {
          options: {
            validateResponse: (context) => {
              capturedMechanism = context.mechanism

              if (context.mechanism === 'fetch') {
                return context.response.status === 200
              }

              return true
            },
          },
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(capturedMechanism).toBe('fetch')
      })
    })

    // Note: Validation for each mechanism tested in execute*Request() unit tests (strategy.test.ts)
  })

  describe('user agent configuration', () => {
    it.todo('should use user agent from config (simple integration test)', () => {
      // Use user agent from config (simple integration test)
    })
    // Note: Detailed rotation/selection logic tested in getRandomFrom() unit tests
  })

  describe('viewport configuration', () => {
    it.todo('should apply viewport from config to browser mechanism (simple integration test)', () => {
      // Apply viewport from config to browser mechanism (simple integration test)
    })
    // Note: Detailed rotation/selection logic tested in getRandomFrom() unit tests
  })

  describe('header configuration', () => {
    it.todo('should merge custom headers with default headers', () => {
      // Merge custom headers with default headers
    })

    it.todo('should override default headers with custom headers', () => {
      // Override default headers with custom headers
    })

    it.todo('should handle empty headers object', () => {
      // Handle empty headers object
    })

    it.todo('should handle null/undefined header values', () => {
      // Handle null/undefined header values
    })

    it.todo('should handle case-insensitive header names', () => {
      // Handle case-insensitive header names
    })

    it.todo('should preserve header order', () => {
      // Preserve header order
    })

    it.todo('should handle special characters in header values', () => {
      // Handle special characters in header values
    })
  })

  describe('timeout', () => {
    it('should timeout when request takes too long', () => {
      server.use(
        http.get('https://example.com/slow', async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return HttpResponse.json({ data: 'test' })
        }),
      )

      const throwing = () =>
        scrape('https://example.com/slow', {
          options: { timeout: 50 },
          strategies: [{ mechanism: 'fetch' }],
        })

      expect(throwing()).rejects.toThrow()
    })

    it.todo('should apply timeout to browser mechanism (integration test)', () => {
      // Apply timeout to browser mechanism (integration test)
    })
    // Note: Timeout edge cases (zero, negative, huge) tested in strategy.test.ts unit tests
  })

  describe('retry mechanism', () => {
    it.todo('should retry on failure and succeed (simple integration test)', () => {
      // Retry on failure and succeed (simple integration test)
    })

    it.todo('should propagate last error after all retries', () => {
      // Propagate last error after all retries
    })

    it.todo('should apply retry to each strategy independently', () => {
      // Apply retry to each strategy independently
    })
    // Note: Backoff strategy details (exponential/linear/constant) tested in:
    //   - calculateRetryDelay() unit tests (strategy.test.ts)
    //   - withRetry() unit tests (strategy.test.ts)
  })

  describe('cheerio lazy loading', () => {
    it('should not load cheerio until $ is accessed', async () => {
      server.use(
        http.get('https://example.com/lazy-html', () => {
          return new HttpResponse('<html><body><p>Test</p></body></html>', {
            headers: { 'Content-Type': 'text/html' },
          })
        }),
      )

      const result = await scrape('https://example.com/lazy-html', {
        strategies: [{ mechanism: 'fetch' }],
      })

      expect(result.mechanism).toBe('fetch')

      if (result.mechanism !== 'fetch') {
        throw new Error('Expected a fetch result')
      }

      expect(typeof result.$).toBe('function')

      const text = result.$('p').text()
      expect(text).toBe('Test')
    })

    it.todo('should parse complex HTML structures (integration test)', () => {
      // Parse complex HTML structures (integration test)
    })

    it.todo('should support CSS selectors (integration test)', () => {
      // Support CSS selectors (integration test)
    })

    // Note: Cheerio lazy loading implementation tested in executeFetchRequest() unit tests (strategy.test.ts)
  })

  describe('error handling', () => {
    describe('error messages', () => {
      it.todo('should throw descriptive error messages', () => {
        // Throw descriptive error messages
      })

      it.todo('should preserve error stack traces', () => {
        // Preserve error stack traces
      })
    })

    describe('error types', () => {
      it.todo('should handle synchronous errors', () => {
        // Handle synchronous errors
      })

      it.todo('should handle asynchronous errors', () => {
        // Handle asynchronous errors
      })

      it.todo('should handle unexpected error types', () => {
        // Handle unexpected error types
      })
    })

    describe('function errors', () => {
      it.todo('should handle errors in validation function', () => {
        // Handle errors in validation function
      })

      it.todo('should handle errors in custom fetch function', () => {
        // Handle errors in custom fetch function
      })

      it.todo('should handle errors in browser navigation', () => {
        // Handle errors in browser navigation
      })
    })
  })

  describe('memory and performance', () => {
    describe('resource cleanup', () => {
      it.todo('should cleanup browser context after success', () => {
        // Cleanup browser context after success
      })

      it('should cleanup browser context after failure', async () => {
        const server = Bun.serve({
          port: 0,
          fetch: () => new Response('not found', { status: 404 }),
        })

        try {
          const browser = await getBrowser('chromium')
          const throwing = () =>
            scrape(server.url.href, { strategies: [{ mechanism: 'browser', useProxy: false }] })

          expect(throwing()).rejects.toThrow(HttpError)
          expect(browser.contexts()).toHaveLength(0)
        } finally {
          await closeAllBrowsers()
          await server.stop(true)
        }
      })
    })

    describe('concurrency', () => {
      it.todo('should handle concurrent scrape() calls', () => {
        // Handle concurrent scrape() calls
      })

      it.todo('should handle sequential scrape() calls', () => {
        // Handle sequential scrape() calls
      })
    })

    // Note: Browser instance caching tested in getBrowser() unit tests (browser.test.ts)
    // Note: Cheerio caching tested in executeFetchRequest() unit tests (strategy.test.ts)
  })
})
