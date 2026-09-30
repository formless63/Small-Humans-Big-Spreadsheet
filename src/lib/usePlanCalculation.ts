import { useEffect, useMemo, useState } from 'react'
import type { PlanCalculation } from '../model/engine/calculation'
import PlanWorker from '../model/engine/calculation.worker?worker&inline'
import type { Scenario } from '../scenarios/schema'
export function usePlanCalculation(scenario: Scenario) {
  const key = useMemo(() => JSON.stringify(scenario), [scenario])
  const [state, setState] = useState<{ key: string; calculation: PlanCalculation } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const worker = new PlanWorker()
    let current = true
    setError('')
    worker.onmessage = ({ data }: { data: { calculation?: PlanCalculation; error?: string } }) => {
      if (!current) return
      if (data.error) setError(data.error)
      else if (data.calculation) setState({ key, calculation: data.calculation })
    }
    worker.onerror = () => {
      if (current) setError('The calculation could not finish. Reload this page and try again.')
    }
    worker.postMessage(JSON.parse(key))
    return () => {
      current = false
      worker.terminate()
    }
  }, [key])
  return { calculation: state?.calculation, pending: state?.key !== key, error }
}
