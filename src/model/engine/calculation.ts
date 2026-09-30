import type { Scenario } from '../../scenarios/schema'
import { compareStrategies, familyCases, sensitivityCases } from './compare'
export function calculatePlan(scenario: Scenario) {
  return {
    scenario,
    results: compareStrategies(scenario),
    sensitivity: scenario.sensitivityEnabled ? sensitivityCases(scenario) : [],
    family: scenario.siblingBirthDates.length ? familyCases(scenario) : [],
  }
}
export type PlanCalculation = ReturnType<typeof calculatePlan>
