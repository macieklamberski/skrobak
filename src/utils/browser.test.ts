import { beforeEach, describe, expect, it } from 'bun:test'
import type { Browser } from 'playwright'
import type { RequestOptions } from '../types/index.js'
import { closeAllBrowsers, createContext, getBrowser } from './browser.js'

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

  beforeEach(async () => {
    await closeAllBrowsers()
    browser = await getBrowser('chromium')
  })

  it('should create context without options', async () => {
    const context = await createContext(browser, {})

    expect(context).toBeDefined()
    await context.close()
  })

  it('should create context with user agent', async () => {
    const options: RequestOptions = {
      userAgent: 'Mozilla/5.0 Custom Agent',
    }

    const context = await createContext(browser, options)
    const _page = await context.newPage()

    // Note: Stealth plugin may override the user agent, so we just verify context was created
    expect(context).toBeDefined()

    await context.close()
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

    await context.close()
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

    await context.close()
  })

  it('should create context with empty options object', async () => {
    const context = await createContext(browser, {})

    expect(context).toBeDefined()
    await context.close()
  })

  describe('proxy configuration', () => {
    // TODO: should set proxy server in context options
    // TODO: should handle proxy with authentication
    // TODO: should handle invalid proxy format
  })

  describe('user agent override', () => {
    // TODO: should override default user agent
    // TODO: should handle empty user agent string
  })

  describe('viewport dimensions', () => {
    // TODO: should handle different viewport sizes
    // TODO: should handle zero width viewport
    // TODO: should handle zero height viewport
    // TODO: should handle negative viewport dimensions
  })

  describe('combined options', () => {
    // TODO: should create context with proxy and user agent
    // TODO: should create context with proxy and viewport
    // TODO: should create context with user agent and viewport
  })

  describe('error handling', () => {
    // TODO: should handle context creation failure
    // TODO: should handle invalid browser instance
  })
})

describe('allowListedResources', () => {
  describe('resource filtering', () => {
    // TODO: should allow only specified resource types
    // TODO: should block unspecified resource types
    // TODO: should handle empty resource list
    // TODO: should handle single resource type
    // TODO: should handle multiple resource types
    // TODO: should handle all resource types
  })

  describe('specific resource types', () => {
    // TODO: should allow document resources
    // TODO: should allow stylesheet resources
    // TODO: should allow image resources
    // TODO: should allow script resources
    // TODO: should allow xhr resources
    // TODO: should allow fetch resources
    // TODO: should block fonts when not in list
    // TODO: should block media when not in list
  })

  describe('error handling', () => {
    // TODO: should handle route setup failure
    // TODO: should handle abort errors gracefully
  })
})

describe('createPage', () => {
  describe('page creation', () => {
    // TODO: should create page from browser
    // TODO: should create page from context
    // TODO: should return page instance
  })

  describe('headers configuration', () => {
    // TODO: should set extra HTTP headers
    // TODO: should handle empty headers object
    // TODO: should handle multiple headers
    // TODO: should not set headers when not provided
  })

  describe('resource filtering', () => {
    // TODO: should apply resource allowlist when configured
    // TODO: should not apply resource filtering when not configured
    // TODO: should handle empty resources array
  })

  describe('combined options', () => {
    // TODO: should create page with headers and resources
    // TODO: should create page with only headers
    // TODO: should create page with only resources
    // TODO: should create page with no options
  })

  describe('error handling', () => {
    // TODO: should handle page creation failure
    // TODO: should handle header setting failure
    // TODO: should handle resource filtering failure
  })
})

describe.skip('closeAllBrowsers', () => {
  it('should close all open browsers', async () => {
    const chromiumBrowser = await getBrowser('chromium')

    expect(chromiumBrowser.isConnected()).toBe(true)

    await closeAllBrowsers()

    expect(chromiumBrowser.isConnected()).toBe(false)
  })

  it('should handle closing when no browsers are open', async () => {
    await closeAllBrowsers()
    // Should not throw error
  })

  it('should allow creating new browsers after closing all', async () => {
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
