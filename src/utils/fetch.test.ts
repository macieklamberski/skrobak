import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { scrape } from '../index.js'
import type { FetchOptions } from '../types/fetch.js'
import { composeFetchOptions, isBunRuntime } from './fetch.js'

describe('isBunRuntime', () => {
  describe('runtime detection', () => {
    it('should return true when running in Bun', () => {
      expect(isBunRuntime()).toBe(true)
    })

    it('should check process.versions.bun', () => {
      const result = isBunRuntime()

      expect(result).toBe(!!process.versions.bun)
    })
  })
})

describe('composeFetchOptions', () => {
  describe('basic options', () => {
    it('should return options with headers', () => {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const options = composeFetchOptions(headers)

      expect(options.headers).toBe(headers)
    })

    it('should return options with signal', () => {
      const headers = new Headers()
      const signal = AbortSignal.timeout(5000)
      const options = composeFetchOptions(headers, signal)

      expect(options.signal).toBe(signal)
      expect(options.headers).toBe(headers)
    })

    it('should handle undefined signal', () => {
      const headers = new Headers()
      const options = composeFetchOptions(headers, undefined)

      expect(options.signal).toBeUndefined()
      expect(options.headers).toBe(headers)
    })

    it('should handle undefined proxy', () => {
      const headers = new Headers()
      const options = composeFetchOptions(headers)

      expect(options.headers).toBe(headers)
      expect(options.proxy).toBeUndefined()
      expect(options.dispatcher).toBeUndefined()
    })
  })

  describe('proxy configuration - Bun runtime', () => {
    it('should use proxy string directly in Bun', () => {
      if (!isBunRuntime()) {
        return
      }

      const headers = new Headers()
      const proxyUrl = 'http://proxy.example.com:8080'
      const options = composeFetchOptions(headers, undefined, proxyUrl)

      expect(options.proxy).toBe(proxyUrl)
    })

    it('should not set dispatcher in Bun', () => {
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
    it('should create ProxyAgent with proxy string in Node', () => {
      if (isBunRuntime()) {
        return
      }

      const headers = new Headers()
      const proxyUrl = 'http://proxy.example.com:8080'
      const options = composeFetchOptions(headers, undefined, proxyUrl)

      expect(options.dispatcher).toBeDefined()
      expect(options.dispatcher?.constructor.name).toBe('ProxyAgent')
    })

    it('should not set proxy property in Node', () => {
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
    it('should handle empty headers', () => {
      const headers = new Headers()
      const options = composeFetchOptions(headers)

      expect(options.headers).toBe(headers)
      expect(Array.from(headers.entries()).length).toBe(0)
    })

    it('should preserve existing options properties', () => {
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

    it('should configure proxy when useProxy is true', async () => {
      server.use(
        http.get('https://example.com/with-proxy', () => {
          return HttpResponse.json({ success: true })
        }),
      )

      const fetchSpy = spyOn(globalThis, 'fetch')

      await scrape('https://example.com/with-proxy', {
        options: { proxies: ['http://proxy.example.com:8080'] },
        strategies: [{ mechanism: 'fetch', useProxy: true }],
      })

      const fetchOptions: FetchOptions | undefined = fetchSpy.mock.calls[0][1]

      expect(fetchSpy).toHaveBeenCalled()
      expect(fetchOptions?.proxy).toBe('http://proxy.example.com:8080')

      fetchSpy.mockRestore()
    })

    it('should not configure proxy when useProxy is false', async () => {
      server.use(
        http.get('https://example.com/without-proxy', () => {
          return HttpResponse.json({ success: true })
        }),
      )

      const fetchSpy = spyOn(globalThis, 'fetch')

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
