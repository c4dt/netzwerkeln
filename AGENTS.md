# AGENTS.md

Guidance for AI coding agents (and humans) working on this repository.

## Project overview

netzwerkeln constructs the user's social network from their calendars, built
with Vite + React + TypeScript. Users import ICS files via upload or public
URL; the raw contents are processed and stored entirely client-side in the
browser's local storage (key `netzwerkeln:ics-entries`, see
`src/lib/icsStore.ts`). From the raw entries, `src/lib/icsParse.ts` extracts
persons and events (schema.org Person/Event properties) and
`src/lib/directoryStore.ts` stores them under the `netzwerkeln:directory`
key; the directory is rebuilt from the raw entries on every change
(`saveEntries`/`clearEntries`), so never write it independently of the raw
entries.

Application code lives in `src/` — `src/lib/` for logic and local storage,
`src/components/` for UI components; configuration is at the repository root.

Keep all user data client-side: never send stored calendar contents to a
server.

When processing calendar data, only derive values from the data itself; if a
value cannot be found or derived, leave the field empty instead of inventing
one.

## Essential commands

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Dev server with HMR                          |
| `npm run build`        | Typecheck + production build                 |
| `npm run typecheck`    | TypeScript project check (`tsc -b`)          |
| `npm run lint`         | ESLint                                       |
| `npm test`             | Vitest (single run)                          |
| `npm run test:watch`   | Vitest in watch mode                         |
| `npm run format`       | Prettier write                               |
| `npm run format:check` | Prettier check (must pass before committing) |

Run `npm run lint && npm run typecheck && npm run format:check && npm test`
before committing; CI runs the same gates plus `npm run build`.

## Dependencies

- Package manager is **npm**; always commit `package-lock.json` changes.
- The committed `.npmrc` sets `min-release-age=7`: package versions released
  less than 7 days ago are never installed. Do not remove this setting.
- When adding dependencies, use caret ranges and let npm resolve versions
  (respecting the release-age policy); do not pin exact versions by hand.

## Code style

- TypeScript, strict compiler options (see `tsconfig.app.json`); avoid
  `any` and non-null assertions where a proper type is possible.
- Formatting is enforced by Prettier (`.prettierrc.json`: no semicolons,
  single quotes). Run `npm run format` rather than hand-formatting.
- ESLint uses the flat config in `eslint.config.js`; extend it there rather
  than adding inline disables.
- React function components with hooks; no class components.
- Tests are colocated with the code they cover (`*.test.ts` / `*.test.tsx`)
  and run in jsdom with Testing Library; `src/setupTests.ts` is shared setup.

## Git workflow

- Branch per issue, named after the issue number: `issue-<n>`.
- Stack branches on top of the most recent open issue's branch, or `main`.
- Keep commits atomic: one logical change per commit, and never mix
  unrelated changes (e.g., a dependency bump and a feature) into one commit.
- Use [Semantic Commit Messages](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716):
  `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:`.
