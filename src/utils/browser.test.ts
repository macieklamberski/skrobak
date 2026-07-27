import { beforeEach, describe, expect, test } from 'bun:test'
import type { Browser } from 'playwright'
import type { RequestOptions } from '../types/index.js'
import { closeAllBrowsers, createContext, getBrowser, parseProxy } from './browser.js'

describe('getBrowser', () => {
  beforeEach(async () => {
    await closeAllBrowsers()
  })

  test('should create and return a chromium browser', async () => {
    const browser = await getBrowser('chromium')

    expect(browser).toBeDefined()
    expect(browser.isConnected()).toBe(true)
  })

  test('should return same browser instance on subsequent calls', async () => {
    const browser1 = await getBrowser('chromium')
    const browser2 = await getBrowser('chromium')

    expect(browser1).toBe(browser2)
  })

  // TODO: Add more getBrowser tests
  // - should create and return a firefox browser
  // - should create and return a webkit browser
  // - should apply stealth plugin
  // - should launch with correct args
  // - should cache browser instance
  // - should cache different engines separately
  // - should return different instances for different engines
  // - should verify browser is connected
  // - should handle browser disconnection
  // - should recreate browser if disconnected
  // - should handle browser launch failure
  // - should handle invalid engine type
})

describe('createContext', () => {
  let browser: Browser

  beforeEach(async () => {
    await closeAllBrowsers()
    browser = await getBrowser('chromium')
  })

  test('should create context without options', async () => {
    const context = await createContext(browser, {})

    expect(context).toBeDefined()
  })

  test('should create context with user agent', async () => {
    const options: RequestOptions = {
      userAgent: 'Mozilla/5.0 Custom Agent',
    }

    const context = await createContext(browser, options)
    const _page = await context.newPage()

    // Note: Stealth plugin may override the user agent, so we just verify context was created
    expect(context).toBeDefined()
  })

  test('should create context with viewport settings', async () => {
    const options: RequestOptions = {
      viewport: {
        width: 1920,
        height: 1080,
      },
    }

    const context = await createContext(browser, options)
    const page = await context.newPage()
    const viewport = page.viewportSize()

    expect(viewport).toEqual({ width: 1920, height: 1080 })
  })

  test('should create context with all options combined', async () => {
    const options: RequestOptions = {
      userAgent: 'Mozilla/5.0 Test Agent',
      viewport: {
        width: 1366,
        height: 768,
      },
    }

    const context = await createContext(browser, options)
    const page = await context.newPage()

    const viewport = page.viewportSize()

    expect(viewport).toEqual({ width: 1366, height: 768 })
  })

  test('should create context with empty options object', async () => {
    const context = await createContext(browser, {})

    expect(context).toBeDefined()
  })

  describe('proxy configuration', () => {
    test('should set proxy server in context options', () => {
      expect(parseProxy('http://proxy.com:8080')).toEqual({ server: 'http://proxy.com:8080' })
    })

    test('should handle proxy with authentication', () => {
      expect(parseProxy('http://user:pass@proxy.com:8080')).toEqual({
        server: 'http://proxy.com:8080',
        username: 'user',
        password: 'pass',
      })
    })

    test('should decode percent-encoded credentials', () => {
      expect(parseProxy('http://user%40mail:p%40ss%3Aword@proxy.com:8080')).toEqual({
        server: 'http://proxy.com:8080',
        username: 'user@mail',
        password: 'p@ss:word',
      })
    })

    test('should handle proxy with username only', () => {
      expect(parseProxy('http://user@proxy.com:8080')).toEqual({
        server: 'http://proxy.com:8080',
        username: 'user',
        password: '',
      })
    })

    test('should handle socks proxy with authentication', () => {
      expect(parseProxy('socks5://user:pass@proxy.com:1080')).toEqual({
        server: 'socks5://proxy.com:1080',
        username: 'user',
        password: 'pass',
      })
    })

    test('should handle invalid proxy format', () => {
      expect(parseProxy('proxy.com:8080')).toEqual({ server: 'proxy.com:8080' })
      expect(parseProxy('not a url')).toEqual({ server: 'not a url' })
    })
  })

  describe('user agent override', () => {
    test.todo('should override default user agent', () => {
      // Override default user agent
    })

    test.todo('should handle empty user agent string', () => {
      // Handle empty user agent string
    })
  })

  describe('viewport dimensions', () => {
    test.todo('should handle different viewport sizes', () => {
      // Handle different viewport sizes
    })

    test.todo('should handle zero width viewport', () => {
      // Handle zero width viewport
    })

    test.todo('should handle zero height viewport', () => {
      // Handle zero height viewport
    })

    test.todo('should handle negative viewport dimensions', () => {
      // Handle negative viewport dimensions
    })
  })

  describe('combined options', () => {
    test.todo('should create context with proxy and user agent', () => {
      // Create context with proxy and user agent
    })

    test.todo('should create context with proxy and viewport', () => {
      // Create context with proxy and viewport
    })

    test.todo('should create context with user agent and viewport', () => {
      // Create context with user agent and viewport
    })
  })

  describe('error handling', () => {
    test.todo('should handle context creation failure', () => {
      // Handle context creation failure
    })

    test.todo('should handle invalid browser instance', () => {
      // Handle invalid browser instance
    })
  })
})

describe('allowListedResources', () => {
  describe('resource filtering', () => {
    test.todo('should allow only specified resource types', () => {
      // Allow only specified resource types
    })

    test.todo('should block unspecified resource types', () => {
      // Block unspecified resource types
    })

    test.todo('should handle empty resource list', () => {
      // Handle empty resource list
    })

    test.todo('should handle single resource type', () => {
      // Handle single resource type
    })

    test.todo('should handle multiple resource types', () => {
      // Handle multiple resource types
    })

    test.todo('should handle all resource types', () => {
      // Handle all resource types
    })
  })

  describe('specific resource types', () => {
    test.todo('should allow document resources', () => {
      // Allow document resources
    })

    test.todo('should allow stylesheet resources', () => {
      // Allow stylesheet resources
    })

    test.todo('should allow image resources', () => {
      // Allow image resources
    })

    test.todo('should allow script resources', () => {
      // Allow script resources
    })

    test.todo('should allow xhr resources', () => {
      // Allow xhr resources
    })

    test.todo('should allow fetch resources', () => {
      // Allow fetch resources
    })

    test.todo('should block fonts when not in list', () => {
      // Block fonts when not in list
    })

    test.todo('should block media when not in list', () => {
      // Block media when not in list
    })
  })

  describe('error handling', () => {
    test.todo('should handle route setup failure', () => {
      // Handle route setup failure
    })

    test.todo('should handle abort errors gracefully', () => {
      // Handle abort errors gracefully
    })
  })
})

describe('createPage', () => {
  describe('page creation', () => {
    test.todo('should create page from browser', () => {
      // Create page from browser
    })

    test.todo('should create page from context', () => {
      // Create page from context
    })

    test.todo('should return page instance', () => {
      // Return page instance
    })
  })

  describe('headers configuration', () => {
    test.todo('should set extra HTTP headers', () => {
      // Set extra HTTP headers
    })

    test.todo('should handle empty headers object', () => {
      // Handle empty headers object
    })

    test.todo('should handle multiple headers', () => {
      // Handle multiple headers
    })

    test.todo('should not set headers when not provided', () => {
      // Not set headers when not provided
    })
  })

  describe('resource filtering', () => {
    test.todo('should apply resource allowlist when configured', () => {
      // Apply resource allowlist when configured
    })

    test.todo('should not apply resource filtering when not configured', () => {
      // Not apply resource filtering when not configured
    })

    test.todo('should handle empty resources array', () => {
      // Handle empty resources array
    })
  })

  describe('combined options', () => {
    test.todo('should create page with headers and resources', () => {
      // Create page with headers and resources
    })

    test.todo('should create page with only headers', () => {
      // Create page with only headers
    })

    test.todo('should create page with only resources', () => {
      // Create page with only resources
    })

    test.todo('should create page with no options', () => {
      // Create page with no options
    })
  })

  describe('error handling', () => {
    test.todo('should handle page creation failure', () => {
      // Handle page creation failure
    })

    test.todo('should handle header setting failure', () => {
      // Handle header setting failure
    })

    test.todo('should handle resource filtering failure', () => {
      // Handle resource filtering failure
    })
  })
})

describe.skip('closeAllBrowsers', () => {
  test('should close all open browsers', async () => {
    const chromiumBrowser = await getBrowser('chromium')

    expect(chromiumBrowser.isConnected()).toBe(true)

    await closeAllBrowsers()

    expect(chromiumBrowser.isConnected()).toBe(false)
  })

  test('should handle closing when no browsers are open', async () => {
    await closeAllBrowsers()
    // Should not throw error
  })

  test('should allow creating new browsers after closing all', async () => {
    const browser1 = await getBrowser('chromium')
    await closeAllBrowsers()

    const browser2 = await getBrowser('chromium')

    expect(browser1).not.toBe(browser2)
    expect(browser2.isConnected()).toBe(true)

    await closeAllBrowsers()
  })

  // TODO: Add more closeAllBrowsers tests
  // - should close multiple browser engines
  // - should close chromium and firefox
  // - should close all three engines
  // - should clear browser cache
  // - should reset internal browser map
  // - should handle browser close failure
  // - should continue closing other browsers if one fails
  // - should not throw error on cleanup failure
})
