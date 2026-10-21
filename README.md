# netzwerkeln

netzwerkeln constructs your social network from your calendars. Built with
Vite, React, and TypeScript.

## Features

- Import calendars from local `.ics` files (multiple files at once) or from
  public ICS URLs
- Files and URLs are processed sequentially; after each import the local
  store is updated and the form is reset
- Raw ICS contents are stored locally in your browser (`localStorage`) for
  further processing; the UI lists everything you imported
- People and events are extracted from the imported calendars (schema.org
  Person/Event properties) into a local directory that is rebuilt whenever
  the raw data changes
- Your data never leaves this browser — a single action clears all stored
  calendars

## Tech stack

| Tool            | Purpose                                        |
| --------------- | ---------------------------------------------- |
| Vite            | Build tool and dev server                      |
| React           | UI framework                                   |
| TypeScript      | Static typing                                  |
| ESLint          | Linting (flat config, typescript-eslint)       |
| Prettier        | Code formatting                                |
| Vitest          | Unit testing                                   |
| Testing Library | Component testing (jsdom environment)          |
| GitHub Actions  | CI: lint, typecheck, format check, test, build |

## Prerequisites

- Node.js `^20.19.0` || `>=22.12.0` (CI runs against Node 22 and 24)
- npm (the repository uses npm with a committed `package-lock.json`)

## Getting started

```sh
git clone https://github.com/c4dt/netzwerkeln.git
cd netzwerkeln
npm install
npm run dev
```

The app is served at the URL printed by Vite (by default http://localhost:5173).

## npm scripts

| Script                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the development server with HMR              |
| `npm run build`        | Typecheck and create a production build in `dist/` |
| `npm run preview`      | Preview the production build locally               |
| `npm run typecheck`    | Typecheck the project (`tsc -b`)                   |
| `npm run lint`         | Lint the code with ESLint                          |
| `npm test`             | Run all tests once (Vitest)                        |
| `npm run test:watch`   | Run tests in watch mode                            |
| `npm run format`       | Format the codebase with Prettier                  |
| `npm run format:check` | Verify formatting without writing changes          |

## Testing

Tests live next to the code they cover (`*.test.ts` / `*.test.tsx`) and run in
a jsdom environment with Testing Library and `@testing-library/jest-dom`
matchers. `src/setupTests.ts` wires up the matchers and cleans up the DOM
between tests. `src/lib/sum.ts` is placeholder boilerplate demonstrating a
pure-utility test.

## Dependency supply-chain policy

The committed [`.npmrc`](./.npmrc) sets `min-release-age=7`: npm refuses to
resolve package versions that were released less than 7 days ago. This
protects against freshly published compromised packages while still allowing
bugfix ranges to resolve to recent (but not brand-new) versions.

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push to
`main` and on all pull requests, testing against Node 22 and 24:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run format:check`
5. `npm test`
6. `npm run build`

## License

[MIT](./LICENSE)
