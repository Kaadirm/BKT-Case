export class Stepper {
  constructor(root, { onChange, onValidate } = {}) {
    this.root = root;
    this.onChange = onChange || (() => { });
    this.onValidate = onValidate || this.defaultValidator.bind(this);
    this.current = parseInt(root.dataset.step || '1', 10);
  }

  max() {
    return this.root.querySelectorAll('.step').length;
  }

  defaultValidator(from, to) {
    // If moving forward, check if the current step requests validation via data-validate
    if (to > from) {
      const currentStepEl = this.root.querySelector(`.step[data-index="${from}"]`);
      const selector = currentStepEl?.dataset.validate;
      if (selector) {
        const form = currentStepEl.querySelector(selector) || document.querySelector(selector);
        if (form) {
          // Trigger native validation UI
          if (!form.checkValidity()) {
            // Add validation styling to invalid inputs
            const invalidInputs = form.querySelectorAll(':invalid');
            invalidInputs.forEach(input => {
              input.classList.add('invalid');
              const errorEl = input.parentElement.querySelector('.form-error');
              if (errorEl) {
                errorEl.classList.add('visible');
              }
            });
            return false;
          }
        }
      }
    }
    return true;
  }

  go(to) {
    const from = this.current;
    if (to < 1 || to > this.max()) return;
    if (!this.onValidate(from, to)) return;
    this.current = to;
    this.root.setAttribute('data-step', String(this.current));
    this.onChange(from, to);
  }

  next() { this.go(this.current + 1); }
  prev() { this.go(this.current - 1); }

  static wireGlobalControls() {
    // Event delegation for any element with data-stepper-control
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-stepper-control]');
      if (!btn) return;
      const targetSel = btn.getAttribute('data-stepper-target');
      if (!targetSel) return;
      const root = document.querySelector(targetSel);
      if (!root) return;
      // Ensure a Stepper instance is stored on the element
      let instance = root.__stepperInstance;
      if (!instance) {
        instance = new Stepper(root);
        root.__stepperInstance = instance;
      }
      const action = btn.getAttribute('data-stepper-control');
      if (action === 'next') instance.next();
      else if (action === 'prev') instance.prev();
      else if (action?.startsWith('go:')) instance.go(parseInt(action.split(':')[1], 10));
    });
  }
}

// Auto-wire on module import
Stepper.wireGlobalControls();
