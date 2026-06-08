import type { LintInput, LintResult, LintRule } from './types';

const RULES: LintRule[] = [];

export function lint(input: LintInput): LintResult[] {
  return RULES.flatMap((rule) => rule(input));
}

export { RULES };
export type { LintInput, LintResult, LintRule } from './types';
