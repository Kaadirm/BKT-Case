// Modal Manager - encapsulates new framework modal, stepper wiring, and form helpers
export function ModalManager({
    frameworkStepper,
    createStepper,
    getStepper,
    frameworkForm,
    templateFile,
    templateFileName,
    newFrameworkModal,
    newFrameworkModalLabel,
    createSimpleTable,
    setupFormValidationClearing
}) {
    let modalControlsTable = null;
    let currentFrameworkData = {};

    function ensureStepperInstance() {
        if (!frameworkStepper) return null;
        let stepper = getStepper(frameworkStepper);
        if (!stepper) {
            stepper = createStepper(frameworkStepper, {
                onChange: (from, to) => {
                    updateModalTitle(to);
                    updateModalButtons(to);
                    updateStepContent(to);
                },
                onValidate: (from, to) => {
                    if (to > from) {
                        switch (from) {
                            case 1: return validateFrameworkDetails();
                            case 2: return validateControlItems();
                            default: return true;
                        }
                    }
                    return true;
                },
                onBeforeStepChange: (from, to) => {
                    saveCurrentStepData(from);
                    return true;
                }
            });
        }
        return stepper;
    }

    function updateModalTitle(step) {
        const stepIndicator = newFrameworkModalLabel?.querySelector('.step-indicator');
        if (stepIndicator) stepIndicator.textContent = `${step}/2`;
    }

    function updateModalButtons(/*step*/) { /* handled by stepper */ }

    function validateFrameworkDetails() {
        if (!frameworkForm) return true;
        const isValid = frameworkForm.checkValidity();
        if (!isValid) {
            const invalidInputs = frameworkForm.querySelectorAll(':invalid');
            invalidInputs.forEach(input => {
                input.classList.add('invalid');
                const errorEl = input.parentElement.querySelector('.form-error');
                if (errorEl) errorEl.classList.add('visible');
            });
        }
        return isValid;
    }

    function validateControlItems() { return true; }

    function saveCurrentStepData(step) {
        switch (step) {
            case 1:
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
            case 2:
                // no-op for now
                break;
        }
    }

    function updateStepContent(stepIndex) {
        switch (stepIndex) {
            case 1: updateFrameworkDetailsStep(); break;
            case 2: updateControlItemsStep(); break;
            default: break;
        }
    }

    function updateFrameworkDetailsStep() {
        if (templateFile && !templateFile.dataset.initialized) {
            templateFile.dataset.initialized = 'true';
            templateFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (templateFileName) templateFileName.textContent = file ? file.name : '';
            });
        }
    }

    function updateControlItemsStep() {
        const step2El = document.querySelector('#frameworkStepper .step[data-index="2"]');
        const host = step2El ? step2El.querySelector('.custom-table-container') : null;
        if (!modalControlsTable) {
            if (!host) return;
            const dummyInfo = document.createElement('div');
            modalControlsTable = createSimpleTable(host, {
                columns: [
                    { key: 'controlId', label: 'Control ID', sortable: false },
                    { key: 'controlCategory', label: 'Control Category', sortable: false },
                    { key: 'controlDescription', label: 'Control Description', sortable: false },
                    {
                        key: '__actions', label: 'Actions', sortable: false, render: (_v, row) => {
                            const showEdit = (row.showEdit === false) ? false : !row.approved;
                            const editBtn = showEdit ? `\n            <button type="button" title="Edit" aria-label="Edit ${row.controlId}"\n              class="btn-action edit">\n              <span class="edit-icon" aria-hidden="true"></span>\n            </button>` : '';
                            const approveBtn = row.approved ? `\n            <button type="button" title="Approved" aria-label="Approved ${row.controlId}"\n              class="btn-action approve">\n              <span class="approved-icon" aria-hidden="true"></span>\n            </button>` : '';
                            const deleteBtn = `\n            <button type="button" title="Delete" aria-label="Delete ${row.controlId}"\n              class="btn-action delete">\n              <span class="delete-icon" aria-hidden="true"></span>\n            </button>`;
                            return `<div class="cell-actions text-end">${editBtn}${approveBtn}${deleteBtn}</div>`;
                        }
                    }
                ],
                pageSize: 1000000,
                tableClass: 'custom-table',
                wrapperClass: 'custom-table-container',
                theadClass: '',
                externalInfoEl: dummyInfo
            });
        }

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
        if (modalControlsTable) modalControlsTable.load(dummyRows);
    }

    function resetFrameworkForm() {
        if (frameworkForm) {
            frameworkForm.reset();
            const invalidInputs = frameworkForm.querySelectorAll('.invalid');
            invalidInputs.forEach(input => {
                input.classList.remove('invalid');
                const errorEl = input.parentElement.querySelector('.form-error');
                if (errorEl) errorEl.classList.remove('visible');
            });
        }

        const tableBody = document.querySelector('#newFwItemsTable tbody');
        if (tableBody) tableBody.textContent = '';
        if (templateFile) templateFile.value = '';
        if (templateFileName) templateFileName.textContent = '';
        currentFrameworkData = {};
        modalControlsTable = null;
        const step2HostTable = document.getElementById('newFwItemsTable');
        const step2Host = step2HostTable ? step2HostTable.parentElement : null;
        if (step2Host) {
            step2Host.innerHTML = `\n      <table class="custom-table" id="newFwItemsTable">\n        <thead>\n          <tr>\n            <th style="width: 160px;">Control ID</th>\n            <th style="width: 240px;">Control Category</th>\n            <th>Control Description</th>\n            <th class="text-end" style="width: 100px;">Actions</th>\n          </tr>\n        </thead>\n        <tbody></tbody>\n      </table>`;
        }
    }

    function openNewFrameworkModal() {
        if (!newFrameworkModal) return;
        newFrameworkModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        resetFrameworkForm();
        if (frameworkForm) setupFormValidationClearing();
        const stepper = ensureStepperInstance();
        if (stepper) stepper.reset();
        setTimeout(() => {
            const firstInput = newFrameworkModal.querySelector('input[name="name"]');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    function closeNewFrameworkModal() {
        if (!newFrameworkModal) return;
        newFrameworkModal.style.display = 'none';
        document.body.style.overflow = '';
        const stepper = getStepper(frameworkStepper);
        if (stepper) stepper.reset();
        resetFrameworkForm();
    }

    return {
        ensureStepperInstance,
        openNewFrameworkModal,
        closeNewFrameworkModal,
        resetFrameworkForm
    };
}
