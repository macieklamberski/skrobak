import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { type RequestOptions, scrape } from './index.js'

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
    test.todo('should throw error when url is empty string', () => {
      // Throw error when url is empty string
    })

    test.todo('should throw error when url is invalid format', () => {
      // Throw error when url is invalid format
    })

    test.todo('should handle URLs with special characters', () => {
      // Handle URLs with special characters
    })

    test.todo('should handle URLs with query parameters', () => {
      // Handle URLs with query parameters
    })

    test.todo('should handle URLs with hash fragments', () => {
      // Handle URLs with hash fragments
    })

    test.todo('should accept valid http URLs', () => {
      // Accept valid http URLs
    })

    test.todo('should accept valid https URLs', () => {
      // Accept valid https URLs
    })

    test.todo('should throw error when config is null/undefined', () => {
      // Throw error when config is null/undefined
    })

    test.todo('should throw error when strategies array is null', () => {
      // Throw error when strategies array is null
    })

    test.todo('should throw error when strategies array is undefined', () => {
      // Throw error when strategies array is undefined
    })
  })

  describe('fetch mechanism', () => {
    describe('basic requests', () => {
      test('should successfully fetch JSON response', async () => {
        const result = await scrape('https://example.com/api', {
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(result.mechanism).toBe('fetch')

        if (result.mechanism === 'fetch') {
          const data = await result.response.json()
          expect(data).toEqual({ data: 'test' })
        }
      })

      test('should successfully parse HTML with Cheerio', async () => {
        const result = await scrape('https://example.com/html', {
          strategies: [{ mechanism: 'fetch' }],
        })

        expect(result.mechanism).toBe('fetch')

        if (result.mechanism === 'fetch') {
          const title = result.$('title').text()
          const h1 = result.$('h1').text()

          expect(title).toBe('Test')
          expect(h1).toBe('Hello')
        }
      })
    })

    describe('configuration', () => {
      test('should use custom user agent when provided', async () => {
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

      test('should use custom headers when provided', async () => {
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
      test('should handle fetch failure and retry', async () => {
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
      test.todo('should handle successful responses (2xx)', () => {
        // Handle successful responses (2xx)
      })

      test.todo('should handle client errors (4xx)', () => {
        // Handle client errors (4xx)
      })

      test.todo('should handle server errors (5xx)', () => {
        // Handle server errors (5xx)
      })
    })

    describe('network errors', () => {
      test.todo('should handle network errors (integration test)', () => {
        // Handle network errors (integration test)
      })
    })

    describe('response handling', () => {
      test.todo('should handle different content types (JSON, HTML, XML)', () => {
        // Handle different content types (JSON, HTML, XML)
      })
    })

    // Note: Fetch options composition tested in composeFetchOptions() unit tests (fetch.test.ts)
    // Note: Proxy configuration tested in fetch strategy integration tests (fetch.test.ts)
  })

  describe('browser mechanism', () => {
    describe('page loading', () => {
      test.todo('should successfully load page with browser (integration test)', () => {
        // Successfully load page with browser (integration test)
      })

      test.todo('should execute JavaScript in browser (integration test)', () => {
        // Execute JavaScript in browser (integration test)
      })

      test.todo('should handle dynamic content loading (integration test)', () => {
        // Handle dynamic content loading (integration test)
      })
    })

    describe('wait conditions', () => {
      test.todo('should respect waitUntil configuration (integration test)', () => {
        // Respect waitUntil configuration (integration test)
      })
    })

    describe('resource filtering', () => {
      test.todo('should block specific resource types (integration test)', () => {
        // Block specific resource types (integration test)
      })
    })

    describe('error handling', () => {
      test.todo('should handle browser navigation timeout', () => {
        // Handle browser navigation timeout
      })

      test.todo('should handle page errors gracefully', () => {
        // Handle page errors gracefully
      })
    })

    // Note: Browser engine creation/caching tested in getBrowser() unit tests (browser.test.ts)
    // Note: Browser context options tested in createContext() unit tests (browser.test.ts)
    // Note: Resource filtering logic tested in allowListedResources() unit tests (browser.test.ts)
  })

  describe('custom mechanism', () => {
    test('should execute custom fetch function', async () => {
      const result = await scrape('https://example.com/custom', {
        strategies: [{ mechanism: 'custom' }],
        custom: {
          fn: (url) => {
            return { customData: 'test', url }
          },
        },
      })

      expect(result.mechanism).toBe('custom')

      if (result.mechanism === 'custom') {
        expect(result.response).toEqual({
          customData: 'test',
          url: 'https://example.com/custom',
        })
      }
    })

    test('should pass url and options to custom fetch function', async () => {
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

    test('should return custom response type', async () => {
      const result = await scrape('https://example.com/typed', {
        strategies: [{ mechanism: 'custom' }],
        custom: {
          fn: () => {
            return { items: ['a', 'b', 'c'], count: 3 }
          },
        },
      })

      expect(result.mechanism).toBe('custom')

      if (result.mechanism === 'custom') {
        expect(result.response.items).toEqual(['a', 'b', 'c'])
        expect(result.response.count).toBe(3)
      }
    })

    test('should throw error when custom fetch function not provided', async () => {
      const resultFn = () =>
        scrape('https://example.com/no-fn', {
          strategies: [{ mechanism: 'custom' }],
        })

      await expect(resultFn()).rejects.toThrow('Custom fetch function not provided')
    })

    test('should validate custom response', async () => {
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

    test('should fail validation when custom response is invalid', async () => {
      const resultFn = () =>
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

      await expect(resultFn()).rejects.toThrow('Response validation failed')
    })

    test('should retry custom fetch on failure', async () => {
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

      expect(result.mechanism).toBe('custom')
      expect(callCount).toBe(3)

      if (result.mechanism === 'custom') {
        expect(result.response.success).toBe(true)
        expect(result.response.attempt).toBe(3)
      }
    })
  })

  describe('strategy cascade', () => {
    describe('success cases', () => {
      test('should use first successful strategy', async () => {
        server.use(
          http.get('https://example.com/cascade', () => {
            return HttpResponse.json({ from: 'fetch' })
          }),
        )

        const result = await scrape('https://example.com/cascade', {
          strategies: [{ mechanism: 'fetch' }, { mechanism: 'browser' }],
        })

        expect(result.mechanism).toBe('fetch')

        if (result.mechanism === 'fetch') {
          const data = await result.response.json()
          expect(data.from).toBe('fetch')
        }
      })

      test.todo('should use second strategy when first fails', () => {
        // Use second strategy when first fails
      })

      test.todo('should use third strategy when first two fail', () => {
        // Use third strategy when first two fail
      })

      test.todo('should not execute remaining strategies after success', () => {
        // Not execute remaining strategies after success
      })

      test.todo('should handle mixed strategy types (fetch, browser, custom)', () => {
        // Handle mixed strategy types (fetch, browser, custom)
      })
    })

    describe('error cases', () => {
      test('should throw error when all strategies fail', async () => {
        server.use(
          http.get('https://example.com/always-fails', () => {
            return HttpResponse.error()
          }),
        )

        const resultFn = () => {
          return scrape('https://example.com/always-fails', {
            strategies: [{ mechanism: 'fetch' }],
          })
        }

        await expect(resultFn()).rejects.toThrow()
      })

      test('should throw error when no strategies provided', async () => {
        const resultFn = () => {
          return scrape('https://example.com/api', {
            strategies: [],
          })
        }

        await expect(resultFn()).rejects.toThrow('No strategies provided')
      })

      test.todo('should preserve error from last failed strategy', () => {
        // Preserve error from last failed strategy
      })
    })

    describe('hooks', () => {
      test.todo('should call onStrategyFailed hook when strategy fails', () => {
        // Call onStrategyFailed hook when strategy fails
      })

      test.todo('should pass correct context to onStrategyFailed (error, strategy, strategyIndex, totalStrategies)', () => {
        // Pass correct context to onStrategyFailed (error, strategy, strategyIndex, totalStrategies)
      })

      test.todo('should call onStrategyFailed for each failed strategy', () => {
        // Call onStrategyFailed for each failed strategy
      })

      test.todo('should not call onStrategyFailed when strategy succeeds', () => {
        // Not call onStrategyFailed when strategy succeeds
      })

      test.todo('should call onAllStrategiesFailed hook when all strategies fail', () => {
        // Call onAllStrategiesFailed hook when all strategies fail
      })

      test.todo('should pass correct context to onAllStrategiesFailed (lastError, strategies, totalAttempts)', () => {
        // Pass correct context to onAllStrategiesFailed (lastError, strategies, totalAttempts)
      })

      test.todo('should not call onAllStrategiesFailed when any strategy succeeds', () => {
        // Not call onAllStrategiesFailed when any strategy succeeds
      })

      test.todo('should call both onStrategyFailed and onAllStrategiesFailed for last failed strategy', () => {
        // Call both onStrategyFailed and onAllStrategiesFailed for last failed strategy
      })

      test.todo('should handle hooks throwing errors gracefully', () => {
        // Handle hooks throwing errors gracefully
      })

      test.todo('should not call hooks when not configured', () => {
        // Not call hooks when not configured
      })
    })
  })

  describe('custom validation', () => {
    describe('validation success', () => {
      test('should validate response with custom function', async () => {
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

      test('should validate response with custom function where second strategy is valid', async () => {
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
      test('should fail when custom validation returns false', async () => {
        server.use(
          http.get('https://example.com/blocked', () => {
            return HttpResponse.json({ error: 'blocked' }, { status: 403 })
          }),
        )

        const resultFn = () =>
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

        await expect(resultFn()).rejects.toThrow('Response validation failed')
      })

      test.todo('should continue to next strategy on validation failure (integration test)', () => {
        // Continue to next strategy on validation failure (integration test)
      })

      test.todo('should handle validation function throwing error', () => {
        // Handle validation function throwing error
      })
    })

    describe('mechanism context', () => {
      test('should pass mechanism to validateResponse function', async () => {
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
    test.todo('should use user agent from config (simple integration test)', () => {
      // Use user agent from config (simple integration test)
    })
    // Note: Detailed rotation/selection logic tested in getRandomFrom() unit tests
  })

  describe('viewport configuration', () => {
    test.todo('should apply viewport from config to browser mechanism (simple integration test)', () => {
      // Apply viewport from config to browser mechanism (simple integration test)
    })
    // Note: Detailed rotation/selection logic tested in getRandomFrom() unit tests
  })

  describe('header configuration', () => {
    test.todo('should merge custom headers with default headers', () => {
      // Merge custom headers with default headers
    })

    test.todo('should override default headers with custom headers', () => {
      // Override default headers with custom headers
    })

    test.todo('should handle empty headers object', () => {
      // Handle empty headers object
    })

    test.todo('should handle null/undefined header values', () => {
      // Handle null/undefined header values
    })

    test.todo('should handle case-insensitive header names', () => {
      // Handle case-insensitive header names
    })

    test.todo('should preserve header order', () => {
      // Preserve header order
    })

    test.todo('should handle special characters in header values', () => {
      // Handle special characters in header values
    })
  })

  describe('timeout', () => {
    test('should timeout when request takes too long', async () => {
      server.use(
        http.get('https://example.com/slow', async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return HttpResponse.json({ data: 'test' })
        }),
      )

      const resultFn = () =>
        scrape('https://example.com/slow', {
          options: { timeout: 50 },
          strategies: [{ mechanism: 'fetch' }],
        })

      await expect(resultFn()).rejects.toThrow()
    })

    test.todo('should apply timeout to browser mechanism (integration test)', () => {
      // Apply timeout to browser mechanism (integration test)
    })
    // Note: Timeout edge cases (zero, negative, huge) tested in strategy.test.ts unit tests
  })

  describe('retry mechanism', () => {
    test.todo('should retry on failure and succeed (simple integration test)', () => {
      // Retry on failure and succeed (simple integration test)
    })

    test.todo('should propagate last error after all retries', () => {
      // Propagate last error after all retries
    })

    test.todo('should apply retry to each strategy independently', () => {
      // Apply retry to each strategy independently
    })
    // Note: Backoff strategy details (exponential/linear/constant) tested in:
    //   - calculateRetryDelay() unit tests (strategy.test.ts)
    //   - withRetry() unit tests (strategy.test.ts)
  })

  describe('cheerio lazy loading', () => {
    test('should not load cheerio until $ is accessed', async () => {
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

      if (result.mechanism === 'fetch') {
        expect(typeof result.$).toBe('function')

        const text = result.$('p').text()
        expect(text).toBe('Test')
      }
    })

    test.todo('should parse complex HTML structures (integration test)', () => {
      // Parse complex HTML structures (integration test)
    })

    test.todo('should support CSS selectors (integration test)', () => {
      // Support CSS selectors (integration test)
    })

    // Note: Cheerio lazy loading implementation tested in executeFetchRequest() unit tests (strategy.test.ts)
  })

  describe('error handling', () => {
    describe('error messages', () => {
      test.todo('should throw descriptive error messages', () => {
        // Throw descriptive error messages
      })

      test.todo('should preserve error stack traces', () => {
        // Preserve error stack traces
      })
    })

    describe('error types', () => {
      test.todo('should handle synchronous errors', () => {
        // Handle synchronous errors
      })

      test.todo('should handle asynchronous errors', () => {
        // Handle asynchronous errors
      })

      test.todo('should handle unexpected error types', () => {
        // Handle unexpected error types
      })
    })

    describe('function errors', () => {
      test.todo('should handle errors in validation function', () => {
        // Handle errors in validation function
      })

      test.todo('should handle errors in custom fetch function', () => {
        // Handle errors in custom fetch function
      })

      test.todo('should handle errors in browser navigation', () => {
        // Handle errors in browser navigation
      })
    })
  })

  describe('memory and performance', () => {
    describe('resource cleanup', () => {
      test.todo('should cleanup browser context after success', () => {
        // Cleanup browser context after success
      })

      test.todo('should cleanup browser context after failure', () => {
        // Cleanup browser context after failure
      })
    })

    describe('concurrency', () => {
      test.todo('should handle concurrent scrape() calls', () => {
        // Handle concurrent scrape() calls
      })

      test.todo('should handle sequential scrape() calls', () => {
        // Handle sequential scrape() calls
      })
    })

    // Note: Browser instance caching tested in getBrowser() unit tests (browser.test.ts)
    // Note: Cheerio caching tested in executeFetchRequest() unit tests (strategy.test.ts)
  })
})
