import { sourced } from '../provenance'
export const nyRules2026 = {
  individualDeduction: sourced(5000, 'NY individual 529 contribution subtraction', [
    'SRC-NY-IT201',
  ]),
  jointDeduction: sourced(10000, 'NY joint-filer 529 contribution subtraction', ['SRC-NY-IT201']),
}
