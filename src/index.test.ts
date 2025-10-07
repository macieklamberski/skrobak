import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { scrape } from './index.js'

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
    // TODO: should throw error when url is empty string
    // TODO: should throw error when url is invalid format
    // TODO: should handle URLs with special characters
    // TODO: should handle URLs with query parameters
    // TODO: should handle URLs with hash fragments
    // TODO: should accept valid http URLs
    // TODO: should accept valid https URLs
    // TODO: should throw error when config is null/undefined
    // TODO: should throw error when strategies array is null
    // TODO: should throw error when strategies array is undefined
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
      // TODO: should handle successful responses (2xx)
      // TODO: should handle client errors (4xx)
      // TODO: should handle server errors (5xx)
    })

    describe('network errors', () => {
      // TODO: should handle network errors (integration test)
    })

    describe('response handling', () => {
      // TODO: should handle different content types (JSON, HTML, XML)
    })

    // Note: Fetch options composition tested in composeFetchOptions() unit tests (fetch.test.ts)
    // Note: Proxy configuration tested in fetch strategy integration tests (fetch.test.ts)
  })

  describe('browser mechanism', () => {
    describe('page loading', () => {
      // TODO: should successfully load page with browser (integration test)
      // TODO: should execute JavaScript in browser (integration test)
      // TODO: should handle dynamic content loading (integration test)
    })

    describe('wait conditions', () => {
      // TODO: should respect waitUntil configuration (integration test)
    })

    describe('resource filtering', () => {
      // TODO: should block specific resource types (integration test)
    })

    describe('error handling', () => {
      // TODO: should handle browser navigation timeout
      // TODO: should handle page errors gracefully
    })

    // Note: Browser engine creation/caching tested in getBrowser() unit tests (browser.test.ts)
    // Note: Browser context options tested in createContext() unit tests (browser.test.ts)
    // Note: Resource filtering logic tested in allowListedResources() unit tests (browser.test.ts)
  })

  describe('custom mechanism', () => {
    // TODO: should execute custom fetch function (integration test)
    // TODO: should pass url and options to custom fetch function
    // TODO: should return custom response type (integration test)
    // TODO: should throw error when custom fetch function not provided
    // TODO: should validate custom response (integration test)
    // TODO: should retry custom fetch on failure (integration test)
    // Note: Custom mechanism implementation tested in executeCustomRequest() unit tests (strategy.test.ts)
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

      // TODO: should use second strategy when first fails
      // TODO: should use third strategy when first two fail
      // TODO: should not execute remaining strategies after success
      // TODO: should handle mixed strategy types (fetch, browser, custom)
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

        expect(resultFn()).rejects.toThrow()
      })

      test('should throw error when no strategies provided', async () => {
        const resultFn = () => {
          return scrape('https://example.com/api', {
            strategies: [],
          })
        }

        expect(resultFn()).rejects.toThrow('No strategies provided')
      })

      // TODO: should preserve error from last failed strategy
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

      // TODO: Browser strategy validation requires integration tests with a real server
      // MSW only intercepts Node.js fetch requests, not Playwright browser requests.
      test.skip('should validate response with custom function where second strategy is valid', async () => {
        server.use(
          http.get('https://example.com/validated', () => {
            return HttpResponse.json({ data: 'test' }, { status: 200 })
          }),
        )

        const result = await scrape('https://example.com/validated', {
          options: {
            validateResponse: (context) => {
              if (context.mechanism === 'browser') {
                return context.response.status() === 200
              }

              return false
            },
          },
          strategies: [{ mechanism: 'fetch' }, { mechanism: 'browser' }],
        })

        expect(result.mechanism).toBe('browser')
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

        expect(resultFn()).rejects.toThrow('Response validation failed')
      })

      // TODO: should continue to next strategy on validation failure (integration test)
      // TODO: should handle validation function throwing error
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
    // TODO: should use user agent from config (simple integration test)
    // Note: Detailed rotation/selection logic tested in getRandomFrom() unit tests
  })

  describe('viewport configuration', () => {
    // TODO: should apply viewport from config to browser mechanism (simple integration test)
    // Note: Detailed rotation/selection logic tested in getRandomFrom() unit tests
  })

  describe('header configuration', () => {
    // TODO: should merge custom headers with default headers
    // TODO: should override default headers with custom headers
    // TODO: should handle empty headers object
    // TODO: should handle null/undefined header values
    // TODO: should handle case-insensitive header names
    // TODO: should preserve header order
    // TODO: should handle special characters in header values
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

      expect(resultFn()).rejects.toThrow()
    })

    // TODO: should apply timeout to browser mechanism (integration test)
    // Note: Timeout edge cases (zero, negative, huge) tested in strategy.test.ts unit tests
  })

  describe('retry mechanism', () => {
    // TODO: should retry on failure and succeed (simple integration test)
    // TODO: should propagate last error after all retries
    // TODO: should apply retry to each strategy independently
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

    // TODO: should parse complex HTML structures (integration test)
    // TODO: should support CSS selectors (integration test)

    // Note: Cheerio lazy loading implementation tested in executeFetchRequest() unit tests (strategy.test.ts)
  })

  describe('error handling', () => {
    describe('error messages', () => {
      // TODO: should throw descriptive error messages
      // TODO: should preserve error stack traces
    })

    describe('error types', () => {
      // TODO: should handle synchronous errors
      // TODO: should handle asynchronous errors
      // TODO: should handle unexpected error types
    })

    describe('function errors', () => {
      // TODO: should handle errors in validation function
      // TODO: should handle errors in custom fetch function
      // TODO: should handle errors in browser navigation
    })
  })

  describe('memory and performance', () => {
    describe('resource cleanup', () => {
      // TODO: should cleanup browser context after success
      // TODO: should cleanup browser context after failure
    })

    describe('concurrency', () => {
      // TODO: should handle concurrent scrape() calls
      // TODO: should handle sequential scrape() calls
    })

    // Note: Browser instance caching tested in getBrowser() unit tests (browser.test.ts)
    // Note: Cheerio caching tested in executeFetchRequest() unit tests (strategy.test.ts)
  })
})
