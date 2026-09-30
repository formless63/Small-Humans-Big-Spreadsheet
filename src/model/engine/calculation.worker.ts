import type { Scenario } from '../../scenarios/schema'
import { calculatePlan } from './calculation'

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<Scenario>) => void) | null
  postMessage: (result: unknown) => void
}
workerScope.onmessage = ({ data }) => {
  try {
    workerScope.postMessage({ calculation: calculatePlan(data) })
  } catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : 'Calculation failed',
    })
  }
}
