import { createStepper, getStepper } from './stepper.js';
import { createSimpleTable } from './table.js';
import { createApi } from './services/api.js';
import { FrameworkService } from './services/framework-service.js';
import { ControlItemService } from './services/control-item-service.js';
import { UtilityService } from './services/utility-service.js';
import { renderFrameworkItem } from './renderers.js';
import { FrameworkManager } from './framework-manager.js';
import { ModalManager } from './modal-manager.js';

import { API_BASE_URL, DEFAULT_SKELETON_COUNT } from './config/constants.js';
import { listEl, tableHost, tableContainer, tableToolbar, tableCardBody, tableCard, searchInput, pageSizeSelect, pageInfo, noDataState, frameworkStepper, frameworkForm, templateFile, templateFileName, newFrameworkModal, newFrameworkModalLabel, modalFunctionalActions } from './config/domElements.js';
import { showSkeletonLoading, setupPageSizeHandler, setupFormValidationClearing, clearInputErrorHandler, clearInputError, setModalFunctionalActions } from './ui-utilities.js';

// =============================================================================
// GLOBAL STATE
// =============================================================================

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize services
const api = createApi({ serviceBase: API_BASE_URL });
const frameworkService = FrameworkService(api);
const controlItemService = ControlItemService(api);

// Show skeleton loading immediately when script loads
showSkeletonLoading(DEFAULT_SKELETON_COUNT);

// =============================================================================
// FRAMEWORK MANAGEMENT
// =============================================================================

// Initialize managers
const frameworkManager = FrameworkManager({
  frameworkService,
  controlItemService,
  renderFrameworkItem,
  UtilityService,
  createSimpleTable,
  listEl,
  tableContainer,
  tableHost,
  tableCard,
  tableCardBody,
  pageSizeSelect,
  pageInfo,
  noDataState
});

const modalManager = ModalManager({
  frameworkStepper,
  createStepper,
  getStepper,
  frameworkForm,
  templateFile,
  templateFileName,
  newFrameworkModal,
  newFrameworkModalLabel,
  createSimpleTable,
  UtilityService,
  setupFormValidationClearing
});

// =============================================================================
// ROUTING
// =============================================================================

const getRouteFrameworkId = frameworkManager.getRouteFrameworkId;
const navigateToFramework = frameworkManager.navigateToFramework;
const updatePageHeader = frameworkManager.updatePageHeader;
const loadFrameworks = frameworkManager.loadFrameworks;
const openFramework = frameworkManager.openFramework;

// =============================================================================
// MODAL MANAGEMENT
// =============================================================================

const ensureStepperInstance = modalManager.ensureStepperInstance;

const openNewFrameworkModal = modalManager.openNewFrameworkModal;
const closeNewFrameworkModal = modalManager.closeNewFrameworkModal;
const resetFrameworkForm = modalManager.resetFrameworkForm;

// =============================================================================
// EVENT HANDLERS
// =============================================================================

// Framework list event handlers
listEl.addEventListener('click', (e) => {
  const link = e.target.closest('.framework-item');
  if (!link) return;
  e.preventDefault();
  const id = link.dataset.id;
  if (!id) return;
  navigateToFramework(id);
});

listEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const item = e.target.closest('.framework-item');
    if (item) {
      e.preventDefault();
      navigateToFramework(item.dataset.id);
    }
  }
});

// Browser navigation
window.addEventListener('popstate', () => {
  const id = getRouteFrameworkId();
  if (id) {
    openFramework(id);
  } else {
    // No framework selected - reset to initial state
    // clear selection via manager
    frameworkManager.activateItem(null);
    updatePageHeader(null);

    // Hide table and show "select framework" state
    if (tableCardBody) tableCardBody.classList.add('hidden');
    if (tableContainer) tableContainer.style.display = 'none';
    if (tableToolbar) tableToolbar.classList.add('hidden');

    // Show the initial "select framework" state
    if (tableHost) {
      tableHost.style.display = 'block';
      tableHost.classList.remove('hidden');
    }
    // Hide the "no data" state
    if (noDataState) {
      noDataState.style.display = 'none';
      noDataState.classList.add('hidden');
    }

    // Clear active framework selection
    listEl.querySelectorAll('.framework-item').forEach(el => el.classList.remove('active'));
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('frameworkSearch') || document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  // Ctrl/Cmd + N for new framework
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openNewFrameworkModal();
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    closeNewFrameworkModal();
  }
});

// Error handling
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

// =============================================================================
// MODAL FUNCTIONS (EXPOSED GLOBALLY)
// =============================================================================

window.openNewFrameworkModal = openNewFrameworkModal;
window.closeNewFrameworkModal = closeNewFrameworkModal;
// Expose for extensibility
window.setModalFunctionalActions = setModalFunctionalActions;

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

async function initializeApp() {
  // Setup global handlers
  setupPageSizeHandler(() => frameworkManager.getTable());
  setupFormValidationClearing();

  if (templateFile && templateFileName) {
    templateFile.addEventListener('change', function () {
      templateFileName.textContent = templateFile.files && templateFile.files.length > 0 ? templateFile.files[0].name : 'No file chosen';
    });
  }

  // Load initial frameworks
  await loadFrameworks();
  // If URL already points to a framework, open it
  const initialId = getRouteFrameworkId();
  if (initialId) {
    openFramework(initialId);
  } else {
    // No framework selected on initial load - ensure correct empty state is shown
    updatePageHeader(null);

    // Show the initial "select framework" state
    if (tableHost) {
      tableHost.style.display = 'block';
      tableHost.classList.remove('hidden');
    }
    // Hide the "no data" state
    if (noDataState) {
      noDataState.style.display = 'none';
      noDataState.classList.add('hidden');
    }
    // Hide table related elements
    if (tableCardBody) tableCardBody.classList.add('hidden');
    if (tableToolbar) tableToolbar.classList.add('hidden');
  }
}

// Start the application
ensureStepperInstance();
initializeApp();
