import type { Response as PlaywrightResponse } from 'playwright'

export type ValidateResponseContext<TCustomResponse = unknown> =
  | { mechanism: 'fetch'; response: Response }
  | { mechanism: 'browser'; response: PlaywrightResponse }
  | { mechanism: 'custom'; response: TCustomResponse }

export type ValidateResponse<TCustomResponse = unknown> = (
  context: ValidateResponseContext<TCustomResponse>,
) => boolean
