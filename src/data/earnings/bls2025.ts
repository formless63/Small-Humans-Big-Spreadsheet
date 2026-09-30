import { derived, sourced } from '../provenance'
export const weeklyEarnings2025 = {
  weeklyHighSchool: sourced(966, '2025 high-school attainment weekly median', [
    'SRC-BLS-EDUCATION-2025',
  ]),
  weeklyAssociate: sourced(1135, '2025 associate’s attainment weekly median', [
    'SRC-BLS-EDUCATION-2025',
  ]),
  weeklyBachelor: sourced(1578, '2025 bachelor’s attainment weekly median', [
    'SRC-BLS-EDUCATION-2025',
  ]),
  weeklyMaster: sourced(1876, '2025 master’s attainment weekly median', ['SRC-BLS-EDUCATION-2025']),
}
export const earnings2025 = {
  highSchool: derived(
    50232,
    'High-school attainment median ×52; descriptive benchmark',
    '966 × 52',
    ['weeklyHighSchool'],
    ['SRC-BLS-EDUCATION-2025'],
  ),
  associate: derived(
    59020,
    'Associate’s attainment median ×52; descriptive benchmark',
    '1135 × 52',
    ['weeklyAssociate'],
    ['SRC-BLS-EDUCATION-2025'],
  ),
  bachelor: derived(
    82056,
    'Bachelor’s attainment median ×52; descriptive benchmark',
    '1578 × 52',
    ['weeklyBachelor'],
    ['SRC-BLS-EDUCATION-2025'],
  ),
  master: derived(
    97552,
    'Master’s attainment median ×52; descriptive benchmark',
    '1876 × 52',
    ['weeklyMaster'],
    ['SRC-BLS-EDUCATION-2025'],
  ),
  electrician: sourced(63190, 'Electrician occupational median; May 2025', [
    'SRC-BLS-ELECTRICIAN-2025',
  ]),
  hvac: sourced(61010, 'HVAC occupational median; May 2025', ['SRC-BLS-HVAC-2025']),
}
