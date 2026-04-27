import { describe, expect, mock, test } from 'bun:test'
import { HttpError } from '../types/error.js'
import type { RequestOptions, ScrapeConfig } from '../types/index.js'
import type { ValidateResponseContext } from '../types/validate.js'
import {
  calculateRetryDelay,
  executeCustomMechanism,
  getRandomFrom,
  withRetry,
} from './strategy.js'

describe('calculateRetryDelay', () => {
  describe('exponential backoff', () => {
    test('should calculate delay for retry 0', () => {
      expect(calculateRetryDelay(0, 1000, 'exponential')).toBe(1000)
    })

    test('should calculate delay for retry 1', () => {
      expect(calculateRetryDelay(1, 1000, 'exponential')).toBe(2000)
    })

    test('should calculate delay for retry 2', () => {
      expect(calculateRetryDelay(2, 1000, 'exponential')).toBe(4000)
    })

    test('should calculate delay for retry 5', () => {
      expect(calculateRetryDelay(5, 1000, 'exponential')).toBe(32000)
    })

    test('should use base delay correctly', () => {
      expect(calculateRetryDelay(3, 500, 'exponential')).toBe(4000)
      expect(calculateRetryDelay(2, 2000, 'exponential')).toBe(8000)
    })
  })

  describe('linear backoff', () => {
    test('should calculate delay for retry 0', () => {
      expect(calculateRetryDelay(0, 1000, 'linear')).toBe(1000)
    })

    test('should calculate delay for retry 1', () => {
      expect(calculateRetryDelay(1, 1000, 'linear')).toBe(2000)
    })

    test('should calculate delay for retry 2', () => {
      expect(calculateRetryDelay(2, 1000, 'linear')).toBe(3000)
    })

    test('should calculate delay for retry 5', () => {
      expect(calculateRetryDelay(5, 1000, 'linear')).toBe(6000)
    })

    test('should use base delay correctly', () => {
      expect(calculateRetryDelay(3, 500, 'linear')).toBe(2000)
      expect(calculateRetryDelay(2, 2000, 'linear')).toBe(6000)
    })
  })

  describe('constant delay', () => {
    test('should return same delay for all retries', () => {
      expect(calculateRetryDelay(0, 1000, 'constant')).toBe(1000)
      expect(calculateRetryDelay(1, 1000, 'constant')).toBe(1000)
      expect(calculateRetryDelay(5, 1000, 'constant')).toBe(1000)
      expect(calculateRetryDelay(100, 1000, 'constant')).toBe(1000)
    })

    test('should return base delay', () => {
      expect(calculateRetryDelay(0, 500, 'constant')).toBe(500)
      expect(calculateRetryDelay(10, 2000, 'constant')).toBe(2000)
    })
  })

  describe('edge cases', () => {
    test('should handle zero base delay', () => {
      expect(calculateRetryDelay(0, 0, 'exponential')).toBe(0)
      expect(calculateRetryDelay(5, 0, 'linear')).toBe(0)
      expect(calculateRetryDelay(3, 0, 'constant')).toBe(0)
    })

    test('should handle negative retry number', () => {
      // 2^-1 = 0.5
      expect(calculateRetryDelay(-1, 1000, 'exponential')).toBe(500)
      // -1 + 1 = 0
      expect(calculateRetryDelay(-1, 1000, 'linear')).toBe(0)
      expect(calculateRetryDelay(-1, 1000, 'constant')).toBe(1000)
    })

    test('should handle unknown retry type (fallback to exponential)', () => {
      // @ts-expect-error Testing invalid retry type
      expect(calculateRetryDelay(2, 1000, 'unknown')).toBe(4000)
      // @ts-expect-error Testing invalid retry type
      expect(calculateRetryDelay(3, 500, 'invalid')).toBe(4000)
    })
  })
})

describe('getRandomFrom', () => {
  describe('random selection', () => {
    test('should return random item from array', () => {
      const items = ['a', 'b', 'c', 'd', 'e']
      const result = getRandomFrom(items)

      expect(items).toContain(result)
    })

    test('should return item from single element array', () => {
      const items = ['only-item']
      const result = getRandomFrom(items)

      expect(result).toBe('only-item')
    })
  })

  describe('edge cases', () => {
    test('should return undefined for empty array', () => {
      const result = getRandomFrom([])

      expect(result).toBeUndefined()
    })

    test('should return undefined for undefined input', () => {
      const result = getRandomFrom(undefined)

      expect(result).toBeUndefined()
    })

    test('should handle array with null/undefined elements', () => {
      const items = [null, undefined, 'valid', null]
      const result = getRandomFrom(items)

      expect(items).toContain(result)
    })
  })
})

describe('withRetry', () => {
  describe('retry logic', () => {
    test('should execute function without retry when count is 0', async () => {
      const fn = mock(() => Promise.resolve('success'))
      const result = await withRetry(fn, { count: 0 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should execute function without retry when not configured', async () => {
      const fn = mock(() => Promise.resolve('success'))
      const result = await withRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should return result on first success', async () => {
      const fn = mock(() => Promise.resolve('success'))
      const result = await withRetry(fn, { count: 3 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should return result on retry success', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        return attempt < 3 ? Promise.reject(new Error('fail')) : Promise.resolve('success')
      })

      const result = await withRetry(fn, { count: 3, delay: 1 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    test('should retry specified number of times', async () => {
      const fn = mock(() => Promise.reject(new Error('fail')))

      try {
        await withRetry(fn, { count: 3, delay: 1 })
      } catch {
        // Expected to throw
      }

      expect(fn).toHaveBeenCalledTimes(4)
    })

    test('should throw last error after all retries', async () => {
      const fn = mock(() => Promise.reject(new Error('persistent failure')))
      const resultFn = () => withRetry(fn, { count: 2, delay: 1 })

      await expect(resultFn()).rejects.toThrow('persistent failure')
    })
  })

  describe('hooks', () => {
    test.todo('should call onRetryAttempt hook when retry occurs', () => {
      // Call onRetryAttempt hook when retry occurs
    })

    test.todo('should pass correct context to onRetryAttempt (error, attempt, maxAttempts, nextRetryDelay, retryConfig)', () => {
      // Pass correct context to onRetryAttempt (error, attempt, maxAttempts, nextRetryDelay, retryConfig)
    })

    test.todo('should not call onRetryAttempt on first attempt', () => {
      // Not call onRetryAttempt on first attempt
    })

    test.todo('should call onRetryAttempt multiple times for multiple retries', () => {
      // Call onRetryAttempt multiple times for multiple retries
    })

    test.todo('should call onRetryExhausted hook when all retries fail', () => {
      // Call onRetryExhausted hook when all retries fail
    })

    test.todo('should pass correct context to onRetryExhausted (error, totalAttempts, retryConfig)', () => {
      // Pass correct context to onRetryExhausted (error, totalAttempts, retryConfig)
    })

    test.todo('should not call onRetryExhausted when retry succeeds', () => {
      // Not call onRetryExhausted when retry succeeds
    })

    test.todo('should not call onRetryExhausted when no retries configured', () => {
      // Not call onRetryExhausted when no retries configured
    })

    test.todo('should handle hooks throwing errors gracefully', () => {
      // Handle hooks throwing errors gracefully
    })

    test.todo('should not call hooks when retries not configured', () => {
      // Not call hooks when retries not configured
    })
  })

  describe('delay calculation', () => {
    // TODO: Is it neeed? We have detailed unit tests for calculateRetryDelay
  })

  describe('error handling', () => {
    test('should retry on any error', async () => {
      const fn = mock(() => Promise.reject('string error'))
      const resultFn = () => withRetry(fn, { count: 1, delay: 1 })

      await expect(resultFn()).rejects.toBe('string error')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    test('should propagate last error', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        return Promise.reject(new Error(`attempt ${attempt}`))
      })
      const resultFn = () => withRetry(fn, { count: 2, delay: 1 })

      await expect(resultFn()).rejects.toThrow('attempt 3')
    })
  })

  describe('status code handling', () => {
    test('should retry on HttpError with retriable status code', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        if (attempt < 3) {
          throw new HttpError('HTTP 503', 503)
        }
        return Promise.resolve('success')
      })

      const result = await withRetry(fn, { count: 3, delay: 1, statusCodes: [503] })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    test('should NOT retry on HttpError with non-retriable status code', async () => {
      const fn = mock(() => {
        throw new HttpError('HTTP 404', 404)
      })

      const resultFn = () => withRetry(fn, { count: 3, delay: 1, statusCodes: [503, 500] })

      await expect(resultFn()).rejects.toThrow('HTTP 404')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should use default status codes when not specified', async () => {
      const fn = mock(() => {
        throw new HttpError('HTTP 500', 500)
      })

      const resultFn = () => withRetry(fn, { count: 2, delay: 1 })

      await expect(resultFn()).rejects.toThrow('HTTP 500')
      // Should retry because 500 is in default retriable status codes
      expect(fn).toHaveBeenCalledTimes(3)
    })

    test('should retry non-HttpError errors regardless of status codes', async () => {
      const fn = mock(() => Promise.reject(new Error('Network error')))

      const resultFn = () => withRetry(fn, { count: 2, delay: 1, statusCodes: [503] })

      await expect(resultFn()).rejects.toThrow('Network error')
      // Should retry even though error doesn't have status code
      expect(fn).toHaveBeenCalledTimes(3)
    })

    test('should retry on multiple different retriable status codes', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        if (attempt === 1) {
          throw new HttpError('HTTP 503', 503)
        }
        if (attempt === 2) {
          throw new HttpError('HTTP 429', 429)
        }
        return Promise.resolve('success')
      })

      const result = await withRetry(fn, { count: 3, delay: 1, statusCodes: [429, 503] })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    test('should stop immediately on first non-retriable status code', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        if (attempt === 1) {
          throw new HttpError('HTTP 503', 503)
        }
        throw new HttpError('HTTP 401', 401)
      })

      const resultFn = () => withRetry(fn, { count: 5, delay: 1, statusCodes: [503] })

      await expect(resultFn()).rejects.toThrow('HTTP 401')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
})

describe('executeFetchMechanism', () => {
  describe('request construction', () => {
    test.todo('should construct fetch request with url', () => {
      // Construct fetch request with url
    })

    test.todo('should set headers from options', () => {
      // Set headers from options
    })

    test.todo('should set user agent header', () => {
      // Set user agent header
    })

    test.todo('should set abort signal for timeout', () => {
      // Set abort signal for timeout
    })

    test.todo('should compose fetch options with proxy', () => {
      // Compose fetch options with proxy
    })

    test.todo('should not set proxy when not provided', () => {
      // Not set proxy when not provided
    })
  })

  describe('response handling', () => {
    test.todo('should return fetch response', () => {
      // Return fetch response
    })

    test.todo('should throw error when response is null', () => {
      // Throw error when response is null
    })

    test.todo('should clone response for cheerio', () => {
      // Clone response for cheerio
    })

    test.todo('should extract HTML text from response', () => {
      // Extract HTML text from response
    })
  })

  describe('validation', () => {
    test.todo('should validate response when validator provided', () => {
      // Validate response when validator provided
    })

    test.todo('should pass mechanism and response to validator', () => {
      // Pass mechanism and response to validator
    })

    test.todo('should throw error when validation fails', () => {
      // Throw error when validation fails
    })

    test.todo('should skip validation when validator not provided', () => {
      // Skip validation when validator not provided
    })
  })

  describe('cheerio lazy loading', () => {
    test.todo('should create getter for $ property', () => {
      // Create getter for $ property
    })

    test.todo('should not load cheerio immediately', () => {
      // Not load cheerio immediately
    })

    test.todo('should load cheerio on first $ access', () => {
      // Load cheerio on first $ access
    })

    test.todo('should cache cheerio instance', () => {
      // Cache cheerio instance
    })

    test.todo('should return same instance on subsequent accesses', () => {
      // Return same instance on subsequent accesses
    })
  })
})

describe('executeBrowserMechanism', () => {
  describe('browser initialization', () => {
    test.todo('should get browser instance', () => {
      // Get browser instance
    })

    test.todo('should use engine from config', () => {
      // Use engine from config
    })

    test.todo('should use default engine when not specified', () => {
      // Use default engine when not specified
    })

    test.todo('should create browser context with options', () => {
      // Create browser context with options
    })

    test.todo('should create page from context', () => {
      // Create page from context
    })
  })

  describe('navigation', () => {
    test.todo('should navigate to url', () => {
      // Navigate to url
    })

    test.todo('should wait for waitUntil condition', () => {
      // Wait for waitUntil condition
    })

    test.todo('should apply timeout from options', () => {
      // Apply timeout from options
    })

    test.todo('should return response from navigation', () => {
      // Return response from navigation
    })

    test.todo('should throw error when navigation fails', () => {
      // Throw error when navigation fails
    })
  })

  describe('validation', () => {
    test.todo('should validate response when validator provided', () => {
      // Validate response when validator provided
    })

    test.todo('should pass mechanism and response to validator', () => {
      // Pass mechanism and response to validator
    })

    test.todo('should throw error when validation fails', () => {
      // Throw error when validation fails
    })

    test.todo('should skip validation when validator not provided', () => {
      // Skip validation when validator not provided
    })
  })

  describe('cleanup', () => {
    test.todo('should return cleanup function', () => {
      // Return cleanup function
    })

    test.todo('should close context on cleanup', () => {
      // Close context on cleanup
    })

    test.todo('should close context on error', () => {
      // Close context on error
    })

    test.todo('should not throw error if cleanup fails', () => {
      // Not throw error if cleanup fails
    })
  })

  describe('error handling', () => {
    test.todo('should cleanup context on navigation error', () => {
      // Cleanup context on navigation error
    })

    test.todo('should cleanup context on validation error', () => {
      // Cleanup context on validation error
    })

    test.todo('should cleanup context on page creation error', () => {
      // Cleanup context on page creation error
    })

    test.todo('should propagate original error after cleanup', () => {
      // Propagate original error after cleanup
    })
  })
})

describe('executeCustomMechanism', () => {
  describe('custom fetch function', () => {
    test('should throw error when custom fetch not provided', async () => {
      const config: ScrapeConfig = {}
      const options: RequestOptions = {}
      const resultFn = () => executeCustomMechanism('https://example.com', config, options)

      await expect(resultFn()).rejects.toThrow('Custom fetch function not provided')
    })

    test('should execute custom fetch function', async () => {
      const mockFn = mock(async () => ({ data: 'test' }))
      const config: ScrapeConfig = { custom: { fn: mockFn } }
      const options: RequestOptions = {}

      await executeCustomMechanism('https://example.com', config, options)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('should pass url to custom fetch', async () => {
      let capturedUrl: string | undefined
      const config: ScrapeConfig = {
        custom: {
          fn: (url) => {
            capturedUrl = url
            return { data: 'test' }
          },
        },
      }
      const options: RequestOptions = {}

      await executeCustomMechanism('https://example.com/test', config, options)

      expect(capturedUrl).toBe('https://example.com/test')
    })

    test('should pass options to custom fetch', async () => {
      let capturedOptions: RequestOptions | undefined
      const config: ScrapeConfig = {
        custom: {
          fn: (_url, options) => {
            capturedOptions = options
            return { data: 'test' }
          },
        },
      }
      const options: RequestOptions = {
        headers: { 'X-Test': 'value' },
        timeout: 5000,
        proxy: 'http://proxy.com:8080',
      }

      await executeCustomMechanism('https://example.com', config, options)

      expect(capturedOptions).toEqual({
        headers: { 'X-Test': 'value' },
        timeout: 5000,
        proxy: 'http://proxy.com:8080',
      })
    })

    test('should return custom response', async () => {
      const customResponse = { data: 'test', count: 42 }
      const config: ScrapeConfig = {
        custom: { fn: async () => customResponse },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toEqual(customResponse)
    })

    test('should accept false as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => false },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe(false)
    })

    test('should accept 0 as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => 0 },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe(0)
    })

    test('should accept empty string as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => '' },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe('')
    })
  })

  describe('validation', () => {
    test('should validate response when validator provided', async () => {
      const mockValidator = mock(() => true)
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ status: 'ok' }) },
        options: { validateResponse: mockValidator },
      }
      const options: RequestOptions = {}

      await executeCustomMechanism('https://example.com', config, options)

      expect(mockValidator).toHaveBeenCalledTimes(1)
    })

    test('should pass mechanism and response to validator', async () => {
      let capturedContext: ValidateResponseContext | undefined
      const customResponse = { status: 'ok' }
      const config: ScrapeConfig = {
        custom: { fn: async () => customResponse },
        options: {
          validateResponse: (context) => {
            capturedContext = context
            return true
          },
        },
      }
      const options: RequestOptions = {}

      await executeCustomMechanism('https://example.com', config, options)

      expect(capturedContext?.mechanism).toBe('custom')
      expect(capturedContext?.response).toEqual(customResponse)
    })

    test('should throw error when validation fails', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ status: 'error' }) },
        options: {
          validateResponse: () => false,
        },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomMechanism('https://example.com', config, options)

      await expect(resultFn()).rejects.toThrow('Response validation failed')
    })

    test('should skip validation when validator not provided', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ data: 'test' }) },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toEqual({ data: 'test' })
    })
  })

  describe('error handling', () => {
    test('should throw error when response is null', async () => {
      const config: ScrapeConfig = {
        custom: { fn: () => null },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomMechanism('https://example.com', config, options)

      await expect(resultFn()).rejects.toThrow('No response received from custom fetch function')
    })

    test('should throw error when response is undefined', async () => {
      const config: ScrapeConfig = {
        custom: { fn: () => undefined },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomMechanism('https://example.com', config, options)

      await expect(resultFn()).rejects.toThrow('No response received from custom fetch function')
    })

    test('should propagate custom fetch errors', async () => {
      const config: ScrapeConfig = {
        custom: {
          fn: () => {
            throw new Error('Custom fetch failed')
          },
        },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomMechanism('https://example.com', config, options)

      await expect(resultFn()).rejects.toThrow('Custom fetch failed')
    })

    test('should handle validation errors', async () => {
      const config: ScrapeConfig = {
        custom: { fn: () => ({ data: 'test' }) },
        options: {
          validateResponse: () => {
            throw new Error('Validation error')
          },
        },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomMechanism('https://example.com', config, options)

      await expect(resultFn()).rejects.toThrow('Validation error')
    })
  })
})

describe('executeStrategy', () => {
  describe('request options composition', () => {
    test.todo('should compose request options from strategy and config', () => {
      // Compose request options from strategy and config
    })

    test.todo('should select random proxy when useProxy is true', () => {
      // Select random proxy when useProxy is true
    })

    test.todo('should not include proxy when useProxy is false', () => {
      // Not include proxy when useProxy is false
    })

    test.todo('should select random user agent from config', () => {
      // Select random user agent from config
    })

    test.todo('should select random viewport from config', () => {
      // Select random viewport from config
    })

    test.todo('should include headers from config', () => {
      // Include headers from config
    })

    test.todo('should include timeout from config', () => {
      // Include timeout from config
    })

    test.todo('should handle empty options', () => {
      // Handle empty options
    })

    test.todo('should handle partial options', () => {
      // Handle partial options
    })
  })

  describe('retry delegation', () => {
    test.todo('should delegate to withRetry function', () => {
      // Delegate to withRetry function
    })

    test.todo('should pass retry config from options', () => {
      // Pass retry config from options
    })

    test.todo('should execute request without retry when not configured', () => {
      // Execute request without retry when not configured
    })
  })

  describe('hooks delegation', () => {
    test.todo('should pass hooks to withRetry function', () => {
      // Pass hooks to withRetry function
    })

    test.todo('should not pass hooks when not configured', () => {
      // Not pass hooks when not configured
    })
  })

  describe('mechanism routing', () => {
    test.todo('should route to executeFetchMechanism for fetch mechanism', () => {
      // Route to executeFetchMechanism for fetch mechanism
    })

    test.todo('should route to executeBrowserMechanism for browser mechanism', () => {
      // Route to executeBrowserMechanism for browser mechanism
    })

    test.todo('should route to executeCustomMechanism for custom mechanism', () => {
      // Route to executeCustomMechanism for custom mechanism
    })

    test.todo('should throw error for unknown mechanism', () => {
      // Throw error for unknown mechanism
    })
  })
})
