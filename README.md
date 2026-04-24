# Ooh Shelf

Capture fleeting curiosities in seconds and explore them later with real, attributed sources.

## What is implemented

- Fast thought capture with a 150-character limit.
- Tag-style thought pile with newest-first ordering.
- Brief and full sourced exploration modes.
- Wikipedia OpenSearch topic resolution.
- Wikipedia summary and full intro fetching.
- Wikidata official website enrichment when available.
- Strict source attribution for all rendered content blocks.
- Fallback links (Wikipedia, Britannica, Google) when sourcing fails.
- Explore actions: mark explored (remove) or keep in pile (close panel).
- Local persistence via `localStorage`.
- Mobile-responsive layout.

## Tech stack

- React + Vite
- Native `fetch` for API requests
- Vitest + Testing Library for tests

## Scripts

- `npm run dev` - start development server
- `npm run build` - build production bundle
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest in watch mode
- `npm run test:run` - run Vitest once

## Testing coverage

- Unit tests for storage logic in `src/lib/storage.test.js`
- Unit tests for sourcing logic in `src/lib/sourcing.test.js`
- Integration flow test in `src/App.test.jsx` (add thought -> open thought -> render sourced content)
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
