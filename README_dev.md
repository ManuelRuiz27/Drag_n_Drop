# Drag_n_Drop Developer Guide

## Project Description and Objective
Drag_n_Drop is an interactive interface for arranging categorized elements through a drag-and-drop workflow. The goal of the project is to provide a flexible workspace where teams can visualize resources, adjust capacities, and tailor visual styles to match their operational needs.

## Folder Structure Overview
```
/
|-- index.html              # Application entry point served by Vite
|-- package.json            # npm dependencies and scripts
|-- src/
|   |-- App.tsx             # Root React component
|   |-- main.tsx            # Vite/React bootstrap
|   |-- assets/
|   |   `-- icons/          # Custom iconography (to be populated)
|   |-- components/         # Reusable UI blocks for drag-and-drop
|   |-- context/            # React context providers and hooks
|   |-- icons/              # Custom icon registries
|   |-- utils/              # Helper logic for data shaping and exports
|   `-- styles.css          # Global stylesheet overrides
|-- tailwind.config.js      # Tailwind theme tokens and utility presets
`-- vite.config.ts          # Vite build configuration
```

## Developer Intervention Points (Ruiz)
- **Icons and imagery:** Place new SVGs or raster assets inside `src/assets/icons`. Maintain descriptive filenames and keep them optimized for the web.
- **Element configuration:** Update element types, capacity limits, and related metadata in the relevant configuration files within `src/utils` or accompanying context modules. Ensure that changes remain synchronized with any consuming components.
- **Styling customization:** Adjust design tokens, color palettes, spacing scales, and plugin settings in `tailwind.config.js` to align with the desired theme.

## Running the Project Locally
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`

## Persisting layouts through the API helper
Use `persistDesignToApi` from `src/utils/export.ts` to send the current canvas snapshot to your backend. The helper re-uses `exportDesignToJSON` and wraps a `fetch` call so that the UI can persist user layouts without duplicating networking code.

```ts
import { persistDesignToApi } from '../utils/export';
import type { ElementConfig } from '../context/types';

async function saveLayout(elements: ElementConfig[]) {
  await persistDesignToApi(elements, 'https://api.my-app.com/layouts', {
    method: 'POST',
    token: process.env.API_TOKEN,
    headers: {
      'X-Workspace-Id': 'demo-floor-plan',
    },
  });
}
```

### Options overview
- `endpoint` (string, required): URL of the REST endpoint that stores the layout.
- `method` (default `POST`): Use `PUT`/`PATCH` if your API updates existing records.
- `headers`: Extra headers merged on top of `Content-Type: application/json`.
- `token`: Convenience helper that automatically attaches an `Authorization: Bearer <token>` header when present.
- `fetchImpl`: Optional custom `fetch` implementation (useful for tests or Node runtimes).

If the response is not successful (`!response.ok`), the helper throws an error that includes the status code and the first bytes of the response body, so remember to handle it in the calling code (toast, retry UI, etc.).

## Requesting Codex Assistance
- Review the repository's `AGENTS.md` files for contextual guidance before proposing changes.
- When opening pull requests that require Codex follow-up tasks, include the tag `@codex` in the PR description so automated triage can assign the work appropriately.
