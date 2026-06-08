export type LintLevel = 'error' | 'warn' | 'info';

export type LintResult = {
  level: LintLevel;
  field?: string;
  message: string;
  fix?: string;
};

export type LintInput = {
  collection: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export type LintRule = (input: LintInput) => LintResult[];
