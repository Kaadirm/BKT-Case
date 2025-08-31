import { listEl, pageSizeSelect, frameworkForm, modalFunctionalActions } from './config/domElements.js';
import { DEFAULT_SKELETON_COUNT } from './config/constants.js';
import { UtilityService } from './services/utility-service.js';
import { renderSkeletonItem } from './renderers.js';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function showSkeletonLoading(count = DEFAULT_SKELETON_COUNT) {
  listEl.textContent = '';
  for (let i = 0; i < count; i++) {
    listEl.appendChild(renderSkeletonItem());
  }
}

export function setupPageSizeHandler(getTable) {
  if (pageSizeSelect && !pageSizeSelect.hasAttribute('data-global-handler')) {
    pageSizeSelect.addEventListener('change', (e) => {
      const table = getTable();
      if (table) {
        table.setPageSize(parseInt(e.target.value, 10));
      }
    });
    pageSizeSelect.setAttribute('data-global-handler', 'true');
  }
}

export function setupFormValidationClearing() {
  if (!frameworkForm) return;

  // Clear validation errors when user starts typing in text inputs and textareas
  const textInputs = frameworkForm.querySelectorAll('input[type="text"], input:not([type]), textarea');
  textInputs.forEach(input => {
    // Remove any existing listeners to prevent duplicates
    input.removeEventListener('input', clearInputErrorHandler);
    input.addEventListener('input', clearInputErrorHandler);
  });

  // Clear validation errors when user selects a file
  const fileInput = frameworkForm.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.removeEventListener('change', clearInputErrorHandler);
    fileInput.addEventListener('change', clearInputErrorHandler);
  }

  // Clear validation errors when user checks/unchecks checkboxes
  const checkboxes = frameworkForm.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.removeEventListener('change', clearInputErrorHandler);
    checkbox.addEventListener('change', clearInputErrorHandler);
  });
}

export function clearInputErrorHandler(event) {
  clearInputError(event.target);
}

export function clearInputError(input) {
  input.classList.remove('invalid');
  const errorEl = input.parentElement.querySelector('.form-error');
  if (errorEl) {
    errorEl.classList.remove('visible');
  }
}

export function setModalFunctionalActions(buttons = []) {
  if (!modalFunctionalActions) return;
  modalFunctionalActions.textContent = '';
  buttons.forEach(cfg => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = cfg.id || '';
    btn.className = 'btn btn-functional';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon plus-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = cfg.label || 'Action';
    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);
    if (typeof cfg.onClick === 'function') {
      btn.addEventListener('click', cfg.onClick);
    }
    modalFunctionalActions.appendChild(btn);
  });
}
