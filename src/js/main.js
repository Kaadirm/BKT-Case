import { createStepper, getStepper } from './stepper.js';
import { createSimpleTable } from './table.js';
import { createApi } from './services/api.js';
import { FrameworkService } from './services/framework-service.js';
import { ControlItemService } from './services/control-item-service.js';
import { UtilityService } from './services/utility-service.js';
import { renderFrameworkItem } from './renderers.js';

import { API_BASE_URL, DEFAULT_SKELETON_COUNT } from './config/constants.js';
import { listEl, tableHost, tableContainer, tableToolbar, tableCardBody, tableCard, searchInput, pageSizeSelect, pageInfo, noDataState, frameworkStepper, frameworkForm, templateFile, templateFileName, newFrameworkModal, newFrameworkModalLabel, modalFunctionalActions } from './config/domElements.js';
import { showSkeletonLoading, setupPageSizeHandler, setupFormValidationClearing, clearInputErrorHandler, clearInputError, setModalFunctionalActions } from './ui-utilities.js';

// =============================================================================
// GLOBAL STATE
// =============================================================================

let table;
let currentFrameworkId = null;
let currentLoadingController = null;
let currentFrameworksController = null;
let currentFrameworkData = {};
let modalControlsTable = null; // step-2 simple table instance

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

async function loadFrameworks(options = {}) {
  try {
    // Cancel any in-flight list load
    if (currentFrameworksController) {
      currentFrameworksController.abort();
      currentFrameworksController = null;
    }
    currentFrameworksController = new AbortController();
    const items = await frameworkService.getFrameworks();

    // Clear skeleton items and render actual frameworks
    listEl.textContent = '';
    for (const item of items) {
      listEl.appendChild(renderFrameworkItem(item));
    }
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'list-empty';
      li.textContent = 'No frameworks found';
      listEl.appendChild(li);
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    const li = document.createElement('li');
    li.className = 'list-error';
    li.textContent = `Failed to load frameworks: ${UtilityService.sanitizeHtml(err.message)}`;
    listEl.appendChild(li);
  }
}

function activateItem(id) {
  listEl.querySelectorAll('.framework-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

async function openFramework(id) {
  try {
    // Abort any previous loading operation
    if (currentLoadingController) {
      currentLoadingController.abort();
      currentLoadingController = null;
    }

    currentFrameworkId = id;
    activateItem(id);

    // Hide both empty states by default when loading
    if (tableHost) {
      tableHost.classList.add('hidden');
      tableHost.style.display = 'none';
    }
    if (noDataState) {
      noDataState.classList.add('hidden');
      noDataState.style.display = 'none';
    }

    // Initially hide table elements until we know if we have data
    if (tableCardBody) tableCardBody.classList.add('hidden');
    if (tableToolbar) tableToolbar.classList.add('hidden');

    // Update page title + breadcrumb using visible item title (short name)
    const itemEl = listEl.querySelector(`.framework-item[data-id="${id}"]`);
    const displayName = itemEl?.querySelector('.item-title')?.textContent?.trim() || id;
    updatePageHeader(displayName);

    // Always show loading state when fetching data
    if (tableHost) {
      tableHost.style.display = 'none';
      tableHost.classList.add('hidden');
    }
    if (noDataState) {
      noDataState.style.display = 'none';
      noDataState.classList.add('hidden');
    }

    // Hide table card body content and show loading overlay
    if (tableCardBody) tableCardBody.classList.add('hidden');

    // Create and show loading overlay in table card
    if (tableCard) {
      // Remove any existing loading overlay
      const existingOverlay = tableCard.querySelector('.loading-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      // Create loading overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      const spinnerDiv = document.createElement('div');
      spinnerDiv.className = 'spinner';
      spinnerDiv.setAttribute('aria-label', 'Loading');
      loadingDiv.appendChild(spinnerDiv);
      loadingOverlay.appendChild(loadingDiv);

      // Ensure table card has relative positioning
      tableCard.style.position = 'relative';
      tableCard.appendChild(loadingOverlay);
    }

    // Create abort controller for this request
    currentLoadingController = new AbortController();

    const rows = await controlItemService.getControlItems(id, {
      signal: currentLoadingController.signal
    });

    // Check if this request was aborted
    if (currentLoadingController.signal.aborted) {
      return;
    }

    // Check if we have data first
    const hasData = Array.isArray(rows) && rows.length > 0;

    if (hasData) {
      // We have data - build table if needed and show it
      if (!table || !tableContainer.contains(table.wrapper)) {
        // Get the pagination container
        const pageNavContainer = document.getElementById('pageNav');

        table = createSimpleTable(tableContainer, {
          columns: [
            { key: 'controlId', label: 'Control ID', sortable: true, width: '18%' },
            { key: 'controlCategory', label: 'Control Category', sortable: true, width: '26%' },
            { key: 'controlDescription', label: 'Control Description', sortable: false, width: 'auto' }
          ],
          pageSize: parseInt(pageSizeSelect.value, 10),
          tableClass: 'custom-table',
          wrapperClass: 'custom-table-container',
          theadClass: '',
          externalInfoEl: pageInfo,
          externalPagEl: pageNavContainer,
          onReset: () => {
            // Reset both search input and clear button when new data is loaded
            const searchInput = document.getElementById('tableSearch');
            const searchClearBtn = document.getElementById('searchClear');
            if (searchInput) {
              searchInput.value = '';
            }
            if (searchClearBtn) {
              searchClearBtn.style.display = 'none';
            }
          }
        });

        // Setup table event handlers
        const debouncedFilter = UtilityService.debounce((value) => table.filter(value), 300);
        const searchClearBtn = document.getElementById('searchClear');

        // Search input handler
        searchInput.addEventListener('input', (e) => {
          const value = e.target.value;
          debouncedFilter(value);

          // Show/hide clear button
          if (searchClearBtn) {
            searchClearBtn.style.display = value ? 'flex' : 'none';
          }
        });

        // Clear search handler
        if (searchClearBtn) {
          searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            table.filter('');
            searchClearBtn.style.display = 'none';
            searchInput.focus();
          });
        }
      }

      table.load(rows);

      // Remove loading overlay and show table content
      if (tableCard) {
        const loadingOverlay = tableCard.querySelector('.loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.remove();
        }
      }

      // Show table and toolbar, hide both empty states
      tableCardBody.classList.remove('hidden');
      tableToolbar.classList.remove('hidden');
      tableContainer.style.display = '';
      if (tableHost) {
        tableHost.style.display = 'none';
        tableHost.classList.add('hidden');
      }
      if (noDataState) {
        noDataState.style.display = 'none';
        noDataState.classList.add('hidden');
      }
    } else {
      // No data - remove loading overlay and show "no data" state
      if (tableCard) {
        const loadingOverlay = tableCard.querySelector('.loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.remove();
        }
      }

      tableCardBody.classList.add('hidden');
      tableToolbar.classList.add('hidden');
      tableContainer.style.display = 'none';
      if (tableHost) {
        tableHost.style.display = 'none';
        tableHost.classList.add('hidden');
      }
      if (noDataState) {
        noDataState.style.display = 'block';
        noDataState.classList.remove('hidden');
      }
    }
    // No additional fetch here; avoid calling /frameworks/:id on click

    // Clear the loading controller since we're done
    currentLoadingController = null;

  } catch (err) {
    if (err && err.name === 'AbortError') return; // ignore aborted request
    // On error, hide the table and show empty with error message
    tableCardBody.classList.add('hidden');
    tableContainer.textContent = '';
    tableContainer.style.display = 'none';
    if (tableHost) {
      tableHost.style.display = 'block';
      tableHost.classList.remove('hidden');
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-list-content';
      const iconDiv = document.createElement('div');
      iconDiv.className = 'empty-list-icon';
      const p = document.createElement('p');
      p.className = 'empty-list-text';
      p.textContent = `Failed to load data: ${UtilityService.sanitizeHtml(err.message)}`;
      emptyDiv.appendChild(iconDiv);
      emptyDiv.appendChild(p);
      tableHost.appendChild(emptyDiv);
    }
    currentLoadingController = null;
  }
}

// =============================================================================
// ROUTING
// =============================================================================

function getRouteFrameworkId() {
  const path = window.location.pathname || '';
  const match = path.match(/\/framework\/([^\/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateToFramework(id, { replace = false } = {}) {
  // Avoid reloading the same framework
  if (currentFrameworkId === id) return;
  const url = `/framework/${encodeURIComponent(id)}`;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ frameworkId: id }, '', url);
  openFramework(id);
}

function updatePageHeader(selectedName = null) {
  const titleEl = document.querySelector('.info-title');
  if (titleEl) {
    titleEl.textContent = selectedName ? `Compliance Frameworks: ${selectedName}` : 'Compliance Frameworks';
  }

  const breadcrumbOl = document.querySelector('.info-header nav.breadcrumb ol');
  if (breadcrumbOl) {
    const existing = breadcrumbOl.querySelector('li[aria-current="page"]');
    if (existing) existing.remove();
    if (selectedName) {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';
      li.setAttribute('aria-current', 'page');
      const anchor = document.createElement('a');
      anchor.href = window.location.pathname;
      anchor.textContent = selectedName;
      li.appendChild(anchor);
      breadcrumbOl.appendChild(li);
    }
  }
}

// =============================================================================
// MODAL MANAGEMENT
// =============================================================================

function ensureStepperInstance() {
  if (!frameworkStepper) return null;

  // Check if stepper already exists
  let stepper = getStepper(frameworkStepper);
  if (!stepper) {
    // Create new stepper with functional approach
    stepper = createStepper(frameworkStepper, {
      onChange: (from, to) => {
        updateModalTitle(to);
        updateModalButtons(to);
        updateStepContent(to);
      },
      onValidate: (from, to) => {
        // Custom validation for framework modal
        if (to > from) {
          switch (from) {
            case 1: // Framework Details step
              return validateFrameworkDetails();
            case 2: // Control Items step
              return validateControlItems();
            default:
              return true;
          }
        }
        return true;
      },
      onBeforeStepChange: (from, to) => {
        // Save current step data before moving
        saveCurrentStepData(from);
        return true;
      }
    });
  }
  return stepper;
}

function updateModalTitle(step) {
  const stepIndicator = newFrameworkModalLabel?.querySelector('.step-indicator');
  if (stepIndicator) {
    stepIndicator.textContent = `${step}/2`;
  }
}

function updateModalButtons(step) { /* managed by stepper.js updateNavigation */ }

function validateFrameworkDetails() {
  if (!frameworkForm) return true;

  const isValid = frameworkForm.checkValidity();
  if (!isValid) {
    // Show validation errors
    const invalidInputs = frameworkForm.querySelectorAll(':invalid');
    invalidInputs.forEach(input => {
      input.classList.add('invalid');
      const errorEl = input.parentElement.querySelector('.form-error');
      if (errorEl) {
        errorEl.classList.add('visible');
      }
    });
  }
  return isValid;
}

function validateControlItems() {
  // For now, always allow moving from control items step
  // Add validation logic here if needed
  return true;
}

function saveCurrentStepData(step) {
  switch (step) {
    case 1: // Framework Details
      if (frameworkForm) {
        const formData = new FormData(frameworkForm);
        currentFrameworkData = {
          ...currentFrameworkData,
          name: formData.get('name'),
          shortName: formData.get('shortName'),
          description: formData.get('description')
        };
      }
      break;
    case 2: // Control Items
      // Save control items data if needed
      break;
  }
}

function updateStepContent(stepIndex) {
  // Steps are 1-based in the stepper
  switch (stepIndex) {
    case 1: // Framework Details
      updateFrameworkDetailsStep();
      break;
    case 2: // Control Items
      updateControlItemsStep();
      break;
    default:
      break;
  }
}

function updateFrameworkDetailsStep() {
  // Setup file upload handler
  if (templateFile && !templateFile.dataset.initialized) {
    templateFile.dataset.initialized = 'true';

    templateFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (templateFileName) {
        templateFileName.textContent = file ? file.name : '';
      }
    });
  }
}

function updateControlItemsStep() {
  // Render a simple controls table (dummy data, no search/sort/pagination/info)
  // Resolve host container inside Step 2
  const step2El = document.querySelector('#frameworkStepper .step[data-index="2"]');
  const host = step2El ? step2El.querySelector('.custom-table-container') : null;

  // Build once; require host only on first build
  if (!modalControlsTable) {
    if (!host) return; // cannot mount without a host

    // Force external info element to avoid rendering internal footer/pagination
    const dummyInfo = document.createElement('div');

    modalControlsTable = createSimpleTable(host, {
      columns: [
        { key: 'controlId', label: 'Control ID', sortable: false },
        { key: 'controlCategory', label: 'Control Category', sortable: false },
        { key: 'controlDescription', label: 'Control Description', sortable: false },
        {
          key: '__actions', label: 'Actions', sortable: false, render: (_v, row) => {
            // Visual-only action buttons (no handlers)
            const showEdit = (row.showEdit === false) ? false : !row.approved;
            const editBtn = showEdit ? `
            <button type="button" title="Edit" aria-label="Edit ${row.controlId}"
              class="btn-action edit">
              <span class="edit-icon" aria-hidden="true"></span>
            </button>` : '';
            const approveBtn = row.approved ? `
            <button type="button" title="Approved" aria-label="Approved ${row.controlId}"
              class="btn-action approve">
              <span class="approved-icon" aria-hidden="true"></span>
            </button>` : '';
            const deleteBtn = `
            <button type="button" title="Delete" aria-label="Delete ${row.controlId}"
              class="btn-action delete">
              <span class="delete-icon" aria-hidden="true"></span>
            </button>`;
            return `<div class="cell-actions text-end">${editBtn}${approveBtn}${deleteBtn}</div>`;
          }
        }
      ],
      pageSize: 1000000, // effectively disable pagination
      tableClass: 'custom-table',
      wrapperClass: 'custom-table-container',
      theadClass: '',
      externalInfoEl: dummyInfo // prevent internal footer rendering
    });
  }

  // Dummy data for display
  const dummyRows = [
    {
      controlId: 'Article I-0-1.1',
      controlCategory: 'Article I, Business Contact Information',
      controlDescription: "Company and Supplier may Process the other's BCI wherever they do business in connection with Supplier's delivery of Services and Deliverables.",
      approved: false
    },
    {
      controlId: 'Article I-0-1.2',
      controlCategory: 'Article I, Business Contact Information',
      controlDescription: "A party: (a) will not use or disclose the other party's BCI for any other purpose (for clarity, neither party will Sell the other's BCI or use or disclose the other's BCI for any marketing purpose without the other party's prior written consent, and where required, the prior written consent of affected Data Subjects), and (b) will delete, modify, correct, return, provide information about the Processing of, restrict the Processing of, or take any other reasonably requested action in respect of the other's BCI, promptly on written request from the other party.",
      approved: false
    },
    {
      controlId: 'Article I-0-1.2',
      controlCategory: 'Article I, Business Contact Information',
      controlDescription: 'The parties are not entering a joint Controller relationship regarding each other\'s BCI and no provision of the Transaction Document will be interpreted or construed as indicating any intent to establish a joint Controller relationship.',
      approved: true
    },
    {
      controlId: 'Article I-0-1.3',
      controlCategory: 'Article I, Business Contact Information',
      controlDescription: "This Article applies if Supplier Processes Company Data, other than Company's BCI. Supplier will comply with the requirements of this Article in providing all Services and Deliverables, and by doing so protect Company Data against loss, destruction, alteration, accidental or unauthorized disclosure, accidental or unauthorized access, and unlawful forms of Processing. The requirements of this Article extend to all IT applications, platforms, and infrastructure that Supplier operates or manages in providing Deliverables and Services, including all development, testing, hosting, support, operations, and data center environments.",
      approved: false
    },
    {
      controlId: 'Article II-0-1.1',
      controlCategory: 'Article II, Technical and Organizational Measures',
      controlDescription: 'The parties are not entering a joint Controller relationship regarding each other\'s BCI and no provision of the Transaction Document will be interpreted or construed as indicating any intent to establish a joint Controller relationship.',
      approved: false
    }
  ];

  // Load/update data (works across repeated visits to step 2)
  if (modalControlsTable) {
    modalControlsTable.load(dummyRows);
  }
}

function resetFrameworkForm() {
  if (frameworkForm) {
    frameworkForm.reset();
    // Clear validation errors
    const invalidInputs = frameworkForm.querySelectorAll('.invalid');
    invalidInputs.forEach(input => {
      input.classList.remove('invalid');
      const errorEl = input.parentElement.querySelector('.form-error');
      if (errorEl) {
        errorEl.classList.remove('visible');
      }
    });
  }

  const tableBody = document.querySelector('#newFwItemsTable tbody');
  if (tableBody) tableBody.textContent = '';

  // Clear file input and filename display
  if (templateFile) templateFile.value = '';
  if (templateFileName) templateFileName.textContent = '';

  currentFrameworkData = {};
  // uploadedTemplate = null;
  // Reset step-2 dummy table instance and clear its host container
  modalControlsTable = null;
  const step2HostTable = document.getElementById('newFwItemsTable');
  const step2Host = step2HostTable ? step2HostTable.parentElement : null;
  if (step2Host) {
    // Restore original skeleton table structure to keep DOM predictable
    step2Host.innerHTML = `
      <table class="custom-table" id="newFwItemsTable">
        <thead>
          <tr>
            <th style="width: 160px;">Control ID</th>
            <th style="width: 240px;">Control Category</th>
            <th>Control Description</th>
            <th class="text-end" style="width: 100px;">Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>`;
  }

  // Reset stepper to first step will be handled by openModal function
}

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
    currentFrameworkId = null;
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

window.openNewFrameworkModal = function () {
  if (!newFrameworkModal) return;
  newFrameworkModal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Reset form and data
  resetFrameworkForm();

  // Clear validation errors
  if (frameworkForm) {
    // Re-setup form validation clearing after reset
    setupFormValidationClearing();
  }

  // Initialize stepper
  const stepper = ensureStepperInstance();
  if (stepper) {
    stepper.reset(); // Go to step 1
  }

  // Optionally set functional actions here if needed

  // Focus first input
  setTimeout(() => {
    const firstInput = newFrameworkModal.querySelector('input[name="name"]');
    if (firstInput) {
      firstInput.focus();
    }
  }, 100);
};

window.closeNewFrameworkModal = function () {
  if (!newFrameworkModal) return;
  newFrameworkModal.style.display = 'none';
  document.body.style.overflow = '';

  // Reset stepper and data
  const stepper = getStepper(frameworkStepper);
  if (stepper) {
    stepper.reset();
  }
  resetFrameworkForm();
};

// Expose for extensibility
window.setModalFunctionalActions = setModalFunctionalActions;

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

async function initializeApp() {
  // Setup global handlers
  setupPageSizeHandler(() => table);
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
