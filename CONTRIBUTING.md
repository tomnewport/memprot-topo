# Contributing to MemProt2D

Thank you for your interest in contributing to MemProt2D. This document explains how to get started, the branch and commit conventions we follow, and what to include in a pull request.

## Branch Strategy

We use feature branches merged into `main` via pull requests. The `main` branch is always deployable and protected — direct pushes are not permitted. Create a branch named after the feature or fix you are working on (e.g. `feat/helix-renderer` or `fix/parser-edge-case`), open a PR when ready, and request a review.

## Commit Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow the format:

```
<type>(<optional scope>): <short description>
```

Common types:

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `chore`    | Build process, tooling, or dependency updates           |
| `docs`     | Documentation only changes                              |
| `test`     | Adding or updating tests                                |
| `refactor` | Code change that neither fixes a bug nor adds a feature |

For breaking changes, add `BREAKING CHANGE:` in the commit body or append `!` after the type, e.g. `feat!: redesign public API`.

Examples:

```
feat(parser): add mmCIF support
fix(renderer): correct helix curvature at terminal residues
chore: update vite to 5.3.0
docs: add CDN embed example to README
test(parser): add edge-case coverage for malformed PDB files
refactor(orientation): simplify hydrophobicity scoring
```

Commit messages are validated automatically by commitlint via a Husky pre-commit hook.

## Running Tests

```bash
# Run all unit tests once
npm test

# Run with coverage report
npm run test:coverage

# Run end-to-end tests (requires Playwright browsers installed)
npx playwright install --with-deps chromium
npm run test:e2e
```

## Running Linting and Formatting

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Format all files
npm run format

# Check formatting without writing
npm run format:check
```

## Pull Request Checklist

Before opening a PR, please confirm:

- [ ] All tests pass (`npm test`)
- [ ] Coverage has not decreased
- [ ] Lint and format checks pass (`npm run lint && npm run format:check`)
- [ ] Commit messages follow Conventional Commits
- [ ] The PR description explains _what_ changed and _why_
- [ ] AI assistance (if any) is disclosed in the PR description
