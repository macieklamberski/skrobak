import type { ProxyAgent } from 'undici'

export type FetchOptions = RequestInit & {
  proxy?: string
  dispatcher?: ProxyAgent
}
