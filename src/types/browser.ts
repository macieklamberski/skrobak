export type BrowserEngine = 'chromium' | 'firefox' | 'webkit'

export type ResourceType =
  | 'document'
  | 'stylesheet'
  | 'image'
  | 'media'
  | 'font'
  | 'script'
  | 'texttrack'
  | 'xhr'
  | 'fetch'
  | 'eventsource'
  | 'websocket'
  | 'manifest'
  | 'other'

export type WaitUntilType = 'load' | 'domcontentloaded' | 'networkidle' | 'commit'

export type BrowserConfig = {
  engine?: BrowserEngine
  resources?: Array<ResourceType>
  waitUntil?: WaitUntilType
}
