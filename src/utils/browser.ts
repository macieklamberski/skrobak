import type { Browser, BrowserContext, BrowserContextOptions, BrowserType, Page } from 'playwright'
import { chromium, firefox, type PlaywrightExtraClass, webkit } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { BrowserConfig, BrowserEngine, ResourceType } from '../types/browser.js'
import type { RequestOptions } from '../types/index.js'

const browsers = new Map<BrowserEngine, Browser>()

export const getBrowser = async (engine: BrowserEngine): Promise<Browser> => {
  const existingBrowser = browsers.get(engine)

  if (existingBrowser) {
    return existingBrowser
  }

  let browserEngine: PlaywrightExtraClass & BrowserType

  switch (engine) {
    case 'chromium':
      browserEngine = chromium
      break
    case 'firefox':
      browserEngine = firefox
      break
    case 'webkit':
      browserEngine = webkit
      break
  }

  browserEngine.use(StealthPlugin())

  const newBrowser = await browserEngine.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  })

  browsers.set(engine, newBrowser)

  return newBrowser
}

export const createContext = async (
  browser: Browser,
  options: RequestOptions,
): Promise<BrowserContext> => {
  const contextOptions: BrowserContextOptions = {}

  if (options.proxy) {
    contextOptions.proxy = {
      server: options.proxy,
    }
  }

  if (options.userAgent) {
    contextOptions.userAgent = options.userAgent
  }

  if (options.viewport) {
    contextOptions.viewport = options.viewport
  }

  return browser.newContext(contextOptions)
}

export const allowListedResources = async (
  page: Page,
  resources: Array<ResourceType>,
): Promise<void> => {
  await page.route('**/*', (route) => {
    const request = route.request()
    const resourceType = request.resourceType()

    if (resources.includes(resourceType as ResourceType)) {
      return route.continue()
    }

    return route.abort()
  })
}

export const createPage = async (
  browserOrContext: Browser | BrowserContext,
  config: BrowserConfig,
  requestOptions?: RequestOptions,
): Promise<Page> => {
  const page = await browserOrContext.newPage()

  if (requestOptions?.headers) {
    await page.setExtraHTTPHeaders(requestOptions.headers)
  }

  if (config.resources?.length) {
    await allowListedResources(page, config.resources)
  }

  return page
}

export const closeAllBrowsers = async (): Promise<void> => {
  for (const browser of browsers.values()) {
    await browser.close()
  }

  browsers.clear()
}
