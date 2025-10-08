import { describe, expect, mock, test } from 'bun:test'
import type { RequestOptions, ScrapeConfig } from '../types/index.js'
import type { ValidateResponseContext } from '../types/validate.js'
import { calculateRetryDelay, executeCustomRequest, getRandomFrom, withRetry } from './strategy.js'

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

      expect(resultFn()).rejects.toThrow('persistent failure')
    })
  })

  describe('delay calculation', () => {
    // TODO: Is it neeed? We have detailed unit tests for calculateRetryDelay
  })

  describe('error handling', () => {
    test('should retry on any error', async () => {
      const fn = mock(() => Promise.reject('string error'))
      const resultFn = () => withRetry(fn, { count: 1, delay: 1 })

      expect(resultFn()).rejects.toBe('string error')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    test('should propagate last error', async () => {
      let attempt = 0
      const fn = mock(() => {
        attempt++
        return Promise.reject(new Error(`attempt ${attempt}`))
      })
      const resultFn = () => withRetry(fn, { count: 2, delay: 1 })

      expect(resultFn()).rejects.toThrow('attempt 3')
    })
  })
})

describe('executeFetchRequest', () => {
  describe('request construction', () => {
    // TODO: should construct fetch request with url
    // TODO: should set headers from options
    // TODO: should set user agent header
    // TODO: should set abort signal for timeout
    // TODO: should compose fetch options with proxy
    // TODO: should not set proxy when not provided
  })

  describe('response handling', () => {
    // TODO: should return fetch response
    // TODO: should throw error when response is null
    // TODO: should clone response for cheerio
    // TODO: should extract HTML text from response
  })

  describe('validation', () => {
    // TODO: should validate response when validator provided
    // TODO: should pass mechanism and response to validator
    // TODO: should throw error when validation fails
    // TODO: should skip validation when validator not provided
  })

  describe('cheerio lazy loading', () => {
    // TODO: should create getter for $ property
    // TODO: should not load cheerio immediately
    // TODO: should load cheerio on first $ access
    // TODO: should cache cheerio instance
    // TODO: should return same instance on subsequent accesses
  })
})

describe('executeBrowserRequest', () => {
  describe('browser initialization', () => {
    // TODO: should get browser instance
    // TODO: should use engine from config
    // TODO: should use default engine when not specified
    // TODO: should create browser context with options
    // TODO: should create page from context
  })

  describe('navigation', () => {
    // TODO: should navigate to url
    // TODO: should wait for waitUntil condition
    // TODO: should apply timeout from options
    // TODO: should return response from navigation
    // TODO: should throw error when navigation fails
  })

  describe('validation', () => {
    // TODO: should validate response when validator provided
    // TODO: should pass mechanism and response to validator
    // TODO: should throw error when validation fails
    // TODO: should skip validation when validator not provided
  })

  describe('cleanup', () => {
    // TODO: should return cleanup function
    // TODO: should close context on cleanup
    // TODO: should close context on error
    // TODO: should not throw error if cleanup fails
  })

  describe('error handling', () => {
    // TODO: should cleanup context on navigation error
    // TODO: should cleanup context on validation error
    // TODO: should cleanup context on page creation error
    // TODO: should propagate original error after cleanup
  })
})

describe('executeCustomRequest', () => {
  describe('custom fetch function', () => {
    test('should throw error when custom fetch not provided', async () => {
      const config: ScrapeConfig = {}
      const options: RequestOptions = {}
      const resultFn = () => executeCustomRequest('https://example.com', config, options)

      expect(resultFn()).rejects.toThrow('Custom fetch function not provided')
    })

    test('should execute custom fetch function', async () => {
      const mockFn = mock(async () => ({ data: 'test' }))
      const config: ScrapeConfig = { custom: { fn: mockFn } }
      const options: RequestOptions = {}

      await executeCustomRequest('https://example.com', config, options)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('should pass url to custom fetch', async () => {
      let capturedUrl: string | undefined
      const config: ScrapeConfig = {
        custom: {
          fn: async (url) => {
            capturedUrl = url
            return { data: 'test' }
          },
        },
      }
      const options: RequestOptions = {}

      await executeCustomRequest('https://example.com/test', config, options)

      expect(capturedUrl).toBe('https://example.com/test')
    })

    test('should pass options to custom fetch', async () => {
      let capturedOptions: RequestOptions | undefined
      const config: ScrapeConfig = {
        custom: {
          fn: async (_url, options) => {
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

      await executeCustomRequest('https://example.com', config, options)

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
      const result = await executeCustomRequest('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toEqual(customResponse)
    })

    test('should accept false as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => false },
      }
      const options: RequestOptions = {}
      const result = await executeCustomRequest('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe(false)
    })

    test('should accept 0 as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => 0 },
      }
      const options: RequestOptions = {}
      const result = await executeCustomRequest('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toBe(0)
    })

    test('should accept empty string as valid response', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => '' },
      }
      const options: RequestOptions = {}
      const result = await executeCustomRequest('https://example.com', config, options)

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

      await executeCustomRequest('https://example.com', config, options)

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

      await executeCustomRequest('https://example.com', config, options)

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
      const resultFn = () => executeCustomRequest('https://example.com', config, options)

      expect(resultFn()).rejects.toThrow('Response validation failed')
    })

    test('should skip validation when validator not provided', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ data: 'test' }) },
      }
      const options: RequestOptions = {}
      const result = await executeCustomRequest('https://example.com', config, options)

      expect(result.mechanism).toBe('custom')
      expect(result.response).toEqual({ data: 'test' })
    })
  })

  describe('error handling', () => {
    test('should throw error when response is null', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => null },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomRequest('https://example.com', config, options)

      expect(resultFn()).rejects.toThrow('No response received from custom fetch function')
    })

    test('should throw error when response is undefined', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => undefined },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomRequest('https://example.com', config, options)

      expect(resultFn()).rejects.toThrow('No response received from custom fetch function')
    })

    test('should propagate custom fetch errors', async () => {
      const config: ScrapeConfig = {
        custom: {
          fn: async () => {
            throw new Error('Custom fetch failed')
          },
        },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomRequest('https://example.com', config, options)

      expect(resultFn()).rejects.toThrow('Custom fetch failed')
    })

    test('should handle validation errors', async () => {
      const config: ScrapeConfig = {
        custom: { fn: async () => ({ data: 'test' }) },
        options: {
          validateResponse: () => {
            throw new Error('Validation error')
          },
        },
      }
      const options: RequestOptions = {}
      const resultFn = () => executeCustomRequest('https://example.com', config, options)

      expect(resultFn()).rejects.toThrow('Validation error')
    })
  })
})

describe('executeStrategy', () => {
  describe('request options composition', () => {
    // TODO: should compose request options from strategy and config
    // TODO: should select random proxy when useProxy is true
    // TODO: should not include proxy when useProxy is false
    // TODO: should select random user agent from config
    // TODO: should select random viewport from config
    // TODO: should include headers from config
    // TODO: should include timeout from config
    // TODO: should handle empty options
    // TODO: should handle partial options
  })

  describe('retry delegation', () => {
    // TODO: should delegate to withRetry function
    // TODO: should pass retry config from options
    // TODO: should execute request without retry when not configured
  })

  describe('mechanism routing', () => {
    // TODO: should route to executeFetchRequest for fetch mechanism
    // TODO: should route to executeBrowserRequest for browser mechanism
    // TODO: should route to executeCustomRequest for custom mechanism
    // TODO: should throw error for unknown mechanism
  })
})
