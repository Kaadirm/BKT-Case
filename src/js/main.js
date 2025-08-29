import { createStepper, getStepper } from './stepper.js';
import { SimpleTable } from './table.js';
import { Api } from './services/api.js';
import { FrameworkService } from './services/framework-service.js';
import { ControlItemService } from './services/control-item-service.js';
import { FileUploadService } from './services/file-upload-service.js';
import { UtilityService } from './services/utility-service.js';

// Initialize services
const api = new Api({ serviceBase: 'https://bk-backend.vercel.app/api/v1' });
const frameworkService = new FrameworkService(api);
const controlItemService = new ControlItemService(api);
const fileUploadService = new FileUploadService();

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

function renderFrameworkItem(item) {
  const li = document.createElement('li');
  // Normalize item fields in case service returns different keys
  const id = item.id ?? item._id ?? item.slug ?? String(item.name || '');
  const name = item.name ?? item.title ?? id;
  const shortName = item.shortName ?? name;
  const description = item.description ?? item.subtitle ?? '';
  const status = item.status ?? '';

  // Map status to display text and CSS class
  const statusMapping = {
    'published': { text: 'Published', class: 'status-published', icon: '✓' },
    'ready-to-publish': { text: 'Ready to Publish', class: 'status-ready-to-publish', icon: 'ⓘ' },
    'ready-to-map': { text: 'Ready to Map', class: 'status-ready-to-map', icon: 'ⓘ' },
    'mapping-in-progress': { text: 'Mapping in Progress', class: 'status-mapping-in-progress', icon: 'ⓘ' },
    'mapping-failed': { text: 'Mapping Failed', class: 'status-mapping-failed', icon: '✗' },
    'deactivated': { text: 'Deactivated', class: 'status-deactivated', icon: '⊘' },
    'draft': { text: 'Draft', class: 'status-draft', icon: '◐' }
  };

  const statusInfo = statusMapping[status] || { text: status, class: 'status-default', icon: '◐' };
  const icon = item.icon || 'icon-grid';

  // Create the anchor element
  const anchor = document.createElement('a');
  anchor.className = 'framework-item';
  anchor.dataset.id = id;
  anchor.href = `/framework/${encodeURIComponent(id)}`;
  anchor.setAttribute('aria-label', `Open ${name}`);

  // Create main container
  const mainDiv = document.createElement('div');
  mainDiv.className = 'item-container';

  // Create avatar
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  const iconElement = document.createElement('i');
  iconElement.className = `icon ${icon}`;
  avatarDiv.appendChild(iconElement);

  // Create content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'item-content';

  // Create category label (this will show "Custom Framework" or "System Framework")
  const categoryDiv = document.createElement('div');
  categoryDiv.className = 'item-category';
  categoryDiv.textContent = item.isEnterprise ? 'Enterprise Framework' : 'Custom Framework';
  contentDiv.appendChild(categoryDiv);

  // Create header row
  const headerDiv = document.createElement('div');
  headerDiv.className = 'item-header';

  // Create name element (using shortName for display)
  const nameDiv = document.createElement('div');
  nameDiv.className = 'item-title';
  nameDiv.textContent = shortName;
  headerDiv.appendChild(nameDiv);

  // Create subtitle (description)
  const subtitleDiv = document.createElement('div');
  subtitleDiv.className = 'item-subtitle';
  subtitleDiv.textContent = description;
  // Place subtitle within the same header container as title
  headerDiv.appendChild(subtitleDiv);

  // Create status chip if status exists
  if (status) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `item-status ${statusInfo.class}`;

    // Create status icon
    const statusIconDiv = document.createElement('div');
    statusIconDiv.className = 'status-icon';
    statusDiv.appendChild(statusIconDiv);

    // Create status text
    const statusTextDiv = document.createElement('div');
    statusTextDiv.className = 'status-text';
    statusTextDiv.textContent = statusInfo.text;
    statusDiv.appendChild(statusTextDiv);

    anchor.appendChild(statusDiv);
  }

  // Assemble the structure
  contentDiv.appendChild(headerDiv);
  mainDiv.appendChild(avatarDiv);
  mainDiv.appendChild(contentDiv);
  anchor.appendChild(mainDiv);
  li.appendChild(anchor);

  return li;
}

function renderSkeletonItem() {
  const li = document.createElement('li');

  // Create the anchor element with skeleton class
  const anchor = document.createElement('a');
  anchor.className = 'framework-item skeleton';

  // Create main container
  const mainDiv = document.createElement('div');
  mainDiv.className = 'item-container';

  // Create skeleton avatar
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';

  // Create skeleton content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'item-content';

  // Create skeleton category label
  const categoryDiv = document.createElement('div');
  categoryDiv.className = 'item-category';
  categoryDiv.textContent = 'Loading...';
  contentDiv.appendChild(categoryDiv);

  // Create skeleton header row
  const headerDiv = document.createElement('div');
  headerDiv.className = 'item-header';

  // Create skeleton title
  const nameDiv = document.createElement('div');
  nameDiv.className = 'item-title';
  nameDiv.textContent = 'Loading Framework';
  headerDiv.appendChild(nameDiv);

  // Create skeleton subtitle
  const subtitleDiv = document.createElement('div');
  subtitleDiv.className = 'item-subtitle';
  subtitleDiv.textContent = 'Loading description...';
  headerDiv.appendChild(subtitleDiv);

  // Create skeleton status chip
  const statusDiv = document.createElement('div');
  statusDiv.className = 'item-status';

  const statusIconDiv = document.createElement('div');
  statusIconDiv.className = 'status-icon';
  statusDiv.appendChild(statusIconDiv);

  const statusTextDiv = document.createElement('div');
  statusTextDiv.className = 'status-text';
  statusTextDiv.textContent = 'Loading';
  statusDiv.appendChild(statusTextDiv);

  // Assemble the structure
  contentDiv.appendChild(headerDiv);
  mainDiv.appendChild(avatarDiv);
  mainDiv.appendChild(contentDiv);
  anchor.appendChild(mainDiv);
  anchor.appendChild(statusDiv);
  li.appendChild(anchor);

  return li;
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

        table = new SimpleTable(tableContainer, {
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

// Control item management functions
window.editControlItem = async function (controlId) {
  if (!currentFrameworkId) return;

  const controls = await controlItemService.getControlItems(currentFrameworkId);
  const control = controls.find(c => c.controlId === controlId);

  if (!control) {
    return;
  }

  // Show edit modal or inline editing
  showControlItemEditModal(control);
};

window.deleteControlItem = async function (controlId) {
  if (!currentFrameworkId) return;

  await controlItemService.deleteControlItem(currentFrameworkId, controlId);
  // Refresh table
  await openFramework(currentFrameworkId);
};

window.addNewControlItem = function () {
  showControlItemEditModal();
};


function showControlItemEditModal(control = null) {
  const isEdit = !!control;
  const modalTitle = isEdit ? 'Edit Control Item' : 'Add New Control Item';

  // Create modal HTML
  const modalHtml = `
    <div class="app-modal" id="controlItemModal" role="dialog" aria-modal="true" aria-labelledby="controlItemModalLabel">
      <div class="app-modal-backdrop" data-close="true"></div>
      <div class="app-modal-dialog">
        <div class="app-modal-header">
          <h5 class="app-modal-title" id="controlItemModalLabel">${modalTitle}</h5>
          <button type="button" class="app-modal-close" data-close="true" aria-label="Close">×</button>
        </div>
        <div class="app-modal-body">
            <form id="controlItemForm">
              <div class="field">
                <label for="controlId" class="input-label">Control ID *</label>
                <input type="text" class="input-field" id="controlId" name="controlId" required
                       value="${control?.controlId || ''}" ${isEdit ? 'readonly' : ''}>
              </div>
              <div class="field">
                <label for="controlCategory" class="input-label">Control Category *</label>
                <input type="text" class="input-field" id="controlCategory" name="controlCategory" required
                       value="${control?.controlCategory || ''}" list="categoryDatalist">
                <datalist id="categoryDatalist"></datalist>
              </div>
              <div class="field">
                <label for="controlDescription" class="input-label">Control Description *</label>
                <textarea class="input-field" id="controlDescription" name="controlDescription" rows="4" required>${control?.controlDescription || ''}</textarea>
              </div>
            </form>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="secondary-button" data-close="true">Cancel</button>
          <button type="button" class="primary-button" id="saveControlItemBtn">${isEdit ? 'Update' : 'Add'}</button>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('controlItemModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Show modal (custom)
  const modalEl = document.getElementById('controlItemModal');
  const closeModal = () => modalEl && modalEl.remove();
  modalEl.addEventListener('click', (e) => { if (e.target.dataset.close === 'true') closeModal(); });
  document.addEventListener('keydown', function onEsc(ev) { if (ev.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEsc); } });

  // Load categories for datalist
  loadControlCategories();

  // Setup save handler
  document.getElementById('saveControlItemBtn').addEventListener('click', async () => {
    const saveBtn = document.getElementById('saveControlItemBtn');
    const originalText = saveBtn.textContent;

    // Show loading state
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';

    try {
      await saveControlItem(isEdit, control?.controlId);
      closeModal();
    } catch (error) {
      // Error handling is done in saveControlItem
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  });

  // No-op (modal is already visible by insertion); cleanup handled by closeModal
}

async function loadControlCategories() {
  if (!currentFrameworkId) return;

  try {
    const categories = await controlItemService.getControlCategories(currentFrameworkId);
    const datalist = document.getElementById('categoryDatalist');

    if (datalist) {
      datalist.innerHTML = categories.map(cat => `<option value="${UtilityService.sanitizeHtml(cat)}"></option>`).join('');
    }
  } catch (error) {
    console.warn('Failed to load categories:', error);
  }
}

async function saveControlItem(isEdit, originalControlId) {
  const form = document.getElementById('controlItemForm');
  const formData = new FormData(form);

  const controlItem = {
    controlId: formData.get('controlId'),
    controlCategory: formData.get('controlCategory'),
    controlDescription: formData.get('controlDescription')
  };

  // Validate
  const errors = controlItemService.validateControlItem(controlItem);
  if (errors.length > 0) {
    return;
  }

  if (isEdit) {
    await controlItemService.updateControlItem(currentFrameworkId, originalControlId, controlItem);
  } else {
    await controlItemService.addControlItem(currentFrameworkId, controlItem);
  }

  // Refresh table
  await openFramework(currentFrameworkId);
}

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

  // Add mock items button handler
  const addMockBtn = document.querySelector('[data-action="addMockItems"]');
  if (addMockBtn && !addMockBtn.dataset.initialized) {
    addMockBtn.dataset.initialized = 'true';
    addMockBtn.addEventListener('click', () => {
      addItemToTable({
        controlId: 'Article I-0-1.1',
        controlCategory: 'Article I, Business Contact Information',
        controlDescription: 'Company and Supplier may Process the other\'s BCI wherever they do business.'
      });
      addItemToTable({
        controlId: 'Article I-0-1.2',
        controlCategory: 'Article I, Business Contact Information',
        controlDescription: 'A party will not use or disclose the other party\'s BCI for any marketing purpose without prior written consent.'
      });
    });
  }

  // Add new item button handler
  const addNewBtn = document.querySelector('[data-action="addNewItem"]');
  if (addNewBtn && !addNewBtn.dataset.initialized) {
    addNewBtn.dataset.initialized = 'true';
    addNewBtn.addEventListener('click', () => {
      showAddControlItemForm();
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
      <button class="icon-btn" onclick="editTableItem(this)" title="Edit">✏️</button>
      <button class="icon-btn" onclick="deleteTableItem(this)" title="Delete">🗑️</button>
    </td>
  `;
  tableBody.appendChild(tr);
}

window.editTableItem = function (button) {
  const row = button.closest('tr');
  const cells = row.querySelectorAll('td');

  const item = {
    controlId: cells[0].textContent.trim(),
    controlCategory: cells[1].textContent.trim(),
    controlDescription: cells[2].textContent.trim()
  };

  showAddControlItemForm(item, row);
};

window.deleteTableItem = function (button) {
  const row = button.closest('tr');
  row.remove();
};

function showAddControlItemForm(item = null, rowToReplace = null) {
  const isEdit = !!item;
  const formHtml = `
    <div class="app-modal" id="addControlModal" role="dialog" aria-modal="true">
      <div class="app-modal-backdrop" data-close="true"></div>
      <div class="app-modal-dialog">
        <div class="app-modal-header">
          <h5 class="app-modal-title">${isEdit ? 'Edit' : 'Add'} Control Item</h5>
          <button type="button" class="app-modal-close" data-close="true" aria-label="Close">×</button>
        </div>
        <div class="app-modal-body">
            <form id="addControlForm">
              <div class="field">
                <label class="input-label">Control ID *</label>
                <input type="text" class="input-field" name="controlId" required value="${item?.controlId || ''}">
              </div>
              <div class="field">
                <label class="input-label">Control Category *</label>
                <input type="text" class="input-field" name="controlCategory" required value="${item?.controlCategory || ''}">
              </div>
              <div class="field">
                <label class="input-label">Control Description *</label>
                <textarea class="input-field" name="controlDescription" rows="3" required>${item?.controlDescription || ''}</textarea>
              </div>
            </form>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="secondary-button" data-close="true">Cancel</button>
          <button type="button" class="primary-button" onclick="saveControlToTable(${isEdit})">Save</button>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal
  const existing = document.getElementById('addControlModal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', formHtml);
  const modalEl = document.getElementById('addControlModal');
  const closeModal = () => modalEl && modalEl.remove();
  modalEl.addEventListener('click', (e) => { if (e.target.dataset.close === 'true') closeModal(); });
  document.addEventListener('keydown', function onEsc(ev) { if (ev.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEsc); } });

  // Store row reference for editing
  if (rowToReplace) {
    document.getElementById('addControlModal').dataset.rowToReplace = 'true';
    document.getElementById('addControlModal')._rowToReplace = rowToReplace;
  }

  // Modal is visible by insertion; cleanup handled by closeModal
}

window.saveControlToTable = function (isEdit) {
  const form = document.getElementById('addControlForm');
  const formData = new FormData(form);

  const item = {
    controlId: formData.get('controlId'),
    controlCategory: formData.get('controlCategory'),
    controlDescription: formData.get('controlDescription')
  };

  // Validate
  const errors = controlItemService.validateControlItem(item);
  if (errors.length > 0) {
    return;
  }

  const modalEl = document.getElementById('addControlModal');

  if (isEdit && document.getElementById('addControlModal')._rowToReplace) {
    // Replace existing row
    const row = document.getElementById('addControlModal')._rowToReplace;
    const cells = row.querySelectorAll('td');
    cells[0].textContent = item.controlId;
    cells[1].textContent = item.controlCategory;
    cells[2].textContent = item.controlDescription;
  } else {
    // Add new row
    addItemToTable(item);
  }

  if (modalEl) modalEl.remove();
};

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
