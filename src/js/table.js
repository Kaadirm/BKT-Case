// A tiny, dependency-free data table with search, sort, and pagination.
export class SimpleTable {
  constructor(host, { columns, pageSize = 10, tableClass = 'custom-table', wrapperClass = 'custom-table-container', theadClass = '', externalInfoEl = null, externalPrevBtn = null, externalNextBtn = null, externalPagEl = null, onReset = null } = {}) {
    this.host = host;
    this.columns = columns; // [{key,label,sortable}]
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.data = [];
    this.filtered = [];
    this.sortKey = null;
    this.sortDir = 'asc';
    this.tableClass = tableClass;
    this.wrapperClass = wrapperClass;
    this.theadClass = theadClass;
    // External footer controls (optional)
    this.externalInfoEl = externalInfoEl || null;
    this.externalPrevBtn = externalPrevBtn || null;
    this.externalNextBtn = externalNextBtn || null;
    this.externalPagEl = externalPagEl || null;
    // Callback for resetting external UI elements
    this.onReset = onReset;

    this._build();
  }

  _build() {
    this.host.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = this.wrapperClass;
    this.table = document.createElement('table');
    this.table.className = this.tableClass;

    // Build thead
    const thead = document.createElement('thead');
    thead.className = this.theadClass;
    const tr = document.createElement('tr');
    for (const col of this.columns) {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.sortable) {
        th.classList.add('sortable');
        const span = document.createElement('span');
        span.className = 'sort-indicator';
        th.appendChild(span);
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => this.sortBy(col.key));
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    this.table.appendChild(thead);

    // Body
    this.tbody = document.createElement('tbody');
    this.table.appendChild(this.tbody);

    // Footer / pagination
    const useExternal = !!(this.externalInfoEl || this.externalPrevBtn || this.externalNextBtn);
    if (useExternal) {
      // When using external controls, don't render internal footer UI
      this.info = this.externalInfoEl || document.createElement('div');
      this.pag = this.externalPagEl || null; // use external pagination container if provided
      // Attach button handlers once
      if (this.externalPrevBtn && !this.externalPrevBtn.__boundToTable) {
        this.externalPrevBtn.addEventListener('click', () => {
          this.currentPage = Math.max(1, this.currentPage - 1);
          this._render();
        });
        this.externalPrevBtn.__boundToTable = this;
      }
      if (this.externalNextBtn && !this.externalNextBtn.__boundToTable) {
        this.externalNextBtn.addEventListener('click', () => {
          const total = this.filtered.length;
          const pages = Math.max(1, Math.ceil(total / this.pageSize));
          this.currentPage = Math.min(pages, this.currentPage + 1);
          this._render();
        });
        this.externalNextBtn.__boundToTable = this;
      }
    } else {
      this.footer = document.createElement('div');
      this.footer.className = 'data-table-footer';
      this.info = document.createElement('div');
      this.info.className = 'data-table-info';
      this.pag = document.createElement('div');
      this.pag.className = 'data-table-pagination';
      this.footer.append(this.info, this.pag);
    }

    // Append to wrapper and host
    this.wrapper.appendChild(this.table);
    if (this.footer) this.host.append(this.wrapper, this.footer);
    else this.host.append(this.wrapper);
  }

  setPageSize(n) {
    this.pageSize = n;
    this.currentPage = 1;
    this._render();
  }

  sortBy(key) {
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = key; this.sortDir = 'asc'; }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    this.filtered.sort((a, b) => {
      const av = (a[key] ?? '').toString().toLowerCase();
      const bv = (b[key] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
    });
    this._render();
  }

  filter(text) {
    const q = (text || '').trim().toLowerCase();
    if (!q) this.filtered = [...this.data];
    else {
      this.filtered = this.data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }
    this.currentPage = 1;
    this._render();
  }

  load(data) {
    this.data = Array.isArray(data) ? data : (data?.rows || []);
    this.filtered = [...this.data];
    this.currentPage = 1;
    // Reset sort state to default
    this.sortKey = null;
    this.sortDir = 'asc';
    // Call reset callback to clear external UI elements (like search input)
    if (this.onReset) {
      this.onReset();
    }
    this._render();
  }

  _render() {
    // Clear sort classes
    this.table.querySelectorAll('thead th').forEach((th, idx) => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      const col = this.columns[idx];
      if (col?.key === this.sortKey) th.classList.add(this.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    });

    // Paginate
    const total = this.filtered.length;
    const start = (this.currentPage - 1) * this.pageSize;
    const pageRows = this.filtered.slice(start, start + this.pageSize);

    // Render rows
    this.tbody.innerHTML = '';
    for (const row of pageRows) {
      const tr = document.createElement('tr');
      for (const col of this.columns) {
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
      this.tbody.appendChild(tr);
    }

    // Info text
    const end = Math.min(start + this.pageSize, total);
    const infoText = total ? `Showing ${start + 1} to ${end} of ${total} entries` : 'No data';
    if (this.info) this.info.textContent = infoText;
    if (this.externalInfoEl && this.externalInfoEl !== this.info) {
      this.externalInfoEl.textContent = infoText;
    }

    // Update external Prev/Next button states if present
    const pages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.externalPrevBtn) this.externalPrevBtn.disabled = this.currentPage === 1 || total === 0;
    if (this.externalNextBtn) this.externalNextBtn.disabled = this.currentPage === pages || total === 0;

    // Pagination controls
    if (this.pag) this.pag.innerHTML = '';

    if (this.pag && total > 0) {
      const makeBtn = (label, disabled, page) => {
        const btn = document.createElement('button');
        btn.className = 'data-table-page-btn';
        btn.style.minWidth = '32px';
        btn.textContent = label;
        btn.disabled = disabled;
        if (disabled) btn.classList.add('is-disabled');
        btn.addEventListener('click', () => { this.currentPage = page; this._render(); });
        return btn;
      };

      this.pag.appendChild(makeBtn('Previous', this.currentPage === 1, Math.max(1, this.currentPage - 1)));

      // Simple pager: show up to 5 pages centered
      const range = 2;
      const startPage = Math.max(1, this.currentPage - range);
      const endPage = Math.min(pages, this.currentPage + range);

      // Show first page if not in range
      if (startPage > 1) {
        this.pag.appendChild(makeBtn('1', false, 1));
        if (startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'data-table-ellipsis';
          ellipsis.textContent = '...';
          this.pag.appendChild(ellipsis);
        }
      }

      for (let p = startPage; p <= endPage; p++) {
        const b = makeBtn(String(p), false, p);
        if (p === this.currentPage) b.classList.add('is-active');
        this.pag.appendChild(b);
      }

      // Show last page if not in range
      if (endPage < pages) {
        if (endPage < pages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'data-table-ellipsis';
          ellipsis.textContent = '...';
          this.pag.appendChild(ellipsis);
        }
        this.pag.appendChild(makeBtn(String(pages), false, pages));
      }

      this.pag.appendChild(makeBtn('Next', this.currentPage === pages, Math.min(pages, this.currentPage + 1)));
    }
  }
}
