import type { Response as PlaywrightResponse } from 'playwright'

export type ValidateResponse<TCustomResponse> = (
  context:
    | { mechanism: 'fetch'; response: Response }
    | { mechanism: 'browser'; response: PlaywrightResponse }
    | { mechanism: 'custom'; response: TCustomResponse },
) => boolean
