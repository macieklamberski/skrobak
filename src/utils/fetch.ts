import { ProxyAgent } from 'undici'
import type { FetchOptions } from '../types/fetch.js'

export const isBunRuntime = (): boolean => {
  return !!process.versions.bun
}

export const composeFetchOptions = (
  headers: Headers,
  signal?: AbortSignal,
  proxy?: string,
): FetchOptions => {
  const options: FetchOptions = { headers, signal }

  if (proxy) {
    if (isBunRuntime()) {
      options.proxy = proxy
    } else {
      options.dispatcher = new ProxyAgent(proxy)
    }
  }

  return options
}
