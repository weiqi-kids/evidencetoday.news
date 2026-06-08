import type { LintInput, LintResult, LintRule } from './types';
import { descriptionLengthRule } from './rules/description-length';
import { phantomImageRule } from './rules/phantom-image';

const RULES: LintRule[] = [descriptionLengthRule, phantomImageRule];

export function lint(input: LintInput): LintResult[] {
  return RULES.flatMap((rule) => rule(input));
}

export { RULES };
export type { LintInput, LintResult, LintRule } from './types';
