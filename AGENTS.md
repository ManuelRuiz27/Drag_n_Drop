# Project Guidelines

## Coding Standards
- Use Prettier for formatting to maintain consistent code style across the project.
- Enforce linting rules with ESLint; resolve all lint warnings and errors before committing.

## Branching Strategy
- Create feature branches for all new work; branch names should reflect the feature or fix being developed.
- Submit code for review before merging; at least one approving review is required.
- Merge into `main` only after the full CI pipeline succeeds.

## Working with Codex
- When tagging a task with `@codex`, expect Codex to:
  - Generate the required code changes in its sandbox environment.
  - Run the project tests to validate the changes.
  - Commit the changes within the sandbox before handing off for review.

## Testing Guidelines
- Write unit tests using React Testing Library for UI components.
- Continuous integration runs `npm test` and `npm run lint`; ensure both commands pass locally before pushing.
