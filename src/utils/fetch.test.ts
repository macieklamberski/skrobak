import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { scrape } from '../index.js'
import type { FetchOptions } from '../types/fetch.js'
import { composeFetchOptions, isBunRuntime } from './fetch.js'

describe('isBunRuntime', () => {
  describe('runtime detection', () => {
    test('should return true when running in Bun', () => {
      const result = isBunRuntime()

      if (process.versions.bun) {
        expect(result).toBe(true)
      } else {
        expect(result).toBe(false)
      }
    })

    test('should check process.versions.bun', () => {
      const result = isBunRuntime()

      expect(result).toBe(!!process.versions.bun)
    })
  })
})

describe('composeFetchOptions', () => {
  describe('basic options', () => {
    test('should return options with headers', () => {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const options = composeFetchOptions(headers)

      expect(options.headers).toBe(headers)
    })

    test('should return options with signal', () => {
      const headers = new Headers()
      const signal = AbortSignal.timeout(5000)
      const options = composeFetchOptions(headers, signal)

      expect(options.signal).toBe(signal)
      expect(options.headers).toBe(headers)
    })

    test('should handle undefined signal', () => {
      const headers = new Headers()
      const options = composeFetchOptions(headers, undefined)

      expect(options.signal).toBeUndefined()
      expect(options.headers).toBe(headers)
    })

    test('should handle undefined proxy', () => {
      const headers = new Headers()
      const options = composeFetchOptions(headers)

      expect(options.headers).toBe(headers)
      expect(options.proxy).toBeUndefined()
      expect(options.dispatcher).toBeUndefined()
    })
  })

  describe('proxy configuration - Bun runtime', () => {
    test('should use proxy string directly in Bun', () => {
      if (!isBunRuntime()) {
        return
      }

      const headers = new Headers()
      const proxyUrl = 'http://proxy.example.com:8080'
      const options = composeFetchOptions(headers, undefined, proxyUrl)

      expect(options.proxy).toBe(proxyUrl)
    })

    test('should not set dispatcher in Bun', () => {
      if (!isBunRuntime()) {
        return
      }

      const headers = new Headers()
      const proxyUrl = 'http://proxy.example.com:8080'
      const options = composeFetchOptions(headers, undefined, proxyUrl)

      expect(options.dispatcher).toBeUndefined()
    })
  })

  describe('proxy configuration - Node runtime', () => {
    test('should create ProxyAgent with proxy string in Node', () => {
      if (isBunRuntime()) {
        return
      }

      const headers = new Headers()
      const proxyUrl = 'http://proxy.example.com:8080'
      const options = composeFetchOptions(headers, undefined, proxyUrl)

      expect(options.dispatcher).toBeDefined()
      expect(options.dispatcher?.constructor.name).toBe('ProxyAgent')
    })

    test('should not set proxy property in Node', () => {
      if (isBunRuntime()) {
        return
      }

      const headers = new Headers()
      const proxyUrl = 'http://proxy.example.com:8080'
      const options = composeFetchOptions(headers, undefined, proxyUrl)

      expect(options.proxy).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    test('should handle empty headers', () => {
      const headers = new Headers()
      const options = composeFetchOptions(headers)

      expect(options.headers).toBe(headers)
      expect(Array.from(headers.entries()).length).toBe(0)
    })

    test('should preserve existing options properties', () => {
      const headers = new Headers({ Authorization: 'Bearer token' })
      const signal = AbortSignal.timeout(5000)
      const options = composeFetchOptions(headers, signal, 'http://proxy.example.com:8080')

      expect(options.headers).toBe(headers)
      expect(options.signal).toBe(signal)

      const hasProxy = options.proxy !== undefined
      const hasDispatcher = options.dispatcher !== undefined

      expect(hasProxy || hasDispatcher).toBe(true)
    })
  })

  describe('integration with fetch strategy', () => {
    const server = setupServer()

    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    test('should configure proxy when useProxy is true', async () => {
      server.use(
        http.get('https://example.com/with-proxy', () => {
          return HttpResponse.json({ success: true })
        }),
      )

      const fetchSpy = spyOn(global, 'fetch')

      await scrape('https://example.com/with-proxy', {
        options: { proxies: ['http://proxy.example.com:8080'] },
        strategies: [{ mechanism: 'fetch', useProxy: true }],
      })

      const fetchOptions: FetchOptions | undefined = fetchSpy.mock.calls[0][1]
      const isBun = !!process.versions.bun

      expect(fetchSpy).toHaveBeenCalled()

      if (isBun) {
        expect(fetchOptions?.proxy).toBe('http://proxy.example.com:8080')
      } else {
        expect(fetchOptions?.dispatcher).toBeDefined()
      }

      fetchSpy.mockRestore()
    })

    test('should not configure proxy when useProxy is false', async () => {
      server.use(
        http.get('https://example.com/without-proxy', () => {
          return HttpResponse.json({ success: true })
        }),
      )

      const fetchSpy = spyOn(global, 'fetch')

      await scrape('https://example.com/without-proxy', {
        options: { proxies: ['http://proxy.example.com:8080'] },
        strategies: [{ mechanism: 'fetch', useProxy: false }],
      })

      const fetchOptions: FetchOptions | undefined = fetchSpy.mock.calls[0][1]

      expect(fetchSpy).toHaveBeenCalled()
      expect(fetchOptions?.proxy).toBeUndefined()
      expect(fetchOptions?.dispatcher).toBeUndefined()

      fetchSpy.mockRestore()
    })
  })
})
