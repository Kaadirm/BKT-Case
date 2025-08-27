import { Stepper } from './stepper.js';
import { SimpleTable } from './table.js';
import { Api } from './services/api.js';

// Use the provided backend; fall back to local JSON for rows if service lacks them
const api = new Api({ mode: 'service', serviceBase: 'https://bk-backend.vercel.app/api/v1', jsonBase: './public/api' });

// Framework list + table init
const listEl = document.getElementById('frameworkList');
const tableHost = document.getElementById('tableHost');
const tableToolbar = document.getElementById('tableToolbar');
const searchInput = document.getElementById('tableSearch');
const pageSizeSelect = document.getElementById('pageSize');

let table;

function renderFrameworkItem(item) {
  const li = document.createElement('li');
  // Normalize item fields in case service returns different keys
  const id = item.id ?? item._id ?? item.slug ?? String(item.name || '');
  const name = item.name ?? item.title ?? id;
  const subtitle = item.subtitle ?? item.description ?? '';
  const status = item.status ?? '';
  const statusClass = item.statusClass ?? 'text-bg-light';
  const icon = item.icon || 'bi-grid';
  li.innerHTML = `
    <div class="framework-item p-3" data-id="${id}" role="button" tabindex="0" aria-label="Open ${name}">
      <div class="d-flex align-items-start gap-3">
        <div class="avatar bg-body-secondary text-secondary"><i class="bi ${icon}"></i></div>
        <div class="flex-grow-1">
          <div class="d-flex align-items-center justify-content-between">
            <div class="fw-semibold">${name}</div>
            ${status ? `<span class="status-chip ${statusClass}">${status}</span>` : ''}
          </div>
          <div class="small text-secondary">${subtitle}</div>
        </div>
      </div>
    </div>`;
  return li;
}

async function loadFrameworks() {
  try {
  const items = await api.getFrameworks();
    for (const item of items) listEl.appendChild(renderFrameworkItem(item));
  } catch (err) {
    listEl.innerHTML = `<li class="text-danger">Failed to load frameworks: ${err.message}</li>`;
  }
}

function activateItem(id) {
  listEl.querySelectorAll('.framework-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

async function openFramework(id) {
  try {
    activateItem(id);
    tableToolbar.classList.remove('d-none');

  const rows = await api.getFrameworkRows(id);

    // Build table if needed
    if (!table) {
      // First time: show a spinner while we build the table shell
      tableHost.innerHTML = '<div class="py-5 text-center text-secondary"><div class="spinner-border" role="status" aria-label="Loading">\n</div><div class="mt-2">Loading data...</div></div>';
      table = new SimpleTable(tableHost, {
        columns: [
          { key: 'controlId', label: 'Control ID', sortable: true },
          { key: 'controlCategory', label: 'Control Category', sortable: true },
          { key: 'controlDescription', label: 'Control Description', sortable: false }
        ],
        pageSize: parseInt(pageSizeSelect.value, 10)
      });

      searchInput.addEventListener('input', (e) => table.filter(e.target.value));
      pageSizeSelect.addEventListener('change', (e) => table.setPageSize(parseInt(e.target.value, 10)));
    }

  table.load(rows);
  } catch (err) {
  if (err && err.name === 'AbortError') return; // ignore aborted request
    tableHost.innerHTML = `<div class="alert alert-danger">Failed to load data: ${err.message}</div>`;
  }
}

// Click handlers for framework list
listEl.addEventListener('click', (e) => {
  const item = e.target.closest('.framework-item');
  if (!item) return;
  openFramework(item.dataset.id);
});
listEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const item = e.target.closest('.framework-item');
    if (item) {
      e.preventDefault();
      openFramework(item.dataset.id);
    }
  }
});

// Modal stepper wiring for final Save button visibility
const stepperRoot = document.getElementById('frameworkStepper');
let modalStepper;
function ensureStepperInstance() {
  if (stepperRoot && !modalStepper) {
    modalStepper = new Stepper(stepperRoot, {
      onChange: (from, to) => {
        document.getElementById('saveFrameworkBtn').classList.toggle('d-none', to !== 2);
        const nextBtn = document.querySelector('[data-stepper-control="next"][data-stepper-target="#frameworkStepper"]');
        if (nextBtn) nextBtn.classList.toggle('d-none', to === 2);
      }
    });
    stepperRoot.__stepperInstance = modalStepper; // so global controls work too
  }
}

ensureStepperInstance();

// Add Control Items actions (mocked)
const newItemsTableBody = document.querySelector('#newFwItemsTable tbody');
function addItem({ controlId, controlCategory, controlDescription }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${controlId}</td>
    <td>${controlCategory}</td>
    <td>${controlDescription}</td>
    <td class="text-end">
      <button class="btn btn-light btn-sm me-1" title="Edit"><i class="bi bi-pencil-square"></i></button>
      <button class="btn btn-light btn-sm" title="Delete"><i class="bi bi-trash"></i></button>
    </td>`;
  newItemsTableBody.appendChild(tr);
}

// Simple demo: add a few mock items when clicking the button
stepperRoot?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action="addMockItems"]');
  if (!b) return;
  addItem({ controlId: 'Article I-0-1.1', controlCategory: 'Article I, Business Contact Information', controlDescription: 'Company and Supplier may Process the other\'s BCI wherever they do business.' });
  addItem({ controlId: 'Article I-0-1.2', controlCategory: 'Article I, Business Contact Information', controlDescription: 'A party will not use or disclose the other party\'s BCI for any marketing purpose without prior written consent.' });
});

// Save handler - just collects form and table rows and logs them
const saveBtn = document.getElementById('saveFrameworkBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    const form = document.getElementById('frameworkForm');
    const formData = Object.fromEntries(new FormData(form).entries());
    const rows = Array.from(newItemsTableBody.querySelectorAll('tr')).map(tr => {
      const tds = tr.querySelectorAll('td');
      return {
        controlId: tds[0].textContent.trim(),
        controlCategory: tds[1].textContent.trim(),
        controlDescription: tds[2].textContent.trim()
      };
    });
    try {
      const payload = { name: formData.name, shortName: formData.shortName, description: formData.description || '', items: rows };
      await api.createFramework(payload);
      // Refresh list after create
      listEl.innerHTML = '';
      await loadFrameworks();
      const toast = document.createElement('div');
      toast.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 z-3';
      toast.textContent = 'Framework created';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } catch (e) {
      const err = document.createElement('div');
      err.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 z-3';
      err.textContent = `Failed to create: ${e.message}`;
      document.body.appendChild(err);
      setTimeout(() => err.remove(), 2500);
    }
  });
}

// Kick off
loadFrameworks();
