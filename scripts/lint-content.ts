import { formatContentLintIssues, lintContent } from '../src/lib/content-lint';

const issues = await lintContent();
const output = formatContentLintIssues(issues);

if (issues.length > 0) {
  console.error(output);
  process.exit(1);
}

console.log(output);
