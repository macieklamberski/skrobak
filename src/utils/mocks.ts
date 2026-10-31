import { FetchInterceptor } from '@mswjs/interceptors/fetch/web'
import type { AnyHandler } from 'msw'
import { defineNetwork, InterceptorSource, type NetworkApi } from 'msw/experimental'

type SetupNetwork = (...handlers: Array<AnyHandler>) => NetworkApi<Array<InterceptorSource>>

// The msw/node server intercepts fetch at the node:net socket layer, which Bun's native fetch
// bypasses. The web interceptor patches the global fetch instead.
export const setupNetwork: SetupNetwork = (...handlers) => {
  return defineNetwork({
    // @ts-expect-error The browser build types its Interceptor apart from the one msw expects.
    sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
    handlers,
    onUnhandledFrame: 'error',
  })
}
