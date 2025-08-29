// Generic Stepper Module - No constructors, pure functional approach
// State management for stepper instances
const stepperInstances = new Map();

// Default configuration
const defaultConfig = {
  onChange: () => { },
  onValidate: null, // Will use defaultValidator if not provided
  onBeforeStepChange: () => true,
  onAfterStepChange: () => { },
  activeClass: 'active',
  completedClass: 'completed',
  errorClass: 'error',
  disabledClass: 'disabled'
};

// Helper functions
const getStepperState = (element) => {
  const id = element.id || element.dataset.stepperId || Math.random().toString(36);
  if (!element.id && !element.dataset.stepperId) {
    element.dataset.stepperId = id;
  }
  return stepperInstances.get(id);
};

const setStepperState = (element, state) => {
  const id = element.id || element.dataset.stepperId || Math.random().toString(36);
  if (!element.id && !element.dataset.stepperId) {
    element.dataset.stepperId = id;
  }
  stepperInstances.set(id, state);
  return state;
};

const removeStepperState = (element) => {
  const id = element.id || element.dataset.stepperId;
  if (id) {
    stepperInstances.delete(id);
  }
};

// Validation functions
const clearValidationErrors = (form) => {
  const invalidInputs = form.querySelectorAll('.invalid');
  invalidInputs.forEach(input => {
    input.classList.remove('invalid');
    const errorEl = input.parentElement.querySelector('.form-error');
    if (errorEl) {
      errorEl.classList.remove('visible');
    }
  });
};

const showValidationErrors = (form) => {
  const invalidInputs = form.querySelectorAll(':invalid');
  invalidInputs.forEach(input => {
    input.classList.add('invalid');
    const errorEl = input.parentElement.querySelector('.form-error');
    if (errorEl) {
      errorEl.classList.add('visible');
    }
  });
};

const defaultValidator = (element, from, to) => {
  if (to > from) {
    const steps = Array.from(element.querySelectorAll('.step'));
    const currentStepEl = steps[from - 1];
    const selector = currentStepEl?.dataset.validate;

    if (selector) {
      const form = currentStepEl.querySelector(selector) || document.querySelector(selector);
      if (form) {
        clearValidationErrors(form);
        if (!form.checkValidity()) {
          showValidationErrors(form);
          return false;
        }
      }
    }
  }
  return true;
};

// Display update functions
const updateStepDisplay = (element, current, config) => {
  const steps = Array.from(element.querySelectorAll('.step'));

  steps.forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.remove(config.activeClass, config.completedClass, config.errorClass);

    if (stepNumber === current) {
      step.classList.add(config.activeClass);
    } else if (stepNumber < current) {
      step.classList.add(config.completedClass);
    }

    // CSS-based visibility
    step.style.display = stepNumber === current ? 'block' : 'none';
  });
};

const updateIndicators = (element, current, config) => {
  const indicators = Array.from(element.querySelectorAll('.step-badge, .step-indicator'));

  indicators.forEach((indicator, index) => {
    const stepNumber = index + 1;
    indicator.classList.remove(config.activeClass, config.completedClass, config.errorClass);

    if (stepNumber === current) {
      indicator.classList.add(config.activeClass);
    } else if (stepNumber < current) {
      indicator.classList.add(config.completedClass);
    }
  });
};

const updateNavigation = (element, current, maxSteps, config) => {
  const prevBtns = element.querySelectorAll('[data-stepper-control="prev"]');
  const nextBtns = element.querySelectorAll('[data-stepper-control="next"]');

  prevBtns.forEach(btn => {
    btn.disabled = current <= 1;
    btn.classList.toggle(config.disabledClass, current <= 1);
  });

  nextBtns.forEach(btn => {
    btn.disabled = current >= maxSteps;
    btn.classList.toggle(config.disabledClass, current >= maxSteps);
  });

  // Update step counter
  const stepCounter = element.querySelector('.step-indicator, .step-counter');
  if (stepCounter) {
    stepCounter.textContent = `${current}/${maxSteps}`;
  }
};

// Core stepper functions
const createStepper = (element, options = {}) => {
  if (!element) {
    console.error('Stepper: Element is required');
    return null;
  }

  // Merge configuration
  const config = { ...defaultConfig, ...options };

  // Set default validator if none provided
  if (!config.onValidate) {
    config.onValidate = (from, to) => defaultValidator(element, from, to);
  }

  // Get initial state
  const current = parseInt(element.dataset.step || '1', 10);
  const steps = Array.from(element.querySelectorAll('.step'));
  const maxSteps = steps.length;

  // Create state object
  const state = {
    element,
    current,
    maxSteps,
    config,
    clickHandlers: new Map()
  };

  // Store state
  setStepperState(element, state);

  // Initialize display
  initializeStepper(state);

  return {
    go: (step, force = false) => goToStep(state, step, force),
    next: () => goToStep(state, state.current + 1),
    prev: () => goToStep(state, state.current - 1),
    reset: () => goToStep(state, 1, true),
    complete: () => completeStepper(state),
    getCurrentStep: () => state.current,
    getMaxSteps: () => state.maxSteps,
    setStepError: (step) => setStepError(state, step),
    clearStepError: (step) => clearStepError(state, step),
    destroy: () => destroyStepper(state)
  };
};

const initializeStepper = (state) => {
  const { element, current, config } = state;

  // Update initial display
  updateStepDisplay(element, current, config);
  updateIndicators(element, current, config);
  updateNavigation(element, current, state.maxSteps, config);

  // Add click handlers for indicators
  const indicators = Array.from(element.querySelectorAll('.step-badge, .step-indicator'));
  indicators.forEach((indicator, index) => {
    if (indicator.dataset.clickable !== 'false') {
      const handler = () => goToStep(state, index + 1);
      indicator.addEventListener('click', handler);
      indicator.style.cursor = 'pointer';
      state.clickHandlers.set(indicator, handler);
    }
  });

  // Set attribute for CSS targeting
  element.setAttribute('data-step', String(current));
};

const goToStep = (state, targetStep, force = false) => {
  const { element, current, maxSteps, config } = state;

  // Validate step number
  if (targetStep < 1 || targetStep > maxSteps) {
    console.warn(`Stepper: Invalid step number ${targetStep}. Must be between 1 and ${maxSteps}`);
    return false;
  }

  // Skip if already on target step
  if (targetStep === current) return true;

  // Run before step change hook
  if (!force && !config.onBeforeStepChange(current, targetStep)) {
    return false;
  }

  // Run validation
  if (!force && !config.onValidate(current, targetStep)) {
    return false;
  }

  // Update state
  const previousStep = state.current;
  state.current = targetStep;

  // Update display
  element.setAttribute('data-step', String(targetStep));
  updateStepDisplay(element, targetStep, config);
  updateIndicators(element, targetStep, config);
  updateNavigation(element, targetStep, maxSteps, config);

  // Run callbacks
  config.onChange(previousStep, targetStep);
  config.onAfterStepChange(previousStep, targetStep);

  return true;
};

const completeStepper = (state) => {
  const { element, config } = state;
  const steps = Array.from(element.querySelectorAll('.step'));
  const indicators = Array.from(element.querySelectorAll('.step-badge, .step-indicator'));

  // Mark all steps as completed
  steps.forEach(step => {
    step.classList.add(config.completedClass);
    step.classList.remove(config.activeClass, config.errorClass);
  });

  indicators.forEach(indicator => {
    indicator.classList.add(config.completedClass);
    indicator.classList.remove(config.activeClass, config.errorClass);
  });
};

const setStepError = (state, stepNumber) => {
  const { element, config } = state;
  const steps = Array.from(element.querySelectorAll('.step'));
  const indicators = Array.from(element.querySelectorAll('.step-badge, .step-indicator'));

  const step = steps[stepNumber - 1];
  const indicator = indicators[stepNumber - 1];

  if (step) step.classList.add(config.errorClass);
  if (indicator) indicator.classList.add(config.errorClass);
};

const clearStepError = (state, stepNumber) => {
  const { element, config } = state;
  const steps = Array.from(element.querySelectorAll('.step'));
  const indicators = Array.from(element.querySelectorAll('.step-badge, .step-indicator'));

  const step = steps[stepNumber - 1];
  const indicator = indicators[stepNumber - 1];

  if (step) step.classList.remove(config.errorClass);
  if (indicator) indicator.classList.remove(config.errorClass);
};

const destroyStepper = (state) => {
  const { element, clickHandlers } = state;

  // Remove event listeners
  clickHandlers.forEach((handler, indicator) => {
    indicator.removeEventListener('click', handler);
  });

  // Clear state
  removeStepperState(element);
};

// Utility functions
const getStepper = (element) => {
  const state = getStepperState(element);
  if (!state) return null;

  return {
    go: (step, force = false) => goToStep(state, step, force),
    next: () => goToStep(state, state.current + 1),
    prev: () => goToStep(state, state.current - 1),
    reset: () => goToStep(state, 1, true),
    complete: () => completeStepper(state),
    getCurrentStep: () => state.current,
    getMaxSteps: () => state.maxSteps,
    setStepError: (step) => setStepError(state, step),
    clearStepError: (step) => clearStepError(state, step),
    destroy: () => destroyStepper(state)
  };
};

const destroyStepperInstance = (element) => {
  const state = getStepperState(element);
  if (state) {
    destroyStepper(state);
  }
};

// Global control system
const wireGlobalControls = () => {
  if (document.__stepperControlsWired) return;
  document.__stepperControlsWired = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-stepper-control]');
    if (!btn) return;

    e.preventDefault();

    const targetSel = btn.getAttribute('data-stepper-target');
    if (!targetSel) {
      console.warn('Stepper control button missing data-stepper-target attribute');
      return;
    }

    const element = document.querySelector(targetSel);
    if (!element) {
      console.warn(`Stepper target not found: ${targetSel}`);
      return;
    }

    // Get or create stepper instance
    let stepper = getStepper(element);
    if (!stepper) {
      stepper = createStepper(element);
    }

    const action = btn.getAttribute('data-stepper-control');

    switch (action) {
      case 'next':
        stepper.next();
        break;
      case 'prev':
        stepper.prev();
        break;
      case 'reset':
        stepper.reset();
        break;
      case 'complete':
        stepper.complete();
        break;
      default:
        if (action?.startsWith('go:')) {
          const stepNumber = parseInt(action.split(':')[1], 10);
          stepper.go(stepNumber);
        }
        break;
    }
  });
};

// Auto-wire controls on module load
wireGlobalControls();

// Export public API
export {
  createStepper,
  getStepper,
  destroyStepperInstance,
  wireGlobalControls,
  clearValidationErrors,
  showValidationErrors
};

// Legacy class export for backward compatibility (optional)
export class Stepper {
  constructor(element, options = {}) {
    const instance = createStepper(element, options);
    // Copy methods to this instance
    Object.assign(this, instance);
    this.root = element;
  }

  static createInstance(element, options = {}) {
    return createStepper(element, options);
  }

  static getInstance(element) {
    return getStepper(element);
  }

  static destroyInstance(element) {
    destroyStepperInstance(element);
  }

  static wireGlobalControls() {
    wireGlobalControls();
  }
}
