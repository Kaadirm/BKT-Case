# Constructor-Free Stepper Component

A modern, functional approach to building a generic stepper component without using JavaScript classes or constructors. This implementation follows functional programming principles for better maintainability, testability, and performance.

## 🎯 Why Constructor-Free?

### Benefits of Functional Approach:

✅ **Simpler Mental Model** - No `this` binding confusion  
✅ **Better Performance** - No prototype chain overhead  
✅ **Easier Testing** - Pure functions are easier to unit test  
✅ **Memory Efficient** - Better garbage collection  
✅ **Modular Design** - Each function has a single responsibility  
✅ **Tree Shaking** - Unused functions can be eliminated by bundlers  
✅ **Immutable Patterns** - Reduces side effects and bugs

### Traditional OOP vs Functional Approach:

```javascript
// ❌ Traditional OOP approach
class Stepper {
  constructor(element, options) {
    this.element = element;
    this.current = 1;
    this.init();
  }

  next() {
    this.go(this.current + 1);
  }
}

const stepper = new Stepper(element, options);

// ✅ Functional approach
const createStepper = (element, options) => {
  const state = { element, current: 1, options };
  return {
    next: () => goToStep(state, state.current + 1),
    go: (step) => goToStep(state, step),
  };
};

const stepper = createStepper(element, options);
```

## 🏗️ Architecture Overview

### Core Concepts:

1. **State Management** - Uses `Map` for instance storage
2. **Pure Functions** - Each function performs one specific task
3. **Factory Pattern** - `createStepper()` creates stepper instances
4. **Closure-based API** - Returns object with methods that close over state
5. **Automatic Cleanup** - Proper memory management

### File Structure:

```
src/js/stepper.js
├── State Management
│   ├── stepperInstances (Map)
│   ├── getStepperState()
│   ├── setStepperState()
│   └── removeStepperState()
├── Core Functions
│   ├── createStepper()
│   ├── getStepper()
│   ├── goToStep()
│   └── destroyStepper()
├── Helper Functions
│   ├── updateStepDisplay()
│   ├── updateIndicators()
│   ├── updateNavigation()
│   └── validation functions
└── Global Controls
    └── wireGlobalControls()
```

## 🚀 Usage Examples

### Basic Usage:

```javascript
import { createStepper } from "./stepper.js";

// Create stepper - no 'new' keyword needed!
const stepper = createStepper(document.getElementById("myStepper"), {
  onChange: (from, to) => console.log(`Step: ${from} → ${to}`),
  onValidate: (from, to) => validateStep(from, to),
});

// Use the stepper
stepper.next(); // Go to next step
stepper.prev(); // Go to previous step
stepper.go(3); // Go to specific step
stepper.reset(); // Reset to first step
stepper.complete(); // Mark all steps complete
```

### Advanced Configuration:

```javascript
const stepper = createStepper(element, {
  onChange: (from, to) => {
    updateUI(to);
    saveProgress(to);
  },
  onValidate: (from, to) => {
    if (to > from) {
      return validateCurrentStep(from);
    }
    return true;
  },
  onBeforeStepChange: (from, to) => {
    saveStepData(from);
    return true;
  },
  onAfterStepChange: (from, to) => {
    logStepChange(from, to);
    updateAnalytics(to);
  },
});
```

### Getting Existing Stepper:

```javascript
import { getStepper } from "./stepper.js";

// Get stepper if it already exists
const existingStepper = getStepper(element);

if (existingStepper) {
  existingStepper.next();
} else {
  // Create new one if needed
  const newStepper = createStepper(element, options);
}
```

### Automatic Controls (No JavaScript Required):

```html
<!-- These work automatically with the functional stepper -->
<button data-stepper-control="next" data-stepper-target="#myStepper">
  Next Step
</button>

<button data-stepper-control="prev" data-stepper-target="#myStepper">
  Previous Step
</button>

<button data-stepper-control="go:3" data-stepper-target="#myStepper">
  Skip to Step 3
</button>

<button data-stepper-control="reset" data-stepper-target="#myStepper">
  Reset
</button>
```

## 🔧 API Reference

### Core Functions:

| Function                          | Parameters            | Returns              | Description                       |
| --------------------------------- | --------------------- | -------------------- | --------------------------------- |
| `createStepper(element, options)` | `HTMLElement, Object` | `StepperAPI`         | Creates new stepper instance      |
| `getStepper(element)`             | `HTMLElement`         | `StepperAPI \| null` | Gets existing stepper instance    |
| `destroyStepperInstance(element)` | `HTMLElement`         | `void`               | Destroys stepper instance         |
| `wireGlobalControls()`            | None                  | `void`               | Enables automatic control binding |

### Stepper API Methods:

| Method                 | Parameters         | Returns   | Description               |
| ---------------------- | ------------------ | --------- | ------------------------- |
| `next()`               | None               | `boolean` | Go to next step           |
| `prev()`               | None               | `boolean` | Go to previous step       |
| `go(step, force)`      | `number, boolean?` | `boolean` | Go to specific step       |
| `reset()`              | None               | `boolean` | Reset to first step       |
| `complete()`           | None               | `void`    | Mark all steps complete   |
| `getCurrentStep()`     | None               | `number`  | Get current step number   |
| `getMaxSteps()`        | None               | `number`  | Get total number of steps |
| `setStepError(step)`   | `number`           | `void`    | Mark step as error        |
| `clearStepError(step)` | `number`           | `void`    | Clear step error          |
| `destroy()`            | None               | `void`    | Clean up stepper instance |

### Configuration Options:

```javascript
const options = {
  onChange: (from, to) => {}, // Called on step change
  onValidate: (from, to) => true, // Validation function
  onBeforeStepChange: (from, to) => true, // Before change hook
  onAfterStepChange: (from, to) => {}, // After change hook
  activeClass: "active", // CSS class for active step
  completedClass: "completed", // CSS class for completed steps
  errorClass: "error", // CSS class for error state
  disabledClass: "disabled", // CSS class for disabled state
};
```

## 🧪 Implementation Details

### State Management:

```javascript
// State is stored in a Map for O(1) lookup
const stepperInstances = new Map();

const setStepperState = (element, state) => {
  const id =
    element.id || element.dataset.stepperId || Math.random().toString(36);
  if (!element.id && !element.dataset.stepperId) {
    element.dataset.stepperId = id;
  }
  stepperInstances.set(id, state);
  return state;
};
```

### Factory Pattern:

```javascript
const createStepper = (element, options = {}) => {
  // Merge configuration
  const config = { ...defaultConfig, ...options };

  // Create state object
  const state = {
    element,
    current: parseInt(element.dataset.step || "1", 10),
    maxSteps: element.querySelectorAll(".step").length,
    config,
    clickHandlers: new Map(),
  };

  // Store state
  setStepperState(element, state);

  // Return API object with closures
  return {
    go: (step, force = false) => goToStep(state, step, force),
    next: () => goToStep(state, state.current + 1),
    prev: () => goToStep(state, state.current - 1),
    // ... other methods
  };
};
```

### Memory Management:

```javascript
const destroyStepper = (state) => {
  const { element, clickHandlers } = state;

  // Remove event listeners
  clickHandlers.forEach((handler, indicator) => {
    indicator.removeEventListener("click", handler);
  });

  // Clear state
  removeStepperState(element);
};
```

## 🎨 HTML Structure

```html
<div class="stepper" id="myStepper" data-step="1">
  <!-- Optional: Progress indicators -->
  <div class="stepper-head">
    <div class="step-indicator-wrapper">
      <div class="step-badge active">1</div>
      <div class="step-label">Step 1</div>
    </div>
    <div class="step-indicator-wrapper">
      <div class="step-badge">2</div>
      <div class="step-label">Step 2</div>
    </div>
  </div>

  <!-- Steps -->
  <div class="step" data-index="1" data-validate="#form1">
    <form id="form1">
      <!-- Step 1 content -->
    </form>
  </div>

  <div class="step" data-index="2">
    <!-- Step 2 content -->
  </div>

  <!-- Navigation -->
  <div class="stepper-nav">
    <button data-stepper-control="prev" data-stepper-target="#myStepper">
      Previous
    </button>
    <button data-stepper-control="next" data-stepper-target="#myStepper">
      Next
    </button>
  </div>
</div>
```

## 🔄 Migration from Class-based

### Before (Class-based):

```javascript
import { Stepper } from "./stepper.js";

const stepper = new Stepper(element, options);
stepper.next();
```

### After (Functional):

```javascript
import { createStepper } from "./stepper.js";

const stepper = createStepper(element, options);
stepper.next();
```

### Backward Compatibility:

The functional stepper includes a legacy `Stepper` class for backward compatibility:

```javascript
// Still works for existing code
import { Stepper } from "./stepper.js";
const stepper = new Stepper(element, options);

// But this is preferred
import { createStepper } from "./stepper.js";
const stepper = createStepper(element, options);
```

## 🧪 Testing

Pure functions are easier to test:

```javascript
// Test state management
const element = document.createElement("div");
const stepper = createStepper(element, { onChange: jest.fn() });

// Test step navigation
expect(stepper.getCurrentStep()).toBe(1);
expect(stepper.next()).toBe(true);
expect(stepper.getCurrentStep()).toBe(2);

// Test validation
const validateSpy = jest.fn().mockReturnValue(false);
const stepperWithValidation = createStepper(element, {
  onValidate: validateSpy,
});
expect(stepperWithValidation.next()).toBe(false);
expect(validateSpy).toHaveBeenCalledWith(1, 2);
```

## 🎯 Performance Benefits

1. **No Prototype Chain** - Direct function calls
2. **Better Memory Usage** - No `this` binding overhead
3. **Tree Shaking** - Unused functions eliminated by bundlers
4. **Faster Instantiation** - No constructor overhead
5. **Efficient State Access** - Map-based O(1) lookups

## 🔧 Integration Examples

### React Integration:

```javascript
import { createStepper, getStepper } from "./stepper.js";

const StepperComponent = ({ children, options }) => {
  const stepperRef = useRef(null);

  useEffect(() => {
    if (stepperRef.current) {
      const stepper = createStepper(stepperRef.current, options);
      return () => stepper.destroy();
    }
  }, [options]);

  return (
    <div ref={stepperRef} className="stepper">
      {children}
    </div>
  );
};
```

### Vue Integration:

```javascript
export default {
  mounted() {
    this.stepper = createStepper(this.$el, this.options);
  },
  beforeUnmount() {
    this.stepper?.destroy();
  },
};
```

## 🚀 Advanced Patterns

### Stepper Factory:

```javascript
const createWizardStepper = (element) =>
  createStepper(element, {
    onChange: (from, to) => updateWizardProgress(to),
    onValidate: (from, to) => validateWizardStep(from, to),
  });

const createFormStepper = (element) =>
  createStepper(element, {
    onChange: (from, to) => saveFormProgress(from, to),
    onValidate: (from, to) => validateFormStep(from),
  });
```

### Composite Steppers:

```javascript
const createMultiStepper = (elements, sharedOptions) => {
  return elements.map((element) =>
    createStepper(element, { ...sharedOptions, ...element.dataset })
  );
};
```

## 💡 Best Practices

1. **Use Functional Imports** - Import only what you need
2. **Leverage Auto-Controls** - Use data attributes for simple navigation
3. **Validate Early** - Implement validation in `onValidate`
4. **Clean Up Properly** - Always call `destroy()` when removing elements
5. **Test Pure Functions** - Write unit tests for individual functions
6. **Use TypeScript** - Add type definitions for better DX

This constructor-free approach provides a modern, efficient, and maintainable way to implement stepper functionality while maintaining all the features of the original class-based implementation.
