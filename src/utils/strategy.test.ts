import { describe, expect, it, mock } from 'bun:test'
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
    it('should calculate delay for retry 0', () => {
      expect(calculateRetryDelay(0, 1000, 'exponential')).toBe(1000)
    })

    it('should calculate delay for retry 1', () => {
      expect(calculateRetryDelay(1, 1000, 'exponential')).toBe(2000)
    })

    it('should calculate delay for retry 2', () => {
      expect(calculateRetryDelay(2, 1000, 'exponential')).toBe(4000)
    })

    it('should calculate delay for retry 5', () => {
      expect(calculateRetryDelay(5, 1000, 'exponential')).toBe(32000)
    })

    it('should use base delay correctly', () => {
      expect(calculateRetryDelay(3, 500, 'exponential')).toBe(4000)
      expect(calculateRetryDelay(2, 2000, 'exponential')).toBe(8000)
    })
  })

  describe('linear backoff', () => {
    it('should calculate delay for retry 0', () => {
      expect(calculateRetryDelay(0, 1000, 'linear')).toBe(1000)
    })

    it('should calculate delay for retry 1', () => {
      expect(calculateRetryDelay(1, 1000, 'linear')).toBe(2000)
    })

    it('should calculate delay for retry 2', () => {
      expect(calculateRetryDelay(2, 1000, 'linear')).toBe(3000)
    })

    it('should calculate delay for retry 5', () => {
      expect(calculateRetryDelay(5, 1000, 'linear')).toBe(6000)
    })

    it('should use base delay correctly', () => {
      expect(calculateRetryDelay(3, 500, 'linear')).toBe(2000)
      expect(calculateRetryDelay(2, 2000, 'linear')).toBe(6000)
    })
  })

  describe('constant delay', () => {
    it('should return same delay for all retries', () => {
      expect(calculateRetryDelay(0, 1000, 'constant')).toBe(1000)
      expect(calculateRetryDelay(1, 1000, 'constant')).toBe(1000)
      expect(calculateRetryDelay(5, 1000, 'constant')).toBe(1000)
      expect(calculateRetryDelay(100, 1000, 'constant')).toBe(1000)
    })

    it('should return base delay', () => {
      expect(calculateRetryDelay(0, 500, 'constant')).toBe(500)
      expect(calculateRetryDelay(10, 2000, 'constant')).toBe(2000)
    })
  })

  describe('edge cases', () => {
    it('should handle zero base delay', () => {
      expect(calculateRetryDelay(0, 0, 'exponential')).toBe(0)
      expect(calculateRetryDelay(5, 0, 'linear')).toBe(0)
      expect(calculateRetryDelay(3, 0, 'constant')).toBe(0)
    })

    it('should handle negative retry number', () => {
      // 2^-1 = 0.5
      expect(calculateRetryDelay(-1, 1000, 'exponential')).toBe(500)
      // -1 + 1 = 0
      expect(calculateRetryDelay(-1, 1000, 'linear')).toBe(0)
      expect(calculateRetryDelay(-1, 1000, 'constant')).toBe(1000)
    })

    it('should handle unknown retry type (fallback to exponential)', () => {
      // @ts-expect-error Testing invalid retry type
      expect(calculateRetryDelay(2, 1000, 'unknown')).toBe(4000)
      // @ts-expect-error Testing invalid retry type
      expect(calculateRetryDelay(3, 500, 'invalid')).toBe(4000)
    })
  })
})

describe('getRandomFrom', () => {
  describe('random selection', () => {
    it('should return random item from array', () => {
      const items = ['a', 'b', 'c', 'd', 'e']
      const result = getRandomFrom(items)

      expect(items).toContain(result)
    })

    it('should return item from single element array', () => {
      const items = ['only-item']
      const result = getRandomFrom(items)

      expect(result).toBe('only-item')
    })
  })

  describe('edge cases', () => {
    it('should return undefined for empty array', () => {
      const result = getRandomFrom([])

      expect(result).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      const result = getRandomFrom(undefined)

      expect(result).toBeUndefined()
    })

    it('should handle array with null/undefined elements', () => {
      const items = [null, undefined, 'valid', null]
      const result = getRandomFrom(items)

      expect(items).toContain(result)
    })
  })
})

describe('withRetry', () => {
  describe('retry logic', () => {
    it('should execute function without retry when count is 0', async () => {
      const fn = mock(() => Promise.resolve('success'))
      const result = await withRetry(fn, { count: 0 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should execute function without retry when not configured', async () => {
      const fn = mock(() => Promise.resolve('success'))
      const result = await withRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should return result on first success', async () => {
      const fn = mock(() => Promise.resolve('success'))
      const result = await withRetry(fn, { count: 3 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should return result on retry success', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        return attempt < 3 ? Promise.reject(new Error('fail')) : Promise.resolve('success')
      })

      const result = await withRetry(fn, { count: 3, delay: 1 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should retry specified number of times', async () => {
      const fn = mock(() => Promise.reject(new Error('fail')))

      try {
        await withRetry(fn, { count: 3, delay: 1 })
      } catch {
        // Expected to throw
      }

      expect(fn).toHaveBeenCalledTimes(4)
    })

    it('should throw last error after all retries', async () => {
      const fn = mock(() => Promise.reject(new Error('persistent failure')))
      const throwing = () => withRetry(fn, { count: 2, delay: 1 })

      await expect(throwing()).rejects.toThrow('persistent failure')
    })
  })

  describe('hooks', () => {
    it.todo('should call onRetryAttempt hook when retry occurs', () => {
      // Call onRetryAttempt hook when retry occurs
    })

    it.todo('should pass correct context to onRetryAttempt (error, attempt, maxAttempts, nextRetryDelay, retryConfig)', () => {
      // Pass correct context to onRetryAttempt (error, attempt, maxAttempts, nextRetryDelay, retryConfig)
    })

    it.todo('should not call onRetryAttempt on first attempt', () => {
      // Not call onRetryAttempt on first attempt
    })

    it.todo('should call onRetryAttempt multiple times for multiple retries', () => {
      // Call onRetryAttempt multiple times for multiple retries
    })

    it.todo('should call onRetryExhausted hook when all retries fail', () => {
      // Call onRetryExhausted hook when all retries fail
    })

    it.todo('should pass correct context to onRetryExhausted (error, totalAttempts, retryConfig)', () => {
      // Pass correct context to onRetryExhausted (error, totalAttempts, retryConfig)
    })

    it.todo('should not call onRetryExhausted when retry succeeds', () => {
      // Not call onRetryExhausted when retry succeeds
    })

    it.todo('should not call onRetryExhausted when no retries configured', () => {
      // Not call onRetryExhausted when no retries configured
    })

    it.todo('should handle hooks throwing errors gracefully', () => {
      // Handle hooks throwing errors gracefully
    })

    it.todo('should not call hooks when retries not configured', () => {
      // Not call hooks when retries not configured
    })
  })

  describe('delay calculation', () => {
    // TODO: Is it neeed? We have detailed unit tests for calculateRetryDelay
  })

  describe('error handling', () => {
    it('should retry on any error', async () => {
      const fn = mock(() => Promise.reject('string error'))
      const throwing = () => withRetry(fn, { count: 1, delay: 1 })

      await expect(throwing()).rejects.toBe('string error')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should propagate last error', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        return Promise.reject(new Error(`attempt ${attempt}`))
      })
      const throwing = () => withRetry(fn, { count: 2, delay: 1 })

      await expect(throwing()).rejects.toThrow('attempt 3')
    })
  })

  describe('status code handling', () => {
    it('should retry on HttpError with retriable status code', async () => {
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

    it('should NOT retry on HttpError with non-retriable status code', async () => {
      const fn = mock(() => {
        throw new HttpError('HTTP 404', 404)
      })

      const throwing = () => withRetry(fn, { count: 3, delay: 1, statusCodes: [503, 500] })

      await expect(throwing()).rejects.toThrow('HTTP 404')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should use default status codes when not specified', async () => {
      const fn = mock(() => {
        throw new HttpError('HTTP 500', 500)
      })

      const throwing = () => withRetry(fn, { count: 2, delay: 1 })

      await expect(throwing()).rejects.toThrow('HTTP 500')
      // Should retry because 500 is in default retriable status codes
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should retry non-HttpError errors regardless of status codes', async () => {
      const fn = mock(() => Promise.reject(new Error('Network error')))

      const throwing = () => withRetry(fn, { count: 2, delay: 1, statusCodes: [503] })

      await expect(throwing()).rejects.toThrow('Network error')
      // Should retry even though error doesn't have status code
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should retry on multiple different retriable status codes', async () => {
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

    it('should stop immediately on first non-retriable status code', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        if (attempt === 1) {
          throw new HttpError('HTTP 503', 503)
        }
        throw new HttpError('HTTP 401', 401)
      })

      const throwing = () => withRetry(fn, { count: 5, delay: 1, statusCodes: [503] })

      await expect(throwing()).rejects.toThrow('HTTP 401')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
})

describe('executeFetchMechanism', () => {
  describe('request construction', () => {
    it.todo('should construct fetch request with url', () => {
      // Construct fetch request with url
    })

    it.todo('should set headers from options', () => {
      // Set headers from options
    })

    it.todo('should set user agent header', () => {
      // Set user agent header
    })

    it.todo('should set abort signal for timeout', () => {
      // Set abort signal for timeout
    })

    it.todo('should compose fetch options with proxy', () => {
      // Compose fetch options with proxy
    })

    it.todo('should not set proxy when not provided', () => {
      // Not set proxy when not provided
    })
  })

  describe('response handling', () => {
    it.todo('should return fetch response', () => {
      // Return fetch response
    })

    it.todo('should throw error when response is null', () => {
      // Throw error when response is null
    })

    it.todo('should clone response for cheerio', () => {
      // Clone response for cheerio
    })

    it.todo('should extract HTML text from response', () => {
      // Extract HTML text from response
    })
  })

  describe('validation', () => {
    it.todo('should validate response when validator provided', () => {
      // Validate response when validator provided
    })

    it.todo('should pass mechanism and response to validator', () => {
      // Pass mechanism and response to validator
    })

    it.todo('should throw error when validation fails', () => {
      // Throw error when validation fails
    })

    it.todo('should skip validation when validator not provided', () => {
      // Skip validation when validator not provided
    })
  })

  describe('cheerio lazy loading', () => {
    it.todo('should create getter for $ property', () => {
      // Create getter for $ property
    })

    it.todo('should not load cheerio immediately', () => {
      // Not load cheerio immediately
    })

    it.todo('should load cheerio on first $ access', () => {
      // Load cheerio on first $ access
    })

    it.todo('should cache cheerio instance', () => {
      // Cache cheerio instance
    })

    it.todo('should return same instance on subsequent accesses', () => {
      // Return same instance on subsequent accesses
    })
  })
})

describe('executeBrowserMechanism', () => {
  describe('browser initialization', () => {
    it.todo('should get browser instance', () => {
      // Get browser instance
    })

    it.todo('should use engine from config', () => {
      // Use engine from config
    })

    it.todo('should use default engine when not specified', () => {
      // Use default engine when not specified
    })

    it.todo('should create browser context with options', () => {
      // Create browser context with options
    })

    it.todo('should create page from context', () => {
      // Create page from context
    })
  })

  describe('navigation', () => {
    it.todo('should navigate to url', () => {
      // Navigate to url
    })

    it.todo('should wait for waitUntil condition', () => {
      // Wait for waitUntil condition
    })

    it.todo('should apply timeout from options', () => {
      // Apply timeout from options
    })

    it.todo('should return response from navigation', () => {
      // Return response from navigation
    })

    it.todo('should throw error when navigation fails', () => {
      // Throw error when navigation fails
    })
  })

  describe('validation', () => {
    it.todo('should validate response when validator provided', () => {
      // Validate response when validator provided
    })

    it.todo('should pass mechanism and response to validator', () => {
      // Pass mechanism and response to validator
    })

    it.todo('should throw error when validation fails', () => {
      // Throw error when validation fails
    })

    it.todo('should skip validation when validator not provided', () => {
      // Skip validation when validator not provided
    })
  })

  describe('cleanup', () => {
    it.todo('should return cleanup function', () => {
      // Return cleanup function
    })

    it.todo('should close context on cleanup', () => {
      // Close context on cleanup
    })

    it.todo('should close context on error', () => {
      // Close context on error
    })

    it.todo('should not throw error if cleanup fails', () => {
      // Not throw error if cleanup fails
    })
  })

  describe('error handling', () => {
    it.todo('should cleanup context on navigation error', () => {
      // Cleanup context on navigation error
    })

    it.todo('should cleanup context on validation error', () => {
      // Cleanup context on validation error
    })

    it.todo('should cleanup context on page creation error', () => {
      // Cleanup context on page creation error
    })

    it.todo('should propagate original error after cleanup', () => {
      // Propagate original error after cleanup
    })
  })
})

describe('executeCustomMechanism', () => {
  describe('custom fetch function', () => {
    it('should throw error when custom fetch not provided', async () => {
      const config: ScrapeConfig = {}
      const options: RequestOptions = {}
      const throwing = () => executeCustomMechanism('https://example.com', config, options)

      await expect(throwing()).rejects.toThrow('Custom fetch function not provided')
    })

    it('should execute custom fetch function', async () => {
      const mockFn = mock(async () => ({ data: 'test' }))
      const config: ScrapeConfig = { custom: { fn: mockFn } }
      const options: RequestOptions = {}

      await executeCustomMechanism('https://example.com', config, options)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should pass url to custom fetch', async () => {
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

    it('should pass options to custom fetch', async () => {
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

    it('should return custom response', async () => {
      const customResponse = { data: 'test', count: 42 }
      const config: ScrapeConfig = {
        custom: { fn: async () => customResponse },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toEqual(customResponse)
    })

    it('should accept false as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => false },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe(false)
    })

    it('should accept 0 as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => 0 },
      }
      const options: RequestOptions = {}
      const result = await executeCustomMechanism('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe(0)
    })

    it('should accept empty string as valid response', async () => {
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
    it('should validate response when validator provided', async () => {
      const mockValidator = mock(() => true)
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ status: 'ok' }) },
        options: { validateResponse: mockValidator },
      }
      const options: RequestOptions = {}

      await executeCustomMechanism('https://example.com', config, options)

      expect(mockValidator).toHaveBeenCalledTimes(1)
    })

    it('should pass mechanism and response to validator', async () => {
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

    it('should throw error when validation fails', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ status: 'error' }) },
        options: {
          validateResponse: () => false,
        },
      }
      const options: RequestOptions = {}
      const throwing = () => executeCustomMechanism('https://example.com', config, options)

      await expect(throwing()).rejects.toThrow('Response validation failed')
    })

    it('should skip validation when validator not provided', async () => {
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
    it('should throw error when response is null', async () => {
      const config: ScrapeConfig = {
        custom: { fn: () => null },
      }
      const options: RequestOptions = {}
      const throwing = () => executeCustomMechanism('https://example.com', config, options)

      await expect(throwing()).rejects.toThrow('No response received from custom fetch function')
    })

    it('should throw error when response is undefined', async () => {
      const config: ScrapeConfig = {
        custom: { fn: () => undefined },
      }
      const options: RequestOptions = {}
      const throwing = () => executeCustomMechanism('https://example.com', config, options)

      await expect(throwing()).rejects.toThrow('No response received from custom fetch function')
    })

    it('should propagate custom fetch errors', async () => {
      const config: ScrapeConfig = {
        custom: {
          fn: () => {
            throw new Error('Custom fetch failed')
          },
        },
      }
      const options: RequestOptions = {}
      const throwing = () => executeCustomMechanism('https://example.com', config, options)

      await expect(throwing()).rejects.toThrow('Custom fetch failed')
    })

    it('should handle validation errors', async () => {
      const config: ScrapeConfig = {
        custom: { fn: () => ({ data: 'test' }) },
        options: {
          validateResponse: () => {
            throw new Error('Validation error')
          },
        },
      }
      const options: RequestOptions = {}
      const throwing = () => executeCustomMechanism('https://example.com', config, options)

      await expect(throwing()).rejects.toThrow('Validation error')
    })
  })
})

describe('executeStrategy', () => {
  describe('request options composition', () => {
    it.todo('should compose request options from strategy and config', () => {
      // Compose request options from strategy and config
    })

    it.todo('should select random proxy when useProxy is true', () => {
      // Select random proxy when useProxy is true
    })

    it.todo('should not include proxy when useProxy is false', () => {
      // Not include proxy when useProxy is false
    })

    it.todo('should select random user agent from config', () => {
      // Select random user agent from config
    })

    it.todo('should select random viewport from config', () => {
      // Select random viewport from config
    })

    it.todo('should include headers from config', () => {
      // Include headers from config
    })

    it.todo('should include timeout from config', () => {
      // Include timeout from config
    })

    it.todo('should handle empty options', () => {
      // Handle empty options
    })

    it.todo('should handle partial options', () => {
      // Handle partial options
    })
  })

  describe('retry delegation', () => {
    it.todo('should delegate to withRetry function', () => {
      // Delegate to withRetry function
    })

    it.todo('should pass retry config from options', () => {
      // Pass retry config from options
    })

    it.todo('should execute request without retry when not configured', () => {
      // Execute request without retry when not configured
    })
  })

  describe('hooks delegation', () => {
    it.todo('should pass hooks to withRetry function', () => {
      // Pass hooks to withRetry function
    })

    it.todo('should not pass hooks when not configured', () => {
      // Not pass hooks when not configured
    })
  })

  describe('mechanism routing', () => {
    it.todo('should route to executeFetchMechanism for fetch mechanism', () => {
      // Route to executeFetchMechanism for fetch mechanism
    })

    it.todo('should route to executeBrowserMechanism for browser mechanism', () => {
      // Route to executeBrowserMechanism for browser mechanism
    })

    it.todo('should route to executeCustomMechanism for custom mechanism', () => {
      // Route to executeCustomMechanism for custom mechanism
    })

    it.todo('should throw error for unknown mechanism', () => {
      // Throw error for unknown mechanism
    })
  })
})
