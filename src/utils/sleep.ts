import { sleep } from 'trousse'

export const randomSleep = (minMs: number, maxMs: number): Promise<void> => {
  const range = maxMs - minMs
  const random = Math.random()
  const delay = Math.floor(minMs + range * random * random)

  return sleep(delay)
}
