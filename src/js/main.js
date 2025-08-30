import { createStepper, getStepper } from './stepper.js';
import { createSimpleTable } from './table.js';
import { createApi } from './services/api.js';
import { createFrameworkService } from './services/framework-service.js';
import { ControlItemService } from './services/control-item-service.js';
import fileUploadService from './services/file-upload-service.js';
import { UtilityService } from './services/utility-service.js';
import { renderFrameworkItem, renderSkeletonItem } from './renderers.js';

// Initialize services
const api = createApi({ serviceBase: 'https://bk-backend.vercel.app/api/v1' });
const frameworkService = createFrameworkService(api);
const controlItemService = ControlItemService(api);

// Framework list + table init
const listEl = document.getElementById('frameworkList');
const tableHost = document.getElementById('tableHost');
const tableContainer = document.getElementById('tableContainer');
const tableToolbar = document.getElementById('tableToolbar');
const tableCardBody = document.querySelector('.table-card-body');
const tableCard = document.querySelector('.table-card');
const searchInput = document.getElementById('tableSearch');
const pageSizeSelect = document.getElementById('pageSize');
const pageInfo = document.getElementById('pageInfo');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');

let table;
let currentFrameworkId = null;
let currentLoadingController = null;
let currentFrameworksController = null;

// Global page size handler setup
function setupPageSizeHandler() {
  if (pageSizeSelect && !pageSizeSelect.hasAttribute('data-global-handler')) {
    pageSizeSelect.addEventListener('change', (e) => {
      if (table) {
        table.setPageSize(parseInt(e.target.value, 10));
      }
    });
    pageSizeSelect.setAttribute('data-global-handler', 'true');
  }
}

function showSkeletonLoading(count = 5) {
  listEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    listEl.appendChild(renderSkeletonItem());
  }
}

async function loadFrameworks(options = {}) {
  try {
    // Show skeleton loading state
    showSkeletonLoading(8);

    // Cancel any in-flight list load
    if (currentFrameworksController) {
      currentFrameworksController.abort();
      currentFrameworksController = null;
    }
    currentFrameworksController = new AbortController();
    const items = await frameworkService.getFrameworks();

    // Clear skeleton items
    listEl.innerHTML = '';

    for (const item of items) {
      listEl.appendChild(renderFrameworkItem(item));
    }

    if (items.length === 0) {
      listEl.innerHTML = '<li class="list-empty">No frameworks found</li>';
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    listEl.innerHTML = `<li class="list-error">Failed to load frameworks: ${err.message}</li>`;
  }
}

function activateItem(id) {
  listEl.querySelectorAll('.framework-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

async function openFramework(id) {
  try {
    // Get DOM elements once at the beginning
    const noDataState = document.getElementById('noDataState');

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
      loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        z-index: 10;
      `;
      loadingOverlay.innerHTML = '<div class="loading"><div class="spinner" aria-label="Loading"></div></div>';

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
    tableContainer.innerHTML = '';
    tableContainer.style.display = 'none';
    if (tableHost) {
      tableHost.style.display = 'block';
      tableHost.classList.remove('hidden');
      tableHost.innerHTML = `<div class="empty-list-content"><div class="empty-list-icon"></div><p class="empty-list-text">Failed to load data: ${UtilityService.sanitizeHtml(err.message)}</p></div>`;
    }
    currentLoadingController = null;
  }
}

// --- Client-side routing ---
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

// Keep page header and breadcrumb in sync with current selection
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

// Click handlers for framework list
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

window.addEventListener('popstate', () => {
  const id = getRouteFrameworkId();
  if (id) {
    openFramework(id);
  } else {
    // No framework selected - reset to initial state
    currentFrameworkId = null;
    updatePageHeader(null);

    // Hide table and show "select framework" state
    const noDataState = document.getElementById('noDataState');
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

// Modal stepper wiring - using functional approach
let currentFrameworkData = {};
let uploadedTemplate = null;

function ensureStepperInstance() {
  const stepperRoot = document.getElementById('frameworkStepper');
  if (!stepperRoot) return null;

  // Check if stepper already exists
  let stepper = getStepper(stepperRoot);
  if (!stepper) {
    // Create new stepper with functional approach
    stepper = createStepper(stepperRoot, {
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
  const modalTitle = document.getElementById('newFrameworkModalLabel');
  const stepIndicator = modalTitle?.querySelector('.step-indicator');

  if (stepIndicator) {
    stepIndicator.textContent = `${step}/2`;
  }
}

function updateModalButtons(step) {
  const saveBtn = document.getElementById('saveFrameworkBtn');
  const nextBtn = document.querySelector('[data-stepper-control="next"][data-stepper-target="#frameworkStepper"]');
  const prevBtn = document.querySelector('[data-stepper-control="prev"][data-stepper-target="#frameworkStepper"]');

  if (saveBtn) {
    saveBtn.classList.toggle('hidden', step !== 2);
  }

  if (nextBtn) {
    nextBtn.classList.toggle('hidden', step === 2);
    // Update button text based on step
    const buttonText = step === 1 ? 'Next › Control Items' : 'Next';
    nextBtn.innerHTML = buttonText;
  }

  if (prevBtn) {
    prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
  }
}

function validateFrameworkDetails() {
  const form = document.getElementById('frameworkForm');
  if (!form) return true;

  const isValid = form.checkValidity();
  if (!isValid) {
    // Show validation errors
    const invalidInputs = form.querySelectorAll(':invalid');
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
      const form = document.getElementById('frameworkForm');
      if (form) {
        const formData = new FormData(form);
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
  switch (stepIndex) {
    case 0: // Framework Details
      updateFrameworkDetailsStep();
      break;
    case 1: // Control Items
      updateControlItemsStep();
      break;
    case 2: // Review
      updateReviewStep();
      break;
  }
}

function updateFrameworkDetailsStep() {
  // Setup file upload handler
  const fileInput = document.getElementById('templateFile');
  const filePreview = document.getElementById('filePreview');

  if (fileInput && !fileInput.dataset.initialized) {
    fileInput.dataset.initialized = 'true';

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) {
        filePreview.innerHTML = '';
        uploadedTemplate = null;
        return;
      }

      // Validate file
      const errors = fileUploadService.validateFile(file, 'template');
      if (errors.length > 0) {
        fileInput.value = '';
        return;
      }

      // Show file info
      const fileInfo = fileUploadService.getFileInfo(file);
      filePreview.innerHTML = `
        <div class="file-info">
          <span class="file-icon" aria-hidden="true">📄</span>
          <strong>${UtilityService.sanitizeHtml(fileInfo.name)}</strong><br>
          <small>Size: ${fileInfo.sizeFormatted}</small>
        </div>
      `;

      uploadedTemplate = file;

      // Try to parse template for control items
      if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        const content = await fileUploadService.readFile(file);
        if (Array.isArray(content)) {
          currentFrameworkData.controlsFromTemplate = content;
        }
      }
    });
  }
}

function updateControlItemsStep() {
  // Load existing items or template items
  const tableBody = document.querySelector('#newFwItemsTable tbody');
  if (!tableBody) return;

  // Clear existing rows
  tableBody.innerHTML = '';

  // Add items from template if available
  if (currentFrameworkData.controlsFromTemplate) {
    currentFrameworkData.controlsFromTemplate.forEach(item => {
      addItemToTable(item);
    });
  }
}

function addItemToTable(item) {
  const tableBody = document.querySelector('#newFwItemsTable tbody');
  if (!tableBody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${UtilityService.sanitizeHtml(item.controlId || '')}</td>
    <td>${UtilityService.sanitizeHtml(item.controlCategory || '')}</td>
    <td>${UtilityService.sanitizeHtml(item.controlDescription || '')}</td>
    <td class="cell-actions">
      <button class="icon-btn" title="Edit">✏️</button>
      <button class="icon-btn"  title="Delete">🗑️</button>
    </td>
  `;
  tableBody.appendChild(tr);
}

function updateReviewStep() {
  const form = document.getElementById('frameworkForm');
  if (!form) return;

  const formData = new FormData(form);
  const tableRows = Array.from(document.querySelectorAll('#newFwItemsTable tbody tr'));

  currentFrameworkData = {
    name: formData.get('name'),
    shortName: formData.get('shortName'),
    description: formData.get('description'),
    template: uploadedTemplate,
    controls: tableRows.map(row => {
      const cells = row.querySelectorAll('td');
      return {
        controlId: cells[0].textContent.trim(),
        controlCategory: cells[1].textContent.trim(),
        controlDescription: cells[2].textContent.trim()
      };
    })
  };

  // Display review information
  const reviewContainer = document.getElementById('reviewContent');
  if (reviewContainer) {
    reviewContainer.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <h6>Framework Details</h6>
          <table class="table table-sm">
            <tr><td><strong>Name:</strong></td><td>${UtilityService.sanitizeHtml(currentFrameworkData.name || '')}</td></tr>
            <tr><td><strong>Short Name:</strong></td><td>${UtilityService.sanitizeHtml(currentFrameworkData.shortName || '')}</td></tr>
            <tr><td><strong>Description:</strong></td><td>${UtilityService.sanitizeHtml(currentFrameworkData.description || '')}</td></tr>
            <tr><td><strong>Template:</strong></td><td>${currentFrameworkData.template ? currentFrameworkData.template.name : 'None'}</td></tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6>Control Items</h6>
          <p><strong>${currentFrameworkData.controls.length}</strong> control items will be created</p>
          ${currentFrameworkData.controls.length > 0 ? `
            <div style="max-height: 200px; overflow-y: auto;">
              <ul class="plain-list">
                ${currentFrameworkData.controls.map(control =>
      `<li class="plain-list-item">
                    <small><strong>${UtilityService.sanitizeHtml(control.controlId)}</strong><br>
                    ${UtilityService.truncate(control.controlDescription, 60)}</small>
                  </li>`
    ).join('')}
              </ul>
            </div>
          ` : '<p class="muted">No control items added</p>'}
        </div>
      </div>
    `;
  }
}

ensureStepperInstance();

// Save handler - creates framework with all data
const saveBtn = document.getElementById('saveFrameworkBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    // Validate framework data
    if (!currentFrameworkData.name?.trim()) {
      return;
    }

    if (!currentFrameworkData.shortName?.trim()) {
      return;
    }

    // Create framework
    const result = await frameworkService.createFramework(currentFrameworkData);

    // Refresh list after create
    await loadFrameworks();

    // Close modal
    closeNewFrameworkModal();

    // Reset form
    resetFrameworkForm();
  });
}

function resetFrameworkForm() {
  const form = document.getElementById('frameworkForm');
  if (form) {
    form.reset();
    // Clear validation errors
    const invalidInputs = form.querySelectorAll('.invalid');
    invalidInputs.forEach(input => {
      input.classList.remove('invalid');
      const errorEl = input.parentElement.querySelector('.form-error');
      if (errorEl) {
        errorEl.classList.remove('visible');
      }
    });
  }

  const tableBody = document.querySelector('#newFwItemsTable tbody');
  if (tableBody) tableBody.innerHTML = '';

  const filePreview = document.getElementById('filePreview');
  if (filePreview) filePreview.innerHTML = '';

  currentFrameworkData = {};
  uploadedTemplate = null;

  // Reset stepper to first step will be handled by openModal function
}

// Search functionality
// Framework search/status removed: filtering belongs to controls only.

// Add refresh button functionality
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    await loadFrameworks();
  });
}

// Initialize keyboard shortcuts
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

// Initialize tooltips

// Error handling for uncaught errors
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

// Initialize the application
async function initializeApp() {
  // Setup global handlers
  setupPageSizeHandler();

  // Load initial frameworks
  await loadFrameworks();
  // If URL already points to a framework, open it
  const initialId = getRouteFrameworkId();
  if (initialId) {
    openFramework(initialId);
  } else {
    // No framework selected on initial load - ensure correct empty state is shown
    updatePageHeader(null);
    const noDataState = document.getElementById('noDataState');

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

// Custom modal functions
window.openNewFrameworkModal = function () {
  const modal = document.getElementById('newFrameworkModal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Reset form and data
    resetFrameworkForm();

    // Clear validation errors
    const form = document.getElementById('frameworkForm');
    if (form) {
    }

    // Initialize stepper
    const stepper = ensureStepperInstance();
    if (stepper) {
      stepper.reset(); // Go to step 1
    }

    // Focus first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input[name="name"]');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }
};

window.closeNewFrameworkModal = function () {
  const modal = document.getElementById('newFrameworkModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';

    // Reset stepper and data
    const stepper = getStepper(document.getElementById('frameworkStepper'));
    if (stepper) {
      stepper.reset();
    }
    resetFrameworkForm();
  }
};

// Start the application
initializeApp();
