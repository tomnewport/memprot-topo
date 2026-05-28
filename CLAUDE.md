# Project conventions

## Pull requests
- **Always link related issues.** Every PR description must reference the issue(s) it
  addresses. Use a GitHub closing keyword when the PR fully resolves the issue
  (e.g. `Closes #123`, `Fixes #123`, `Resolves #123`); use `Refs #123` /
  `Related to #123` when the PR is related but does not close it.
- If no issue exists for the work, say so explicitly in the PR description rather
  than leaving the linkage blank.

## Branch naming
- **Give development branches meaningful, descriptive names.** Use the form
  `<type>/<short-description>`, optionally with an issue number, e.g.
  `feat/topology-prediction`, `fix/membrane-orientation-123`,
  `docs/api-reference`.
- Prefer `type/` prefixes such as `feat`, `fix`, `docs`, `refactor`, `test`, or
  `chore`. Use lowercase words separated by hyphens; keep names concise but
  self-explanatory.
- Avoid opaque or auto-generated names that don't describe the work.
