// A tiny, dependency-free data table with search, sort, and pagination.
export class SimpleTable {
  constructor(host, { columns, pageSize = 10 }) {
    this.host = host;
    this.columns = columns; // [{key,label,sortable}]
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.data = [];
    this.filtered = [];
    this.sortKey = null;
    this.sortDir = 'asc';

    this._build();
  }

  _build() {
    this.host.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'simple-table';
    this.table = document.createElement('table');
    this.table.className = 'table table-sm align-middle mb-2';

    // Build thead
    const thead = document.createElement('thead');
    thead.className = 'table-light';
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
    this.footer = document.createElement('div');
    this.footer.className = 'd-flex align-items-center justify-content-between small text-secondary mt-3 px-2';
    this.info = document.createElement('div');
    this.pag = document.createElement('div');
    this.pag.className = 'd-flex align-items-center gap-1';
    this.footer.append(this.info, this.pag);

    const wrapperInner = document.createElement('div');
    wrapperInner.className = 'table-responsive border rounded';
    wrapperInner.appendChild(this.table);

    this.host.append(wrapperInner, this.footer);
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
    this.info.textContent = total ? `Showing ${start + 1} to ${end} of ${total} entries` : 'No data';

    // Pagination controls
    const pages = Math.max(1, Math.ceil(total / this.pageSize));
    this.pag.innerHTML = '';

    if (pages > 1) {
      const makeBtn = (label, disabled, page) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.style.minWidth = '32px';
        btn.textContent = label;
        btn.disabled = disabled;
        if (disabled) {
          btn.classList.add('disabled');
        }
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
          ellipsis.className = 'px-2 text-muted';
          ellipsis.textContent = '...';
          this.pag.appendChild(ellipsis);
        }
      }

      for (let p = startPage; p <= endPage; p++) {
        const b = makeBtn(String(p), false, p);
        if (p === this.currentPage) {
          b.classList.remove('btn-outline-secondary');
          b.classList.add('btn-primary');
        }
        this.pag.appendChild(b);
      }

      // Show last page if not in range
      if (endPage < pages) {
        if (endPage < pages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'px-2 text-muted';
          ellipsis.textContent = '...';
          this.pag.appendChild(ellipsis);
        }
        this.pag.appendChild(makeBtn(String(pages), false, pages));
      }

      this.pag.appendChild(makeBtn('Next', this.currentPage === pages, Math.min(pages, this.currentPage + 1)));
    }
  }
}
