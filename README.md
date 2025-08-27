# Compliance Frameworks UI (Demo)

Pixel-conscious demo implementing your requirements using Bootstrap 5, SASS, Vanilla JS, and Fetch. No jQuery, no AJAX.

## What you get

- Left list of frameworks; clicking loads a data table on the right by fetching `public/api/<id>.json`.
- SimpleTable: small, dependency‑free search/sort/paginate table component.
- Modal with a 2‑step generic Stepper. Step 1 validates before moving to Step 2.
- SASS for styling; Bootstrap 5 base; responsive layout.

## Run locally

```bash
npm install
npm run dev       # compiles SASS in watch mode to dist/css
npm start         # serves at http://localhost:5173 (needed for fetch of local JSON)
```

Open http://localhost:5173

## Build CSS for deployment

```bash
npm run build
```

## Notes

- Stepper is generic: buttons use `data-stepper-control` and `data-stepper-target` attributes. Validation is driven by `data-validate` on each `.step` (value is a CSS selector for the form to validate). The JS only toggles `data-step` on the container; CSS decides what to display—no imperative show/hide calls.
- Data source: a small `Api` service is used. It supports three modes: `service` (real backend via `/api/...`), `json` (static files under `public/api`), and `auto` (try service, fall back to json). Configure in `src/js/main.js` when constructing `new Api({ mode, serviceBase, jsonBase })`.
- The table component is intentionally lightweight; swap it with any full‑featured grid if needed.
