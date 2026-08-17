export type ValidationIssue = {
  check: string;
  message: string;
};

export function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues.map((issue) => `[${issue.check}] ${issue.message}`).join("\n");
}
