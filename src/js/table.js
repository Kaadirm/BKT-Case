// A tiny, dependency-free data table with search, sort, and pagination.
export function createSimpleTable(host, { columns, pageSize = 10, tableClass = 'custom-table', wrapperClass = 'custom-table-container', theadClass = '', externalInfoEl = null, externalPrevBtn = null, externalNextBtn = null, externalPagEl = null, onReset = null } = {}) {
  const state = {
    host,
    columns, // [{key,label,sortable}]
    pageSize,
    currentPage: 1,
    data: [],
    filtered: [],
    sortKey: null,
    sortDir: 'asc',
    tableClass,
    wrapperClass,
    theadClass,
    // External footer controls (optional)
    externalInfoEl: externalInfoEl || null,
    externalPrevBtn: externalPrevBtn || null,
    externalNextBtn: externalNextBtn || null,
    externalPagEl: externalPagEl || null,
    // Callback for resetting external UI elements
    onReset,
    wrapper: null,
    table: null,
    tbody: null,
    footer: null,
    info: null,
    pag: null
  };

  const _build = () => {
    state.host.innerHTML = '';
    state.wrapper = document.createElement('div');
    state.wrapper.className = state.wrapperClass;
    state.table = document.createElement('table');
    state.table.className = state.tableClass;

    // Build thead
    const thead = document.createElement('thead');
    thead.className = state.theadClass;
    const tr = document.createElement('tr');
    for (const col of state.columns) {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.sortable) {
        th.classList.add('sortable');
        const span = document.createElement('span');
        span.className = 'sort-indicator';
        th.appendChild(span);
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => sortBy(col.key));
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    state.table.appendChild(thead);

    // Body
    state.tbody = document.createElement('tbody');
    state.table.appendChild(state.tbody);

    // Footer / pagination
    const useExternal = !!(state.externalInfoEl || state.externalPrevBtn || state.externalNextBtn);
    if (useExternal) {
      // When using external controls, don't render internal footer UI
      state.info = state.externalInfoEl || document.createElement('div');
      state.pag = state.externalPagEl || null; // use external pagination container if provided
      // Attach button handlers once
      if (state.externalPrevBtn && !state.externalPrevBtn.__boundToTable) {
        state.externalPrevBtn.addEventListener('click', () => {
          state.currentPage = Math.max(1, state.currentPage - 1);
          _render();
        });
        state.externalPrevBtn.__boundToTable = state;
      }
      if (state.externalNextBtn && !state.externalNextBtn.__boundToTable) {
        state.externalNextBtn.addEventListener('click', () => {
          const total = state.filtered.length;
          const pages = Math.max(1, Math.ceil(total / state.pageSize));
          state.currentPage = Math.min(pages, state.currentPage + 1);
          _render();
        });
        state.externalNextBtn.__boundToTable = state;
      }
    } else {
      state.footer = document.createElement('div');
      state.footer.className = 'data-table-footer';
      state.info = document.createElement('div');
      state.info.className = 'data-table-info';
      state.pag = document.createElement('div');
      state.pag.className = 'data-table-pagination';
      state.footer.append(state.info, state.pag);
    }

    // Append to wrapper and host
    state.wrapper.appendChild(state.table);
    if (state.footer) state.host.append(state.wrapper, state.footer);
    else state.host.append(state.wrapper);
  };

  const setPageSize = (n) => {
    state.pageSize = n;
    state.currentPage = 1;
    _render();
  };

  const sortBy = (key) => {
    if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    else { state.sortKey = key; state.sortDir = 'asc'; }
    const dir = state.sortDir === 'asc' ? 1 : -1;
    state.filtered.sort((a, b) => {
      const av = (a[key] ?? '').toString().toLowerCase();
      const bv = (b[key] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
    });
    _render();
  };

  const filter = (text) => {
    const q = (text || '').trim().toLowerCase();
    if (!q) state.filtered = [...state.data];
    else {
      state.filtered = state.data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }
    state.currentPage = 1;
    _render();
  };

  const load = (data) => {
    state.data = Array.isArray(data) ? data : (data?.rows || []);
    state.filtered = [...state.data];
    state.currentPage = 1;
    // Reset sort state to default
    state.sortKey = null;
    state.sortDir = 'asc';
    // Call reset callback to clear external UI elements (like search input)
    if (state.onReset) {
      state.onReset();
    }
    _render();
  };

  const _render = () => {
    // Clear sort classes
    state.table.querySelectorAll('thead th').forEach((th, idx) => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      const col = state.columns[idx];
      if (col?.key === state.sortKey) th.classList.add(state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    });

    // Paginate
    const total = state.filtered.length;
    const start = (state.currentPage - 1) * state.pageSize;
    const pageRows = state.filtered.slice(start, start + state.pageSize);

    // Render rows
    state.tbody.innerHTML = '';
    for (const row of pageRows) {
      const tr = document.createElement('tr');
      for (const col of state.columns) {
        const td = document.createElement('td');

        if (col.render && typeof col.render === 'function') {
          // Use custom render function for this column
          td.innerHTML = col.render(row[col.key], row);
        } else {
          // Default text rendering
          td.textContent = row[col.key] ?? '';
        }

        tr.appendChild(td);
      }
      state.tbody.appendChild(tr);
    }

    // Info text
    const end = Math.min(start + state.pageSize, total);
    const infoText = total ? `Showing ${start + 1} to ${end} of ${total} entries` : 'No data';
    if (state.info) state.info.textContent = infoText;
    if (state.externalInfoEl && state.externalInfoEl !== state.info) {
      state.externalInfoEl.textContent = infoText;
    }

    // Update external Prev/Next button states if present
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.externalPrevBtn) state.externalPrevBtn.disabled = state.currentPage === 1 || total === 0;
    if (state.externalNextBtn) state.externalNextBtn.disabled = state.currentPage === pages || total === 0;

    // Pagination controls
    if (state.pag) state.pag.innerHTML = '';

    if (state.pag && total > 0) {
      const makeBtn = (label, disabled, page) => {
        const btn = document.createElement('button');
        btn.className = 'data-table-page-btn';
        btn.style.minWidth = '32px';
        btn.textContent = label;
        btn.disabled = disabled;
        if (disabled) btn.classList.add('is-disabled');
        btn.addEventListener('click', () => { state.currentPage = page; _render(); });
        return btn;
      };

      state.pag.appendChild(makeBtn('Previous', state.currentPage === 1, Math.max(1, state.currentPage - 1)));

      // Simple pager: show up to 5 pages centered
      const range = 2;
      const startPage = Math.max(1, state.currentPage - range);
      const endPage = Math.min(pages, state.currentPage + range);

      // Show first page if not in range
      if (startPage > 1) {
        state.pag.appendChild(makeBtn('1', false, 1));
        if (startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'data-table-ellipsis';
          ellipsis.textContent = '...';
          state.pag.appendChild(ellipsis);
        }
      }

      for (let p = startPage; p <= endPage; p++) {
        const b = makeBtn(String(p), false, p);
        if (p === state.currentPage) b.classList.add('is-active');
        state.pag.appendChild(b);
      }

      // Show last page if not in range
      if (endPage < pages) {
        if (endPage < pages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'data-table-ellipsis';
          ellipsis.textContent = '...';
          state.pag.appendChild(ellipsis);
        }
        state.pag.appendChild(makeBtn(String(pages), false, pages));
      }

      state.pag.appendChild(makeBtn('Next', state.currentPage === pages, Math.min(pages, state.currentPage + 1)));
    }
  };

  // Initialize
  _build();

  return {
    setPageSize,
    sortBy,
    filter,
    load
  };
}
