# Skrobak

[![codecov](https://codecov.io/gh/macieklamberski/skrobak/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/skrobak)
[![npm version](https://img.shields.io/npm/v/skrobak.svg)](https://www.npmjs.com/package/skrobak)
[![license](https://img.shields.io/npm/l/skrobak.svg)](https://github.com/macieklamberski/skrobak/blob/main/LICENSE)

Resilient web scraping with automatic retry, proxy rotation, and strategy cascade. Supports fetch, Playwright browsers, and custom mechanisms.

## Installation

```bash
bun add skrobak
```

## Quick Start

```typescript
import { scrape } from 'skrobak'

// Simple fetch with Cheerio
const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'fetch' }]
})

if (result.mechanism === 'fetch') {
  const title = result.$('title').text()
  console.log(title)
}
```

## Core Concepts

### Strategy Cascade

Skrobak tries strategies in order until one succeeds. If a strategy fails, it automatically moves to the next one:

```typescript
const result = await scrape('https://example.com', {
  strategies: [
    { mechanism: 'fetch' },           // Try simple fetch first
    { mechanism: 'browser' },          // Fallback to browser if fetch fails
  ]
})
```

### Mechanisms

**fetch** - Fast HTTP requests with Cheerio for HTML parsing
**browser** - Full browser rendering with Playwright (chromium/firefox/webkit)
**custom** - Your own fetch implementation

## API Reference

### scrape(url, config)

Main scraping function with automatic retry and strategy cascade.

```typescript
scrape<TCustomResponse = unknown>(
  url: string,
  config: ScrapeConfig<TCustomResponse>
): Promise<ScrapeResult<TCustomResponse>>
```

### Configuration Options

#### ScrapeConfig

```typescript
{
  strategies: Array<ScrapeStrategy>  // Required: List of strategies to try
  options?: ScrapeOptions            // Optional: Global options
  browser?: BrowserConfig            // Optional: Browser-specific config
  fetch?: FetchConfig                // Optional: Custom fetch function
}
```

#### ScrapeStrategy

```typescript
{
  mechanism: 'fetch' | 'browser' | 'custom'
  useProxy?: boolean                 // Default: false
}
```

#### ScrapeOptions

```typescript
{
  timeout?: number                   // Request timeout in ms
  retries?: RetryConfig              // Retry configuration
  proxies?: Array<string>            // Proxy pool (randomly selected)
  userAgents?: Array<string>         // User agent pool (randomly selected)
  viewports?: Array<ViewportSize>    // Viewport pool (randomly selected)
  headers?: Record<string, string>   // HTTP headers
  validateResponse?: ValidateResponse // Custom validation function
}
```

#### RetryConfig

```typescript
{
  count?: number                     // Number of retries (default: 0)
  delay?: number                     // Base delay in ms (default: 5000)
  type?: 'exponential' | 'linear' | 'constant'  // Default: 'exponential'
}
```

**Retry Types:**
- `exponential`: delay × 2^attempt (1000ms → 2000ms → 4000ms)
- `linear`: delay × (attempt + 1) (1000ms → 2000ms → 3000ms)
- `constant`: delay (1000ms → 1000ms → 1000ms)

#### BrowserConfig

```typescript
{
  engine?: 'chromium' | 'firefox' | 'webkit'  // Default: 'chromium'
  resources?: Array<ResourceType>    // Resource types to allow (blocks others)
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}
```

**ResourceType:** `'document' | 'stylesheet' | 'image' | 'media' | 'font' | 'script' | 'texttrack' | 'xhr' | 'fetch' | 'eventsource' | 'websocket' | 'manifest' | 'other'`

#### ValidateResponse

Custom validation function to verify response before accepting:

```typescript
(context:
  | { mechanism: 'fetch'; response: Response }
  | { mechanism: 'browser'; response: PlaywrightResponse }
  | { mechanism: 'custom'; response: TCustomResponse }
) => boolean
```

### Return Types

#### ScrapeResultFetch

```typescript
{
  mechanism: 'fetch'
  response: Response                 // Standard fetch Response
  $: CheerioAPI                      // Lazy-loaded Cheerio instance
}
```

#### ScrapeResultBrowser

```typescript
{
  mechanism: 'browser'
  response: PlaywrightResponse       // Playwright Response
  page: Page                         // Playwright Page instance
  cleanup: () => Promise<void>       // Call to close browser context
}
```

#### ScrapeResultCustom

```typescript
{
  mechanism: 'custom'
  response: TCustomResponse          // Your custom response type
}
```

## Examples

### Basic Fetch

```typescript
const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'fetch' }]
})

if (result.mechanism === 'fetch') {
  const links = result.$('a').map((_, el) => result.$(el).attr('href')).get()
}
```

### Browser with Custom Viewport

```typescript
const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'browser' }],
  options: {
    viewports: [{ width: 1920, height: 1080 }]
  },
  browser: {
    engine: 'chromium',
    waitUntil: 'networkidle'
  }
})

if (result.mechanism === 'browser') {
  await result.page.screenshot({ path: 'screenshot.png' })
  await result.cleanup()  // Important: clean up browser context
}
```

### Proxy Rotation with Retry

```typescript
const result = await scrape('https://example.com', {
  strategies: [
    { mechanism: 'fetch', useProxy: true }
  ],
  options: {
    proxies: [
      'http://proxy1.example.com:8080',
      'http://proxy2.example.com:8080'
    ],
    retries: {
      count: 3,
      delay: 2000,
      type: 'exponential'
    }
  }
})
```

### Custom User Agents

```typescript
const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'fetch' }],
  options: {
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    ]
  }
})
```

### Block Images and Media

```typescript
const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'browser' }],
  browser: {
    resources: ['document', 'script', 'xhr', 'fetch']  // Only allow these
  }
})

if (result.mechanism === 'browser') {
  // Images and media are blocked, page loads faster
  await result.cleanup()
}
```

### Response Validation

```typescript
const result = await scrape('https://api.example.com/data', {
  strategies: [{ mechanism: 'fetch' }],
  options: {
    validateResponse: ({ mechanism, response }) => {
      if (mechanism === 'fetch') {
        return response.status === 200 && response.headers.get('content-type')?.includes('json')
      }
      return true
    },
    retries: { count: 3, delay: 1000 }
  }
})
```

### Custom Fetch Function

```typescript
import { ofetch } from 'ofetch'

type CustomResponse = { data: string; headers: Record<string, string> }

const result = await scrape<CustomResponse>('https://example.com', {
  strategies: [{ mechanism: 'custom' }],
  fetch: {
    fn: async (url, options) => {
      const response = await ofetch(url, {
        headers: options.headers,
        timeout: options.timeout
      })
      return { data: response, headers: {} }
    }
  }
})

if (result.mechanism === 'custom') {
  console.log(result.response.data)
}
```

### Strategy Cascade with Fallback

```typescript
const result = await scrape('https://example.com', {
  strategies: [
    { mechanism: 'fetch', useProxy: true },    // Try with proxy first
    { mechanism: 'fetch', useProxy: false },   // Fallback to no proxy
    { mechanism: 'browser' }                    // Last resort: full browser
  ],
  options: {
    proxies: ['http://proxy.example.com:8080'],
    retries: { count: 2, delay: 1000 }
  }
})
```

### Complete Example

```typescript
const result = await scrape('https://example.com/products', {
  strategies: [
    { mechanism: 'fetch', useProxy: true },
    { mechanism: 'browser' }
  ],
  options: {
    timeout: 30000,
    retries: {
      count: 3,
      delay: 2000,
      type: 'exponential'
    },
    proxies: [
      'http://proxy1.example.com:8080',
      'http://proxy2.example.com:8080'
    ],
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ],
    headers: {
      'Accept-Language': 'en-US,en;q=0.9'
    },
    validateResponse: ({ mechanism, response }) => {
      if (mechanism === 'fetch') {
        return response.ok
      }
      if (mechanism === 'browser') {
        return response.status() === 200
      }
      return true
    }
  },
  browser: {
    engine: 'chromium',
    waitUntil: 'networkidle',
    resources: ['document', 'script', 'xhr', 'fetch']
  }
})

if (result.mechanism === 'fetch') {
  const products = result.$('.product').map((_, el) => ({
    title: result.$(el).find('.title').text(),
    price: result.$(el).find('.price').text()
  })).get()
} else if (result.mechanism === 'browser') {
  const products = await result.page.$$eval('.product', (elements) =>
    elements.map(el => ({
      title: el.querySelector('.title')?.textContent,
      price: el.querySelector('.price')?.textContent
    }))
  )
  await result.cleanup()
}
```

## Utilities

### closeAllBrowsers()

Closes all cached browser instances. Useful for cleanup in tests or when shutting down:

```typescript
import { closeAllBrowsers } from 'skrobak'

await closeAllBrowsers()
```

## TypeScript

Full TypeScript support with detailed types for all configuration options and return values.

```typescript
import type {
  ScrapeConfig,
  ScrapeStrategy,
  ScrapeOptions,
  ScrapeResult,
  BrowserConfig,
  RetryConfig
} from 'skrobak'
```

## License

MIT © Maciej Lamberski
