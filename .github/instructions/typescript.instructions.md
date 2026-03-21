---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Conventions

## Module system
- ESM only (`"type": "module"` in package.json).
- All relative imports MUST use `.js` extension: `import { pool } from "../db/init.js"`.
- Shared types come from `@get-down/shared` (workspace dependency).

## Style
- Prefer `const` over `let`; never use `var`.
- Use `async/await` over raw Promises.
- Prefer named exports over default exports (except for controller routers).
- Use TypeScript strict mode — no `any` unless unavoidable.

## API layer architecture (`packages/api/`)
- **Controllers** (`src/controllers/`): Express route handlers — parse request, call service, send response.
- **Services** (`src/services/`): Business logic — orchestrate repository calls, validations.
- **Repository** (`src/repository/`): Data access — SQL queries via `run_query<T>()` from `src/db/init.ts`.
- Row interfaces use `snake_case` matching database columns (e.g. `first_name`).
- Model interfaces in `@get-down/shared` use `camelCase` (e.g. `firstName`).

## Testing
- Jest with ESM: `node --experimental-vm-modules node_modules/jest/bin/jest.js`.
- Test files live next to source: `enquiries.test.ts` beside `enquiries.ts`.

## React (`packages/gui/`)
- Functional components with hooks.
- Path alias: `@/` maps to `packages/gui/src/`.
- API calls go through Vite proxy (no hardcoded URLs in dev).
