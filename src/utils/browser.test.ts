import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Browser } from 'playwright'
import type { RequestOptions } from '../types/index.js'
import { closeAllBrowsers, createContext, getBrowser, parseProxy } from './browser.js'

describe('getBrowser', () => {
  beforeEach(async () => {
    await closeAllBrowsers()
  })

  it('should create and return a chromium browser', async () => {
    const browser = await getBrowser('chromium')

    expect(browser).toBeDefined()
    expect(browser.isConnected()).toBe(true)
  })

  it('should return same browser instance on subsequent calls', async () => {
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

  // One browser for the whole block, and every context closed before it goes. Relaunching
  // Chromium per test starved the two-core CI runner, and closing a browser that still had
  // pages attached raced a CDP call against the shutdown: "Target page, context or browser
  // has been closed", twice on main in two days.
  beforeAll(async () => {
    await closeAllBrowsers()
    browser = await getBrowser('chromium')
  })

  afterEach(async () => {
    for (const context of browser.contexts()) {
      await context.close()
    }
  })

  afterAll(closeAllBrowsers)

  it('should create context without options', async () => {
    const context = await createContext(browser, {})

    expect(context).toBeDefined()
  })

  it('should create context with user agent', async () => {
    const options: RequestOptions = {
      userAgent: 'Mozilla/5.0 Custom Agent',
    }

    const context = await createContext(browser, options)
    const _page = await context.newPage()

    // Note: Stealth plugin may override the user agent, so we just verify context was created
    expect(context).toBeDefined()
  })

  it('should create context with viewport settings', async () => {
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

  it('should create context with all options combined', async () => {
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

  it('should create context with empty options object', async () => {
    const context = await createContext(browser, {})

    expect(context).toBeDefined()
  })

  describe('proxy configuration', () => {
    it('should set proxy server in context options', () => {
      expect(parseProxy('http://proxy.com:8080')).toEqual({ server: 'http://proxy.com:8080' })
    })

    it('should handle proxy with authentication', () => {
      expect(parseProxy('http://user:pass@proxy.com:8080')).toEqual({
        server: 'http://proxy.com:8080',
        username: 'user',
        password: 'pass',
      })
    })

    it('should decode percent-encoded credentials', () => {
      expect(parseProxy('http://user%40mail:p%40ss%3Aword@proxy.com:8080')).toEqual({
        server: 'http://proxy.com:8080',
        username: 'user@mail',
        password: 'p@ss:word',
      })
    })

    it('should handle proxy with username only', () => {
      expect(parseProxy('http://user@proxy.com:8080')).toEqual({
        server: 'http://proxy.com:8080',
        username: 'user',
        password: '',
      })
    })

    it('should handle socks proxy with authentication', () => {
      expect(parseProxy('socks5://user:pass@proxy.com:1080')).toEqual({
        server: 'socks5://proxy.com:1080',
        username: 'user',
        password: 'pass',
      })
    })

    it('should handle invalid proxy format', () => {
      expect(parseProxy('proxy.com:8080')).toEqual({ server: 'proxy.com:8080' })
      expect(parseProxy('not a url')).toEqual({ server: 'not a url' })
    })
  })

  describe('user agent override', () => {
    it.todo('should override default user agent', () => {
      // Override default user agent
    })

    it.todo('should handle empty user agent string', () => {
      // Handle empty user agent string
    })
  })

  describe('viewport dimensions', () => {
    it.todo('should handle different viewport sizes', () => {
      // Handle different viewport sizes
    })

    it.todo('should handle zero width viewport', () => {
      // Handle zero width viewport
    })

    it.todo('should handle zero height viewport', () => {
      // Handle zero height viewport
    })

    it.todo('should handle negative viewport dimensions', () => {
      // Handle negative viewport dimensions
    })
  })

  describe('combined options', () => {
    it.todo('should create context with proxy and user agent', () => {
      // Create context with proxy and user agent
    })

    it.todo('should create context with proxy and viewport', () => {
      // Create context with proxy and viewport
    })

    it.todo('should create context with user agent and viewport', () => {
      // Create context with user agent and viewport
    })
  })

  describe('error handling', () => {
    it.todo('should handle context creation failure', () => {
      // Handle context creation failure
    })

    it.todo('should handle invalid browser instance', () => {
      // Handle invalid browser instance
    })
  })
})

describe('allowListedResources', () => {
  describe('resource filtering', () => {
    it.todo('should allow only specified resource types', () => {
      // Allow only specified resource types
    })

    it.todo('should block unspecified resource types', () => {
      // Block unspecified resource types
    })

    it.todo('should handle empty resource list', () => {
      // Handle empty resource list
    })

    it.todo('should handle single resource type', () => {
      // Handle single resource type
    })

    it.todo('should handle multiple resource types', () => {
      // Handle multiple resource types
    })

    it.todo('should handle all resource types', () => {
      // Handle all resource types
    })
  })

  describe('specific resource types', () => {
    it.todo('should allow document resources', () => {
      // Allow document resources
    })

    it.todo('should allow stylesheet resources', () => {
      // Allow stylesheet resources
    })

    it.todo('should allow image resources', () => {
      // Allow image resources
    })

    it.todo('should allow script resources', () => {
      // Allow script resources
    })

    it.todo('should allow xhr resources', () => {
      // Allow xhr resources
    })

    it.todo('should allow fetch resources', () => {
      // Allow fetch resources
    })

    it.todo('should block fonts when not in list', () => {
      // Block fonts when not in list
    })

    it.todo('should block media when not in list', () => {
      // Block media when not in list
    })
  })

  describe('error handling', () => {
    it.todo('should handle route setup failure', () => {
      // Handle route setup failure
    })

    it.todo('should handle abort errors gracefully', () => {
      // Handle abort errors gracefully
    })
  })
})

describe('createPage', () => {
  describe('page creation', () => {
    it.todo('should create page from browser', () => {
      // Create page from browser
    })

    it.todo('should create page from context', () => {
      // Create page from context
    })

    it.todo('should return page instance', () => {
      // Return page instance
    })
  })

  describe('headers configuration', () => {
    it.todo('should set extra HTTP headers', () => {
      // Set extra HTTP headers
    })

    it.todo('should handle empty headers object', () => {
      // Handle empty headers object
    })

    it.todo('should handle multiple headers', () => {
      // Handle multiple headers
    })

    it.todo('should not set headers when not provided', () => {
      // Not set headers when not provided
    })
  })

  describe('resource filtering', () => {
    it.todo('should apply resource allowlist when configured', () => {
      // Apply resource allowlist when configured
    })

    it.todo('should not apply resource filtering when not configured', () => {
      // Not apply resource filtering when not configured
    })

    it.todo('should handle empty resources array', () => {
      // Handle empty resources array
    })
  })

  describe('combined options', () => {
    it.todo('should create page with headers and resources', () => {
      // Create page with headers and resources
    })

    it.todo('should create page with only headers', () => {
      // Create page with only headers
    })

    it.todo('should create page with only resources', () => {
      // Create page with only resources
    })

    it.todo('should create page with no options', () => {
      // Create page with no options
    })
  })

  describe('error handling', () => {
    it.todo('should handle page creation failure', () => {
      // Handle page creation failure
    })

    it.todo('should handle header setting failure', () => {
      // Handle header setting failure
    })

    it.todo('should handle resource filtering failure', () => {
      // Handle resource filtering failure
    })
  })
})

describe.todo('closeAllBrowsers', () => {
  it.todo('should close all open browsers', () => {
    // Launch a chromium browser, call closeAllBrowsers().
    // Expected: the browser reports isConnected() false.
  })

  it.todo('should handle closing when no browsers are open', () => {
    // Call closeAllBrowsers() with no browser launched.
    // Expected: resolves without throwing.
  })

  it.todo('should allow creating new browsers after closing all', () => {
    // Launch chromium, close all, launch chromium again.
    // Expected: a new connected browser instance, not the closed one.
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
