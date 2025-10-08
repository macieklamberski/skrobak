# Skrobak

[![codecov](https://codecov.io/gh/macieklamberski/skrobak/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/skrobak)
[![npm version](https://img.shields.io/npm/v/skrobak.svg)](https://www.npmjs.com/package/skrobak)
[![license](https://img.shields.io/npm/l/skrobak.svg)](https://github.com/macieklamberski/skrobak/blob/main/LICENSE)

Resilient web scraper with automatic retry, proxy rotation, and strategy cascade. Supports fetch, Playwright browsers, and custom fetch implementations.

## Why Skrobak?

When scraping multiple websites, you face unpredictable challenges:

- **Unknown accessibility requirements** - You never know whether a page will be accessible through a simple HTTP fetch or if it blocks requests and requires a headless browser
- **IP-based restrictions** - Sites might block your server's IP address, requiring proxy rotation as a fallback

Skrobak solves these problems by:

- **Optimizing for cost and efficiency** - Start with the most efficient methods first (simple fetch), gradually falling back to resource-intensive options (headless browser) or paid solutions (proxies) only when necessary
- **Eliminating trial and error** - Automatically test different browser engines and proxy combinations to find which ones work, without manual intervention

Define your own list of strategies to try in order, and Skrobak automatically cascades through them until one succeeds.

## Quick Start

### Installation

```bash
npm install skrobak
```

### Usage

```typescript
import { scrape } from 'skrobak'

const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'fetch' }]
})

// When response is HTML, use Cheerio for parsing
if (result.mechanism === 'fetch') {
  const title = result.$('title').text()
  console.log(title)
}

// When response is JSON, use .json() to retrieve data
if (result.mechanism === 'fetch') {
  const data = await result.json()
  console.log(data)
}
```

## Core Concepts

### Strategy Cascade

Skrobak tries strategies in order until one succeeds. If a strategy fails, it automatically moves to the next one:

```typescript
const result = await scrape('https://example.com', {
  strategies: [
    { mechanism: 'fetch' },    // Try simple fetch first
    { mechanism: 'browser' },  // Fallback to browser if fetch fails
  ]
})
```

### Mechanisms

| Mechanism | Description |
|-----------|-------------|
| `fetch` | Fast HTTP requests with lazy-loaded Cheerio for HTML parsing |
| `browser` | Full browser rendering with Playwright (chromium/firefox/webkit) |
| `custom` | Your own fetch implementation |

## API Reference

### scrape(url, config)

Main scraping function with automatic retry and strategy cascade.

```typescript
scrape(url: string, config: ScrapeConfig): Promise<ScrapeResult>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | The URL to scrape |
| `config` | [`ScrapeConfig`](#scrapeconfig) | Configuration object |

#### Returns

`Promise<ScrapeResult>` - Result object with mechanism-specific properties. See [Return Types](#return-types).

#### Complete Configuration Example

```typescript
const result = await scrape('https://example.com', {
  // Strategy cascade - tries in order until one succeeds
  strategies: [
    { mechanism: 'fetch', useProxy: true },
    { mechanism: 'fetch', useProxy: false },
    { mechanism: 'browser' }
  ],

  // Global options applied to all strategies
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
      if (mechanism === 'fetch') return response.ok
      if (mechanism === 'browser') return response.status() === 200
      return true
    }
  },

  // Browser-specific configuration
  browser: {
    engine: 'chromium',
    waitUntil: 'networkidle',
    resources: ['document', 'script', 'xhr', 'fetch']
  },

  // Custom fetch implementation
  custom: {
    fn: async (url, options) => {
      // Your custom fetch logic
      const response = await customFetch(url, options)
      return response
    }
  }
})
```

## Configuration Reference

### ScrapeConfig

Root configuration object passed to `scrape()`. Main configuration object for the scraping operation.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `strategies` | [`ScrapeStrategy[]`](#scrapestrategy-configstrategies) | **Yes** | List of strategies to try in order |
| `options` | [`ScrapeOptions`](#scrapeoptions-configoptions) | No | Global scraping options |
| `browser` | [`BrowserConfig`](#browserconfig-configbrowser) | No | Browser-specific configuration |
| `custom` | [`CustomConfig`](#customconfig-configcustom) | No | Custom fetch function configuration |
| `hooks` | [`ScrapeHooks`](#scrapehooks-confighooks) | No | Event hooks for monitoring and logging |

### ScrapeStrategy (`config.strategies`)

Individual strategy in the cascade. Skrobak tries each strategy in order until one succeeds.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mechanism` | `'fetch'` `'browser'` `'custom'` | - | Scraping mechanism to use |
| `useProxy` | `boolean` | `false` | Whether to use proxy for this strategy |

**Example:**
```typescript
strategies: [
  { mechanism: 'fetch', useProxy: false },  // Try without proxy first (if available)
  { mechanism: 'fetch', useProxy: true },   // Fallback with proxy
  { mechanism: 'browser' }                  // Last resort: full browser
]
```

### ScrapeOptions (`config.options`)

Global options applied across all strategies.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `timeout` | `number` | - | Request timeout in milliseconds |
| `retries` | [`RetryConfig`](#retryconfig-configoptionsretries) | `{ count: 0, delay: 5000, type: 'exponential' }` | Retry configuration |
| `proxies` | `string[]` | - | Proxy pool (randomly selected per request) |
| `userAgents` | `string[]` | - | User agent pool (randomly selected per request) |
| `viewports` | [`ViewportSize[]`](#viewportsize-configoptionsviewports) | - | Viewport pool (randomly selected per request) |
| `headers` | `object` | - | HTTP headers as key-value pairs |
| `validateResponse` | [`ValidateResponse`](#validateresponse-configoptionsvalidateresponse) | - | Custom response validation function |

**Example:**
```typescript
options: {
  timeout: 30000,
  retries: { count: 3, delay: 2000, type: 'exponential' },
  proxies: ['http://proxy1.com:8080', 'http://proxy2.com:8080'],
  userAgents: ['Mozilla/5.0...'],
  headers: { 'Accept-Language': 'en-US' }
}
```

### RetryConfig (`config.options.retries`)

Controls retry behavior when requests fail.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `count` | `number` | `0` | Number of retry attempts |
| `delay` | `number` | `5000` | Base delay between retries in milliseconds |
| `type` | `'exponential'` `'linear'` `'constant'` | `'exponential'` | Retry delay calculation strategy |

**Retry delay calculation:**
- `exponential`: (1000ms → 2000ms → 4000ms)
- `linear`: (1000ms → 2000ms → 3000ms)
- `constant`: (1000ms → 1000ms → 1000ms)

**Example:**
```typescript
retries: {
  count: 3,
  delay: 2000,
  type: 'exponential'
}
// Results in delays: 2000ms, 4000ms, 8000ms
```

### ViewportSize (`config.options.viewports`)

Viewport dimensions for browser-based scraping.

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Viewport width in pixels |
| `height` | `number` | Viewport height in pixels |

**Example:**
```typescript
viewports: [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 }
]
```

### ValidateResponse (`config.options.validateResponse`)

Custom validation function to verify response before accepting it.

**Type:** `(context) => boolean`

Function receives a context object with `mechanism` and `response` properties. Return `true` to accept the response, `false` to retry or move to the next strategy.

**Example:**
```typescript
validateResponse: ({ mechanism, response }) => {
  if (mechanism === 'fetch') {
    return response.status === 200 && response.headers.get('content-type')?.includes('json')
  }

  if (mechanism === 'browser') {
    return response.status() === 200
  }

  return true
}
```

### BrowserConfig (`config.browser`)

Browser-specific configuration for the `browser` mechanism.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `engine` | `'chromium'` `'firefox'` `'webkit'` | `'chromium'` | Browser engine to use |
| `resources` | [`ResourceType[]`](#resourcetype-configbrowserresources) | - (allows all) | Allowed resource types (blocks all others) |
| `waitUntil` | `'load'` `'domcontentloaded'` `'networkidle'` `'commit'` | - | When to consider navigation successful |

**Example:**
```typescript
browser: {
  engine: 'chromium',
  waitUntil: 'networkidle',
  resources: ['document', 'script', 'xhr', 'fetch']
}
```

### ResourceType (`config.browser.resources`)

Types of resources that can be loaded by the browser. When specified, all other resource types are blocked.

**Type:** Playwright's `ResourceType` (string)

**Common values:** `'document'` `'stylesheet'` `'image'` `'script'` `'xhr'` `'fetch'`

See [Playwright's ResourceType](https://playwright.dev/docs/api/class-request#request-resource-type) for all available options.

**Example:**
```typescript
// Only allow essential resources, block images/CSS for faster loading
resources: ['document', 'script', 'xhr', 'fetch']
```

### CustomConfig (`config.custom`)

Configuration for custom fetch implementation when using `mechanism: 'custom'`.

| Property | Type | Description |
|----------|------|-------------|
| `fn` | `(url, options) => Promise<TCustomResponse>` | Custom fetch function |

**Function parameters:**
- `url` (string): The URL to fetch
- `options` (object): Request options composed from global config
  - `proxy?` (string): Proxy URL (when `useProxy: true`)
  - `userAgent?` (string): User agent string
  - `viewport?` (object): Viewport dimensions with `width` and `height`
  - `headers?` (object): HTTP headers as key-value pairs
  - `timeout?` (number): Request timeout in milliseconds

**Example:** See [Custom Fetch Function](#custom-fetch-function) example.

### ScrapeHooks (`config.hooks`)

Event hooks for monitoring scraping progress, logging, metrics, or debugging. All hooks are optional.

| Property | Type | Description |
|----------|------|-------------|
| `onRetryAttempt` | `(context) => void` | Called when a retry attempt fails |
| `onRetryExhausted` | `(context) => void` | Called when all retry attempts are exhausted |
| `onStrategyFailed` | `(context) => void` | Called when a strategy fails |
| `onAllStrategiesFailed` | `(context) => void` | Called when all strategies fail |

#### onRetryAttempt

**Context object:**
```typescript
{
  error: unknown              // The error that occurred
  attempt: number             // Current attempt number (1-indexed)
  maxAttempts: number         // Total number of attempts
  nextRetryDelay: number      // Delay before next retry in ms
  retryConfig: RetryConfig    // Retry configuration
}
```

#### onRetryExhausted

**Context object:**
```typescript
{
  error: unknown              // The final error
  totalAttempts: number       // Total number of attempts made
  retryConfig: RetryConfig    // Retry configuration
}
```

#### onStrategyFailed

**Context object:**
```typescript
{
  error: unknown              // The error that occurred
  strategy: ScrapeStrategy    // The strategy that failed
  strategyIndex: number       // Index of failed strategy (0-indexed)
  totalStrategies: number     // Total number of strategies
}
```

#### onAllStrategiesFailed

**Context object:**
```typescript
{
  lastError: unknown          // The last error encountered
  strategies: Array<ScrapeStrategy>  // All strategies that were tried
  totalAttempts: number       // Number of strategies attempted
}
```

**Example:**
```typescript
const result = await scrape('https://example.com', {
  strategies: [
    { mechanism: 'fetch', useProxy: true },
    { mechanism: 'browser' }
  ],
  options: {
    retries: { count: 3, delay: 1000, type: 'exponential' }
  },
  hooks: {
    onRetryAttempt: ({ attempt, maxAttempts, nextRetryDelay, error }) => {
      console.log(`Retry ${attempt}/${maxAttempts} failed, waiting ${nextRetryDelay}ms`)
      console.error('Error:', error)
    },
    onRetryExhausted: ({ totalAttempts }) => {
      console.log(`All ${totalAttempts} retries exhausted`)
    },
    onStrategyFailed: ({ strategy, strategyIndex, totalStrategies }) => {
      console.log(`Strategy ${strategyIndex + 1}/${totalStrategies} (${strategy.mechanism}) failed`)
    },
    onAllStrategiesFailed: ({ strategies }) => {
      console.error(`All ${strategies.length} strategies failed`)
    }
  }
})
```

## Return Types

The result of `scrape()` depends on which mechanism succeeded. Use the `mechanism` property to determine the type.

### ScrapeResultFetch

**When:** `mechanism: 'fetch'` strategy succeeds

| Property | Type | Description |
|----------|------|-------------|
| `mechanism` | `'fetch'` | Indicates fetch mechanism was used |
| `response` | `Response` | Standard fetch Response object |
| `$` | `CheerioAPI` | Lazy-loaded Cheerio instance for HTML parsing |

**Example:**
```typescript
if (result.mechanism === 'fetch') {
  const title = result.$('title').text()
  const links = result.$('a').map((_, element) => result.$(element).attr('href')).get()
}
```

### ScrapeResultBrowser

**When:** `mechanism: 'browser'` strategy succeeds

| Property | Type | Description |
|----------|------|-------------|
| `mechanism` | `'browser'` | Indicates browser mechanism was used |
| `response` | `PlaywrightResponse` | Playwright Response object |
| `page` | `Page` | Playwright Page instance for interaction |
| `cleanup` | `() => Promise<void>` | Function to close browser context (must be called) |

**Example:**
```typescript
if (result.mechanism === 'browser') {
  await result.page.screenshot({ path: 'screenshot.png' })

  const text = await result.page.textContent('h1')

  // Important: cleanup resources after use to avoid memory leaks
  await result.cleanup()
}
```

### ScrapeResultCustom

**When:** `mechanism: 'custom'` strategy succeeds

| Property | Type | Description |
|----------|------|-------------|
| `mechanism` | `'custom'` | Indicates custom mechanism was used |
| `response` | `TCustomResponse` | Your custom response type |

**Example:**
```typescript
if (result.mechanism === 'custom') {
  // Your custom response type
  console.log(result.response)
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
  // Important: cleanup resources after use to avoid memory leaks
  await result.cleanup()
}
```

### Basic Custom Fetch

```typescript
import axios from 'axios'

const result = await scrape('https://api.example.com/data', {
  strategies: [{ mechanism: 'custom' }],
  custom: {
    fn: async (url, options) => {
      // Use any HTTP client: axios, got, ofetch, etc.
      const response = await axios.get(url, {
        headers: options.headers,
        timeout: options.timeout,
        proxy: options.proxy ? { host: options.proxy } : undefined
      })
      return response.data
    }
  }
})

if (result.mechanism === 'custom') {
  console.log(result.response) // Your custom response data
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
    // Only allow these
    resources: ['document', 'script', 'xhr', 'fetch']
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

### Monitoring with Hooks

```typescript
const result = await scrape('https://example.com', {
  strategies: [
    { mechanism: 'fetch', useProxy: true },
    { mechanism: 'browser' }
  ],
  options: {
    retries: { count: 3, delay: 1000, type: 'exponential' }
  },
  hooks: {
    onRetryAttempt: ({ attempt, maxAttempts, nextRetryDelay }) => {
      console.log(`Retry ${attempt}/${maxAttempts}, waiting ${nextRetryDelay}ms`)
    },
    onStrategyFailed: ({ strategy, strategyIndex, totalStrategies }) => {
      console.log(`Strategy ${strategyIndex + 1}/${totalStrategies} failed: ${strategy.mechanism}`)
    }
  }
})
```

### Custom Fetch Function

```typescript
import { ofetch } from 'ofetch'

const result = await scrape('https://example.com', {
  strategies: [{ mechanism: 'custom' }],
  custom: {
    fn: async (url, options) => {
      const response = await ofetch(url, {
        headers: options.headers,
        timeout: options.timeout
      })

      return { data: response }
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
    { mechanism: 'fetch', useProxy: true },   // Try with proxy first
    { mechanism: 'fetch', useProxy: false },  // Fallback to no proxy
    { mechanism: 'browser' }                  // Last resort: full browser
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
  const products = result.$('.product').map((_, element) => ({
    title: result.$(element).find('.title').text(),
    price: result.$(element).find('.price').text()
  })).get()
}

if (result.mechanism === 'browser') {
  const products = await result.page.$$eval('.product', (elements) =>
    elements.map((element) => ({
      title: element.querySelector('.title')?.textContent,
      price: element.querySelector('.price')?.textContent
    }))
  )

  // Important: cleanup resources after use to avoid memory leaks
  await result.cleanup()
}
```

## License

Licensed under the MIT license.<br/>
Copyright 2025 Maciej Lamberski
