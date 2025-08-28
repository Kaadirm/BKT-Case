import { Stepper } from './stepper.js';
import { SimpleTable } from './table.js';
import { Api } from './services/api.js';
import { FrameworkService } from './services/framework-service.js';
import { ControlItemService } from './services/control-item-service.js';
import { FileUploadService } from './services/file-upload-service.js';
import { NotificationService } from './services/notification-service.js';
import { UtilityService } from './services/utility-service.js';

// Initialize services
const api = new Api({ mode: 'service', serviceBase: 'https://bk-backend.vercel.app/api/v1', jsonBase: './public/api' });
const frameworkService = new FrameworkService(api);
const controlItemService = new ControlItemService(api);
const fileUploadService = new FileUploadService();
const notificationService = new NotificationService();

// Framework list + table init
const listEl = document.getElementById('frameworkList');
const tableHost = document.getElementById('tableHost');
const tableToolbar = document.getElementById('tableToolbar');
const searchInput = document.getElementById('tableSearch');
const pageSizeSelect = document.getElementById('pageSize');

let table;
let currentFrameworkId = null;
let currentLoadingController = null;

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

async function loadFrameworks(options = {}) {
  try {
    const loadingNotification = notificationService.loading('Loading frameworks...');
    const items = await frameworkService.getFrameworks(options);
    
    // Clear existing items
    listEl.innerHTML = '';
    
    for (const item of items) {
      listEl.appendChild(renderFrameworkItem(item));
    }
    
    notificationService.hide(loadingNotification);
    
    if (items.length === 0) {
      listEl.innerHTML = '<li class="text-center text-muted p-3">No frameworks found</li>';
    }
  } catch (err) {
    notificationService.error(`Failed to load frameworks: ${err.message}`);
    listEl.innerHTML = `<li class="text-danger p-3">Failed to load frameworks: ${err.message}</li>`;
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
    tableToolbar.classList.remove('hidden');

    // Show loading state
    tableHost.innerHTML = '<div class="py-5 text-center text-secondary"><div class="spinner-border" role="status" aria-label="Loading"></div><div class="mt-2">Loading data...</div></div>';

    // Create abort controller for this request
    currentLoadingController = new AbortController();
    
    const rows = await controlItemService.getControlItems(id, { 
      signal: currentLoadingController.signal 
    });

    // Check if this request was aborted
    if (currentLoadingController.signal.aborted) {
      return;
    }

    // Build table if needed
    if (!table) {
      table = new SimpleTable(tableHost, {
        columns: [
          { key: 'controlId', label: 'Control ID', sortable: true },
          { key: 'controlCategory', label: 'Control Category', sortable: true },
          { key: 'controlDescription', label: 'Control Description', sortable: false },
          { 
            key: 'actions', 
            label: 'Actions', 
            sortable: false,
            render: (value, row) => `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="editControlItem('${UtilityService.sanitizeHtml(row.controlId)}')" title="Edit">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="deleteControlItem('${UtilityService.sanitizeHtml(row.controlId)}')" title="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            `
          }
        ],
        pageSize: parseInt(pageSizeSelect.value, 10)
      });

      // Setup table event handlers
      const debouncedFilter = UtilityService.debounce((value) => table.filter(value), 300);
      searchInput.addEventListener('input', (e) => debouncedFilter(e.target.value));
      pageSizeSelect.addEventListener('change', (e) => table.setPageSize(parseInt(e.target.value, 10)));
    }

    table.load(rows);
    
    // Update table header with framework info (non-blocking)
    try {
      const frameworkDetails = await frameworkService.getFrameworkDetails(id);
      updateTableHeader(frameworkDetails);
    } catch (error) {
      console.warn('Failed to load framework details:', error);
    }
    
    // Clear the loading controller since we're done
    currentLoadingController = null;
    
  } catch (err) {
    if (err && err.name === 'AbortError') return; // ignore aborted request
    notificationService.error(`Failed to load framework data: ${err.message}`);
    tableHost.innerHTML = `<div class="alert alert-danger">Failed to load data: ${err.message}</div>`;
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
  const url = `/framework/${encodeURIComponent(id)}`;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ frameworkId: id }, '', url);
  openFramework(id);
}

function updateTableHeader(framework) {
  const headerElement = document.querySelector('#tableHost .table-header');
  if (headerElement) {
    headerElement.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 class="mb-1">${UtilityService.sanitizeHtml(framework.name)}</h5>
          <p class="text-muted mb-0">${framework.controlCount || 0} control items</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-outline-primary btn-sm" onclick="exportFrameworkData()">
            <i class="bi bi-download"></i> Export
          </button>
          <button class="btn btn-outline-success btn-sm" onclick="addNewControlItem()">
            <i class="bi bi-plus"></i> Add Control
          </button>
        </div>
      </div>
    `;
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
  if (id) openFramework(id);
});

// Control item management functions
window.editControlItem = async function(controlId) {
  if (!currentFrameworkId) return;
  
  try {
    const controls = await controlItemService.getControlItems(currentFrameworkId);
    const control = controls.find(c => c.controlId === controlId);
    
    if (!control) {
      notificationService.error('Control item not found');
      return;
    }
    
    // Show edit modal or inline editing
    showControlItemEditModal(control);
  } catch (error) {
    notificationService.error(`Failed to load control item: ${error.message}`);
  }
};

window.deleteControlItem = async function(controlId) {
  if (!currentFrameworkId) return;
  
  const confirmed = await notificationService.confirm(
    `Are you sure you want to delete control item "${controlId}"?`,
    { title: 'Delete Control Item', confirmLabel: 'Delete', type: 'danger' }
  );
  
  if (!confirmed) return;
  
  try {
    const loadingNotification = notificationService.loading('Deleting control item...');
    await controlItemService.deleteControlItem(currentFrameworkId, controlId);
    notificationService.hide(loadingNotification);
    notificationService.success('Control item deleted successfully');
    
    // Refresh table
    await openFramework(currentFrameworkId);
  } catch (error) {
    notificationService.error(`Failed to delete control item: ${error.message}`);
  }
};

window.addNewControlItem = function() {
  showControlItemEditModal();
};

window.exportFrameworkData = async function() {
  if (!currentFrameworkId) return;
  
  try {
    const csvData = await controlItemService.exportControlItems(currentFrameworkId, 'csv');
    const framework = await frameworkService.getFrameworkDetails(currentFrameworkId);
    const filename = `${UtilityService.slugify(framework.name)}-controls.csv`;
    
    fileUploadService.downloadFile(csvData, filename, 'text/csv');
    notificationService.success('Framework data exported successfully');
  } catch (error) {
    notificationService.error(`Failed to export data: ${error.message}`);
  }
};

function showControlItemEditModal(control = null) {
  const isEdit = !!control;
  const modalTitle = isEdit ? 'Edit Control Item' : 'Add New Control Item';
  
  // Create modal HTML
  const modalHtml = `
    <div class="modal fade" id="controlItemModal" tabindex="-1" aria-labelledby="controlItemModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="controlItemModalLabel">${modalTitle}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="controlItemForm">
              <div class="mb-3">
                <label for="controlId" class="form-label">Control ID *</label>
                <input type="text" class="form-control" id="controlId" name="controlId" required
                       value="${control?.controlId || ''}" ${isEdit ? 'readonly' : ''}>
              </div>
              <div class="mb-3">
                <label for="controlCategory" class="form-label">Control Category *</label>
                <input type="text" class="form-control" id="controlCategory" name="controlCategory" required
                       value="${control?.controlCategory || ''}" list="categoryDatalist">
                <datalist id="categoryDatalist"></datalist>
              </div>
              <div class="mb-3">
                <label for="controlDescription" class="form-label">Control Description *</label>
                <textarea class="form-control" id="controlDescription" name="controlDescription" rows="4" required>${control?.controlDescription || ''}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="saveControlItemBtn">${isEdit ? 'Update' : 'Add'}</button>
          </div>
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
  
  // Initialize modal
  const modal = new bootstrap.Modal(document.getElementById('controlItemModal'));
  
  // Load categories for datalist
  loadControlCategories();
  
  // Setup save handler
  document.getElementById('saveControlItemBtn').addEventListener('click', async () => {
    await saveControlItem(isEdit, control?.controlId);
    modal.hide();
  });
  
  // Show modal
  modal.show();
  
  // Clean up on hide
  document.getElementById('controlItemModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('controlItemModal').remove();
  });
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
    notificationService.showValidationErrors(errors, form);
    return;
  }
  
  try {
    const loadingNotification = notificationService.loading(isEdit ? 'Updating control item...' : 'Adding control item...');
    
    if (isEdit) {
      await controlItemService.updateControlItem(currentFrameworkId, originalControlId, controlItem);
      notificationService.hide(loadingNotification);
      notificationService.success('Control item updated successfully');
    } else {
      await controlItemService.addControlItem(currentFrameworkId, controlItem);
      notificationService.hide(loadingNotification);
      notificationService.success('Control item added successfully');
    }
    
    // Refresh table
    await openFramework(currentFrameworkId);
  } catch (error) {
    notificationService.error(`Failed to ${isEdit ? 'update' : 'add'} control item: ${error.message}`);
  }
}

// Modal stepper wiring for final Save button visibility
const stepperRoot = document.getElementById('frameworkStepper');
let modalStepper;
let currentFrameworkData = {};
let uploadedTemplate = null;

function ensureStepperInstance() {
  if (stepperRoot && !modalStepper) {
    modalStepper = new Stepper(stepperRoot, {
      onChange: (from, to) => {
        document.getElementById('saveFrameworkBtn').classList.toggle('d-none', to !== 2);
        const nextBtn = document.querySelector('[data-stepper-control="next"][data-stepper-target="#frameworkStepper"]');
        if (nextBtn) nextBtn.classList.toggle('d-none', to === 2);
        
        // Update step content based on current step
        updateStepContent(to);
      }
    });
    stepperRoot.__stepperInstance = modalStepper;
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
        notificationService.showValidationErrors(errors);
        fileInput.value = '';
        return;
      }
      
      try {
        // Show file info
        const fileInfo = fileUploadService.getFileInfo(file);
        filePreview.innerHTML = `
          <div class="alert alert-info">
            <i class="bi bi-file-earmark"></i> 
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
            notificationService.info(`Found ${content.length} control items in template`);
          }
        }
      } catch (error) {
        notificationService.error(`Failed to process template: ${error.message}`);
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
    <td class="text-end">
      <button class="btn btn-light btn-sm me-1" onclick="editTableItem(this)" title="Edit">
        <i class="bi bi-pencil-square"></i>
      </button>
      <button class="btn btn-light btn-sm" onclick="deleteTableItem(this)" title="Delete">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  tableBody.appendChild(tr);
}

window.editTableItem = function(button) {
  const row = button.closest('tr');
  const cells = row.querySelectorAll('td');
  
  const item = {
    controlId: cells[0].textContent.trim(),
    controlCategory: cells[1].textContent.trim(),
    controlDescription: cells[2].textContent.trim()
  };
  
  showAddControlItemForm(item, row);
};

window.deleteTableItem = function(button) {
  const row = button.closest('tr');
  row.remove();
};

function showAddControlItemForm(item = null, rowToReplace = null) {
  const isEdit = !!item;
  const formHtml = `
    <div class="modal fade" id="addControlModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Control Item</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="addControlForm">
              <div class="mb-3">
                <label class="form-label">Control ID *</label>
                <input type="text" class="form-control" name="controlId" required value="${item?.controlId || ''}">
              </div>
              <div class="mb-3">
                <label class="form-label">Control Category *</label>
                <input type="text" class="form-control" name="controlCategory" required value="${item?.controlCategory || ''}">
              </div>
              <div class="mb-3">
                <label class="form-label">Control Description *</label>
                <textarea class="form-control" name="controlDescription" rows="3" required>${item?.controlDescription || ''}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="saveControlToTable(${isEdit})">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal
  const existing = document.getElementById('addControlModal');
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', formHtml);
  const modal = new bootstrap.Modal(document.getElementById('addControlModal'));
  
  // Store row reference for editing
  if (rowToReplace) {
    document.getElementById('addControlModal').dataset.rowToReplace = 'true';
    document.getElementById('addControlModal')._rowToReplace = rowToReplace;
  }
  
  modal.show();
  
  // Cleanup on hide
  document.getElementById('addControlModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('addControlModal').remove();
  });
}

window.saveControlToTable = function(isEdit) {
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
    notificationService.showValidationErrors(errors, form);
    return;
  }
  
  const modal = bootstrap.Modal.getInstance(document.getElementById('addControlModal'));
  
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
  
  modal.hide();
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
              <ul class="list-group list-group-flush">
                ${currentFrameworkData.controls.map(control => 
                  `<li class="list-group-item px-0 py-1">
                    <small><strong>${UtilityService.sanitizeHtml(control.controlId)}</strong><br>
                    ${UtilityService.truncate(control.controlDescription, 60)}</small>
                  </li>`
                ).join('')}
              </ul>
            </div>
          ` : '<p class="text-muted">No control items added</p>'}
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
    try {
      // Validate framework data
      if (!currentFrameworkData.name?.trim()) {
        notificationService.error('Framework name is required');
        return;
      }
      
      if (!currentFrameworkData.shortName?.trim()) {
        notificationService.error('Framework short name is required');
        return;
      }
      
      const progressNotification = notificationService.progress('Creating framework...', 0);
      
      // Create framework
      progressNotification.updateProgress(20, 'Creating framework...');
      const result = await frameworkService.createFramework(currentFrameworkData);
      
      progressNotification.updateProgress(80, 'Framework created successfully');
      
      // Refresh list after create
      await loadFrameworks();
      
      progressNotification.complete('Framework created successfully!');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.querySelector('#frameworkModal'));
      if (modal) modal.hide();
      
      // Reset form
      resetFrameworkForm();
      
    } catch (error) {
      notificationService.error(`Failed to create framework: ${error.message}`);
    }
  });
}

function resetFrameworkForm() {
  const form = document.getElementById('frameworkForm');
  if (form) form.reset();
  
  const tableBody = document.querySelector('#newFwItemsTable tbody');
  if (tableBody) tableBody.innerHTML = '';
  
  const filePreview = document.getElementById('filePreview');
  if (filePreview) filePreview.innerHTML = '';
  
  currentFrameworkData = {};
  uploadedTemplate = null;
  
  // Reset stepper to first step
  if (modalStepper) {
    modalStepper.goTo(0);
  }
}

// Search functionality
const frameworkSearchInput = document.getElementById('frameworkSearch');
if (frameworkSearchInput) {
  const debouncedSearch = UtilityService.debounce(async (searchTerm) => {
    await loadFrameworks({ search: searchTerm });
  }, 300);
  
  frameworkSearchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
}

// Status filter functionality
const statusFilter = document.getElementById('statusFilter');
if (statusFilter) {
  statusFilter.addEventListener('change', async (e) => {
    await loadFrameworks({ status: e.target.value });
  });
}

// Help functionality
const helpBtn = document.getElementById('helpBtn');
if (helpBtn) {
  helpBtn.addEventListener('click', () => {
    notificationService.info(`
      <strong>Compliance Frameworks Help</strong><br>
      • Click on a framework to view its control items<br>
      • Use the search bar to find specific frameworks<br>
      • Filter by status to view frameworks in different stages<br>
      • Click "New Custom Framework" to create a new framework<br>
      • Export framework data using the Export button
    `, { duration: 10000 });
  });
}

// Add refresh button functionality
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    const loadingNotification = notificationService.loading('Refreshing frameworks...');
    try {
      await loadFrameworks();
      notificationService.hide(loadingNotification);
      notificationService.success('Frameworks refreshed');
    } catch (error) {
      notificationService.hide(loadingNotification);
      notificationService.error(`Failed to refresh: ${error.message}`);
    }
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
    const newFrameworkBtn = document.querySelector('[data-bs-target="#frameworkModal"]');
    if (newFrameworkBtn) newFrameworkBtn.click();
  }
  
  // Escape to close modals
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(modal => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) modalInstance.hide();
    });
  }
});

// Handle modal events
document.addEventListener('show.bs.modal', (e) => {
  if (e.target.id === 'frameworkModal') {
    resetFrameworkForm();
    notificationService.clearValidationErrors(document.getElementById('frameworkForm'));
  }
});

// Initialize tooltips
document.addEventListener('DOMContentLoaded', () => {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Error handling for uncaught errors
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error);
  notificationService.error('An unexpected error occurred. Please try again.');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  notificationService.error('An unexpected error occurred. Please try again.');
});

// Initialize the application
async function initializeApp() {
  try {
    // Load initial frameworks
    await loadFrameworks();
  // If URL already points to a framework, open it
  const initialId = getRouteFrameworkId();
  if (initialId) openFramework(initialId);
    
    // Show welcome message for first-time users
    const hasVisited = UtilityService.getStorageWithExpiry('hasVisitedApp');
    if (!hasVisited) {
      setTimeout(() => {
        notificationService.info(`
          <strong>Welcome to Compliance Frameworks!</strong><br>
          Select a framework from the list to view its control items, or create a new custom framework.
        `, { duration: 8000 });
        UtilityService.setStorageWithExpiry('hasVisitedApp', true, 30 * 24 * 60 * 60 * 1000); // 30 days
      }, 1000);
    }
    
  } catch (error) {
    notificationService.error(`Failed to initialize application: ${error.message}`);
  }
}

// Start the application
initializeApp();
