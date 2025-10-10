export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const randomSleep = (minMs: number, maxMs: number): Promise<void> => {
  const range = maxMs - minMs
  const random = Math.random()
  const delay = Math.floor(minMs + range * random * random)

  return sleep(delay)
}
