// Lightweight Framework Manager - encapsulates framework list + table behavior
export function FrameworkManager({
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
}) {
    let table = null;
    let currentFrameworkId = null;
    let currentLoadingController = null;
    let currentFrameworksController = null;

    async function loadFrameworks() {
        try {
            if (currentFrameworksController) {
                currentFrameworksController.abort();
                currentFrameworksController = null;
            }
            currentFrameworksController = new AbortController();
            const items = await frameworkService.getFrameworks();

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
            if (currentLoadingController) {
                currentLoadingController.abort();
                currentLoadingController = null;
            }

            currentFrameworkId = id;
            activateItem(id);

            // Default hide states while loading
            if (tableHost) {
                tableHost.classList.add('hidden');
                tableHost.style.display = 'none';
            }
            if (noDataState) {
                noDataState.classList.add('hidden');
                noDataState.style.display = 'none';
            }
            if (tableCardBody) tableCardBody.classList.add('hidden');
            if (tableCard) {
                const existingOverlay = tableCard.querySelector('.loading-overlay');
                if (existingOverlay) existingOverlay.remove();
                const loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'loading-overlay';
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading';
                const spinnerDiv = document.createElement('div');
                spinnerDiv.className = 'spinner';
                spinnerDiv.setAttribute('aria-label', 'Loading');
                loadingDiv.appendChild(spinnerDiv);
                loadingOverlay.appendChild(loadingDiv);
                tableCard.style.position = 'relative';
                tableCard.appendChild(loadingOverlay);
            }

            currentLoadingController = new AbortController();

            const rows = await controlItemService.getControlItems(id, { signal: currentLoadingController.signal });
            if (currentLoadingController.signal.aborted) return;

            const hasData = Array.isArray(rows) && rows.length > 0;

            if (hasData) {
                if (!table || !tableContainer.contains(table.wrapper)) {
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
                            const searchInput = document.getElementById('tableSearch');
                            const searchClearBtn = document.getElementById('searchClear');
                            if (searchInput) searchInput.value = '';
                            if (searchClearBtn) searchClearBtn.style.display = 'none';
                        }
                    });

                    const debouncedFilter = UtilityService.debounce((value) => table.filter(value), 300);
                    const searchClearBtn = document.getElementById('searchClear');
                    const searchInput = document.getElementById('tableSearch');
                    if (searchInput) {
                        searchInput.addEventListener('input', (e) => {
                            const value = e.target.value;
                            debouncedFilter(value);
                            if (searchClearBtn) searchClearBtn.style.display = value ? 'flex' : 'none';
                        });
                    }
                    if (searchClearBtn) {
                        searchClearBtn.addEventListener('click', () => {
                            if (searchInput) searchInput.value = '';
                            table.filter('');
                            searchClearBtn.style.display = 'none';
                            if (searchInput) searchInput.focus();
                        });
                    }
                }

                table.load(rows);

                if (tableCard) {
                    const loadingOverlay = tableCard.querySelector('.loading-overlay');
                    if (loadingOverlay) loadingOverlay.remove();
                }

                if (tableCardBody) tableCardBody.classList.remove('hidden');
                const tableToolbar = document.getElementById('tableToolbar');
                if (tableToolbar) tableToolbar.classList.remove('hidden');
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
                if (tableCard) {
                    const loadingOverlay = tableCard.querySelector('.loading-overlay');
                    if (loadingOverlay) loadingOverlay.remove();
                }
                if (tableCardBody) tableCardBody.classList.add('hidden');
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

            currentLoadingController = null;
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            if (tableCardBody) tableCardBody.classList.add('hidden');
            if (tableContainer) {
                tableContainer.textContent = '';
                tableContainer.style.display = 'none';
            }
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

    function getRouteFrameworkId() {
        const path = window.location.pathname || '';
        const match = path.match(/\/framework\/([^\/?#]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    function navigateToFramework(id, { replace = false } = {}) {
        if (currentFrameworkId === id) return;
        const url = `/framework/${encodeURIComponent(id)}`;
        const method = replace ? 'replaceState' : 'pushState';
        window.history[method]({ frameworkId: id }, '', url);
        openFramework(id);
    }

    function updatePageHeader(selectedName = null) {
        const titleEl = document.querySelector('.info-title');
        if (titleEl) titleEl.textContent = selectedName ? `Compliance Frameworks: ${selectedName}` : 'Compliance Frameworks';

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

    function getTable() { return table; }

    return {
        loadFrameworks,
        openFramework,
        navigateToFramework,
        getRouteFrameworkId,
        activateItem,
        updatePageHeader,
        getTable
    };
}
