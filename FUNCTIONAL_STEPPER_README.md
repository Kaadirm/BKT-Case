# Functional Stepper (Vanilla JS)

A lightweight, DOM-driven stepper for multi-step flows (e.g., wizards, modals). It auto-wires controls via data attributes, supports HTML5 validation, and exposes a small programmatic API. Used by the “Add New Framework” modal in this project.

## Key features

- Pure Vanilla JS; no dependencies
- Automatic control wiring with `data-stepper-control` and `data-stepper-target`
- Forward navigation validation via HTML5 `checkValidity()` or custom logic
- Programmatic API for imperative navigation and error states
- Accessible: toggles `aria-hidden`, keyboard-friendly controls
- Style-agnostic: class hooks only (`active`, `completed`, `error`, `disabled`)

## Anatomy and markup

- Container: `.stepper` with optional `data-step="1"` for initial step
- Head (optional): `.stepper-head` containing per-step badges/labels
  - Step indicators: `.step-badge` and `.step-label` (order matters)
- Steps: one `.step` per step, with `data-index="N"`
- Optional step-level validation: set `data-validate="#formSelector"` on each `.step`

Example:

```html
<div id="myStepper" class="stepper" data-step="1">
  <div class="stepper-head">
    <div class="step-indicator-wrapper">
      <div class="step-badge active"><span>01</span></div>
      <div class="step-label">Details</div>
    </div>
    <div class="step-indicator-wrapper">
      <div class="step-badge"><span>02</span></div>
      <div class="step-label">Review</div>
    </div>
  </div>

  <div class="step" data-index="1" data-validate="#detailsForm">
    <form id="detailsForm" novalidate class="custom-form">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input required class="form-input" />
        <div class="form-error">Name is required.</div>
      </div>
    </form>
  </div>

  <div class="step" data-index="2">
    <!-- Review content -->
  </div>
</div>

<!-- Controls can live outside the container -->
<button data-stepper-cancel data-stepper-target="#myStepper">Cancel</button>
<button data-stepper-control="prev" data-stepper-target="#myStepper">
  Previous
</button>
<button data-stepper-control="next" data-stepper-target="#myStepper">
  Next
</button>
<div
  data-stepper-functional-actions
  data-stepper-target="#myStepper"
  style="display:none"
></div>
<button data-stepper-save data-stepper-target="#myStepper">Save</button>
```

## Controls and actions

Add `data-stepper-control` to any clickable element and point it at the container with `data-stepper-target`.

Supported actions:

- `next` — go to next step (validates by default)
- `prev` — go to previous step
- `reset` — jump to step 1 (skips validation)
- `complete` — mark all steps as completed
- `go:N` — jump to step N (e.g., `go:2`)

Additional optional hooks the stepper will manage if present for the same `data-stepper-target`:

- `[data-stepper-cancel]` — styled as outline, remains visible
- `[data-stepper-save]` — shown only on the last step, styled as success
- `[data-stepper-functional-actions]` — container shown only on the last step (e.g., extra actions)

Next button label auto-updates to include the upcoming step label from `.stepper-head .step-label` when available (e.g., “Next › Review”).

## Validation model

Default forward navigation validation:

- If moving from step X to X+1 and the current step has `data-validate="#formSelector"`, the stepper runs `form.checkValidity()`.
- For invalid inputs, it adds `.invalid` to the field and `.visible` to the closest `.form-error` inside the same `.form-group`.
- Backward navigation does not validate.

Override with custom logic:

```js
import { createStepper } from "./src/js/stepper.js";

const stepper = createStepper(document.querySelector("#myStepper"), {
  onValidate: (from, to) => {
    if (to > from) {
      // custom validation logic; return true/false
      return true;
    }
    return true;
  },
});
```

## Programmatic API

From `src/js/stepper.js`:

- `createStepper(element, options)` → instance
- `getStepper(element)` → existing instance or null

Options:

- `onChange(from, to)` — after navigation
- `onValidate(from, to)` — return false to block
- `onBeforeStepChange(from, to)` — return false to block
- `onAfterStepChange(from, to)` — post-update hook
- Class names: `activeClass`, `completedClass`, `errorClass`, `disabledClass`

Instance methods:

- `next()`, `prev()`, `go(step, force=false)`, `reset()`, `complete()`
- `getCurrentStep()`, `getMaxSteps()`
- `setStepError(step)`, `clearStepError(step)`

Lazy access:

```js
import { createStepper, getStepper } from "./src/js/stepper.js";

const el = document.querySelector("#myStepper");
let stepper = getStepper(el) || createStepper(el);
stepper.next();
```

## Display and classes

The stepper toggles these classes:

- On steps and badges: `active`, `completed`, `error`
- On disabled nav buttons: `disabled`

It also sets:

- `aria-hidden="false"` on the active step; `aria-hidden="true"` on others
- `data-step="N"` on the container for CSS hooks
- `.stepper-head` gets `step-2-active` when on step ≥ 2 (useful for connector line styling)

Optional counter:

- If a `.step-indicator` or `.step-counter` exists inside the container, it’s updated to `current/max`.

## Accessibility

- Semantic buttons for controls; keyboard-activated via standard click handling
- Non-active steps are hidden to assistive tech via `aria-hidden="true"`
- Labels and errors follow typical form semantics (`.form-label`, `.form-error`)

## Styling tips

- Use the provided class hooks to style the active/completed/error states
- Hide non-active steps via CSS using the `[aria-hidden="true"]` attribute selector
- Customize buttons globally; the stepper adds base classes but avoids enforcing visual styles

## Integration in this project

- See `index.html` for the modal’s markup and `src/js/modal-manager.js` for step-specific hooks:
  - Updates title counter (e.g., `1/2`)
  - Validates step 1 before allowing step 2
  - Persists transient step data before navigation
- Global controls are auto-wired once on module load (`stepper.js` sets a single document click listener)

## Common pitfalls

- Missing or wrong `data-stepper-target` selector — controls won’t respond
- Step lacks `data-validate` or form fields lack HTML constraints — forward validation won’t trigger
- Dynamically replacing step content — re-check that your `.form-error` elements align with inputs
- Mismatched number/order of `.step-badge` vs `.step` — next label inference may be off

## Minimal end-to-end example

```html
<div id="s" class="stepper" data-step="1">
  <div class="stepper-head">
    <div class="step-indicator-wrapper">
      <div class="step-badge active"><span>01</span></div>
      <div class="step-label">A</div>
    </div>
    <div class="step-indicator-wrapper">
      <div class="step-badge"><span>02</span></div>
      <div class="step-label">B</div>
    </div>
  </div>
  <div class="step" data-index="1" data-validate="#f">
    <form id="f" novalidate>
      <input required />
      <div class="form-error">Required</div>
    </form>
  </div>
  <div class="step" data-index="2">Done</div>
</div>
<button data-stepper-control="prev" data-stepper-target="#s">Prev</button>
<button data-stepper-control="next" data-stepper-target="#s">Next</button>
<script type="module">
  import { createStepper } from "./src/js/stepper.js";
  createStepper(document.querySelector("#s"));
</script>
```
