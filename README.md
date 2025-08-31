# Compliance Frameworks UI

Vanilla JS + SASS app that lists Compliance Frameworks on the left and shows their control items on the right. Includes a lightweight table, a generic stepper-driven modal to add a new framework, and a simple dev proxy for API calls. No jQuery.

## Highlights

- Framework list with keyboard navigation; deep-linking via URL (history API)
- SimpleTable: dependency-free search/sort/paginate table
- Generic 2-step Modal Stepper with HTML5 validation
- SASS-based, responsive, accessible-first UI

## Project structure

- `index.html` – App shell, modal markup, and script loader
- `src/js` – App code (stepper, table, managers, services, utilities)
- `src/scss` – Styles organized by component and utility partials; compiled to `dist/css`
- `dev-proxy.js` – Express proxy and static server for local development on http://localhost:5173
- `public/` – Icons and images

## Getting started

```bash
npm install
npm run dev       # runs proxy + SASS watch
# open http://localhost:5173
```

Production CSS build only:

```bash
npm run build     # outputs to dist/css/styles.css
```

Alternative static serve (optional):

```bash
npm run serve     # http-server on http://localhost:5173 (no API proxy)
```

Notes on the dev server:

- `npm start` or `npm run proxy` starts `dev-proxy.js` (Express) to serve static files and proxy `/api` → the real backend.
- This project treats Express as a dev tool. If you deploy with `npm ci --only=prod` and rely on `npm start`, move Express to `dependencies` or serve the built assets with any static server.

## Configuration

- API base is defined in `src/js/config/constants.js` and used by `createApi` in `src/js/main.js`.
- The proxy target is configured in `dev-proxy.js` (`BACKEND_URL`). In dev, requests to `/api/...` are proxied there.

## Stepper component (generic) 🧭

The stepper powers the “Add New Framework” modal (`#newFrameworkModal`). It’s a reusable, DOM-driven component with minimal API, automatic control wiring, and built-in HTML5 validation support.

### Markup contract

- Container: an element with class `stepper` and optional `data-step="1"` to indicate the initial step.
- Header (optional): `.stepper-head` containing badges/labels for each step (`.step-badge` + `.step-label`).
- Steps: one `.step` element per step. Put your form fields inside. To enable validation, set `data-validate="#formSelector"` on the step and ensure the form has `required` attributes etc.
- Indicators/state: the stepper toggles `active`, `completed`, and `error` classes on steps and badges.

Minimal example (similar to `index.html`):

```html
<div id="frameworkStepper" class="stepper" data-step="1">
  <div class="stepper-head">
    <div class="step-indicator-wrapper">
      <div class="step-badge active"><span>01</span></div>
      <div class="step-label">Framework Details</div>
    </div>
    <div class="step-indicator-wrapper">
      <div class="step-badge"><span>02</span></div>
      <div class="step-label">Control Items</div>
    </div>
  </div>

  <div class="step" data-index="1" data-validate="#frameworkForm">
    <form id="frameworkForm" class="custom-form" novalidate>
      <!-- inputs with required -->
    </form>
  </div>

  <div class="step" data-index="2">
    <!-- table / review content -->
  </div>
</div>

<!-- Controls (can live outside the stepper) -->
<button data-stepper-cancel data-stepper-target="#frameworkStepper">
  Cancel
</button>
<button data-stepper-control="prev" data-stepper-target="#frameworkStepper">
  Previous
</button>
<button data-stepper-control="next" data-stepper-target="#frameworkStepper">
  Next
</button>
<div
  data-stepper-functional-actions
  data-stepper-target="#frameworkStepper"
  style="display:none"
>
  <!-- Functional actions visible on last step -->
</div>
<button data-stepper-save data-stepper-target="#frameworkStepper">Save</button>
```

### Controls and wiring

- Any element with `data-stepper-control` becomes a control for the stepper it targets via `data-stepper-target` (CSS selector to the container).
- Supported actions for `data-stepper-control`:
  - `next`, `prev`, `reset`, `complete`, `go:N` (e.g., `go:2`)
- Additional selectors the stepper manages (if present):
  - `[data-stepper-cancel]`, `[data-stepper-save]`, and `[data-stepper-functional-actions]` scoped by `data-stepper-target`.
- The library auto-wires a single global click listener on first import; no manual event binding is needed for controls.

### Validation model

- Default validator runs when moving forward only. It locates the step’s `data-validate` form and calls `form.checkValidity()`.
- Invalid fields receive the `invalid` class and the nearest `.form-error` inside the same `.form-group` gets `visible`.
- You can override validation via `onValidate(from, to)` in the config when creating the stepper.

### Programmatic API

Imported from `src/js/stepper.js`:

- `createStepper(element, options)` → instance
  - Options: `onChange(from, to)`, `onValidate(from, to)`, `onBeforeStepChange(from, to)`, `onAfterStepChange(from, to)`, and class names: `activeClass`, `completedClass`, `errorClass`, `disabledClass`.
- `getStepper(element)` → existing instance or null

Instance methods:

- `next()`, `prev()`, `go(step, force=false)`, `reset()`, `complete()`
- `getCurrentStep()`, `getMaxSteps()`
- `setStepError(step)`, `clearStepError(step)`

In this project, the modal is initialized via `ModalManager.ensureStepperInstance()` which calls `createStepper` with step-specific hooks:

- Updates the modal title counter (e.g., `1/2`)
- Applies validation on Step 1 before allowing Step 2
- Saves step data on `onBeforeStepChange`

### Styling hooks

- Classes toggled: `active`, `completed`, `error`, `disabled`
- The head (`.stepper-head`) gets `step-2-active` when on step >= 2 to style the connector line.
- The step counter text is optionally updated inside an element with `.step-indicator` or `.step-counter` in the container.

### Common pitfalls

- Make sure `data-stepper-target` correctly points to the stepper container.
- For validation, ensure the step has `data-validate` and the form fields use HTML5 constraints (`required`, `type`, etc.).
- If you dynamically replace content within a step, call `getStepper(el)` and re-render state if needed by navigating (e.g., `go(current)`).

## Table component (SimpleTable)

Location: `src/js/table.js`. A tiny table with:

- Columns config (with optional custom render per cell)
- Search, sort, pagination
- Optional external pagination and info elements

Example usage (simplified):

```js
const table = createSimpleTable(hostEl, {
  columns: [
    { key: "controlId", label: "Control ID", sortable: true },
    { key: "controlCategory", label: "Control Category", sortable: true },
    { key: "controlDescription", label: "Control Description" },
  ],
  pageSize: 10,
});
table.load(rows);
```

## Keyboard shortcuts

- Cmd/Ctrl + K → focus search
- Cmd/Ctrl + N → open “New Framework” modal
- Esc → close modal

## Development notes

- All app scripts are ES Modules loaded from `index.html` via `<script type="module" src="/src/js/main.js"></script>`.
- Styles are compiled from SCSS to `dist/css/styles.css` via the SASS scripts in `package.json`.
- The proxy serves static files and forwards `/api` to the backend (see `dev-proxy.js`).

## Troubleshooting

- Blank table after selecting a framework: check the network tab for `/api/...` requests and confirm the proxy target in `dev-proxy.js` is reachable.
- Stepper buttons not working: verify each control has `data-stepper-target="#frameworkStepper"` (or your container’s selector).
- Validation errors not showing: ensure each input is inside a `.form-group` with a sibling `.form-error` element.

## License

MIT (or your preferred license)
