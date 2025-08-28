import { Api } from './api.js';

export class ControlItemService {
  constructor(apiInstance = null) {
    this.api = apiInstance || new Api();
  }

  /**
   * Get all control items for a framework
   */
  async getControlItems(frameworkId, options = {}) {
    const { search, category, sortBy = 'controlId', sortOrder = 'asc', signal } = options;
    let controls = await this.api.getFrameworkRows(frameworkId, { signal });

    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      controls = controls.filter(control =>
        control.controlId?.toLowerCase().includes(searchTerm) ||
        control.controlCategory?.toLowerCase().includes(searchTerm) ||
        control.controlDescription?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (category && category !== 'all') {
      controls = controls.filter(control => control.controlCategory === category);
    }

    // Apply sorting
    controls.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return controls;
  }

  /**
   * Add a new control item to a framework
   */
  async addControlItem(frameworkId, controlItem) {
    const { controlId, controlCategory, controlDescription } = controlItem;

    // Validate required fields
    if (!controlId?.trim()) {
      throw new Error('Control ID is required');
    }
    if (!controlCategory?.trim()) {
      throw new Error('Control Category is required');
    }
    if (!controlDescription?.trim()) {
      throw new Error('Control Description is required');
    }

    // Check for duplicate control ID
    const existingControls = await this.api.getFrameworkRows(frameworkId);
    if (existingControls.some(c => c.controlId === controlId.trim())) {
      throw new Error(`Control ID "${controlId}" already exists in this framework`);
    }

    try {
      const payload = {
        controlId: controlId.trim(),
        controlCategory: controlCategory.trim(),
        controlDescription: controlDescription.trim()
      };

      const result = await this.api.addControlItem(frameworkId, payload);
      return result;
    } catch (error) {
      throw new Error(`Failed to add control item: ${error.message}`);
    }
  }

  /**
   * Update an existing control item
   */
  async updateControlItem(frameworkId, controlId, updates) {
    try {
      const result = await this.api.updateControlItem(frameworkId, controlId, updates);
      return result;
    } catch (error) {
      throw new Error(`Failed to update control item: ${error.message}`);
    }
  }

  /**
   * Delete a control item
   */
  async deleteControlItem(frameworkId, controlId) {
    try {
      const result = await this.api.deleteControlItem(frameworkId, controlId);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete control item: ${error.message}`);
    }
  }

  /**
   * Get unique control categories for a framework
   */
  async getControlCategories(frameworkId) {
    try {
      const controls = await this.api.getFrameworkRows(frameworkId);
      const categories = [...new Set(controls.map(c => c.controlCategory))].filter(Boolean);
      return categories.sort();
    } catch (error) {
      throw new Error(`Failed to get control categories: ${error.message}`);
    }
  }

  /**
   * Bulk add control items
   */
  async bulkAddControlItems(frameworkId, controlItems) {
    const results = [];
    const errors = [];

    for (const [index, item] of controlItems.entries()) {
      try {
        const result = await this.addControlItem(frameworkId, item);
        results.push(result);
      } catch (error) {
        errors.push({ index, item, error: error.message });
      }
    }

    return { results, errors };
  }

  /**
   * Validate control item data
   */
  validateControlItem(controlItem) {
    const errors = [];
    
    if (!controlItem.controlId?.trim()) {
      errors.push('Control ID is required');
    }
    
    if (!controlItem.controlCategory?.trim()) {
      errors.push('Control Category is required');
    }
    
    if (!controlItem.controlDescription?.trim()) {
      errors.push('Control Description is required');
    }

    // Validate Control ID format (optional - can be customized)
    const controlIdPattern = /^[A-Za-z0-9\s\-._]+$/;
    if (controlItem.controlId && !controlIdPattern.test(controlItem.controlId)) {
      errors.push('Control ID contains invalid characters');
    }

    return errors;
  }

  /**
   * Import control items from CSV/Excel data
   */
  async importControlItems(frameworkId, data, mapping = {}) {
    const {
      controlIdColumn = 'controlId',
      controlCategoryColumn = 'controlCategory',
      controlDescriptionColumn = 'controlDescription'
    } = mapping;

    const controlItems = data.map(row => ({
      controlId: row[controlIdColumn],
      controlCategory: row[controlCategoryColumn],
      controlDescription: row[controlDescriptionColumn]
    }));

    // Validate all items first
    const validationErrors = [];
    controlItems.forEach((item, index) => {
      const errors = this.validateControlItem(item);
      if (errors.length > 0) {
        validationErrors.push({ row: index + 1, errors });
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(`Validation errors found: ${JSON.stringify(validationErrors)}`);
    }

    // Bulk add if validation passes
    return await this.bulkAddControlItems(frameworkId, controlItems);
  }

  /**
   * Export control items to structured data
   */
  async exportControlItems(frameworkId, format = 'json') {
    try {
      const controls = await this.api.getFrameworkRows(frameworkId);
      
      switch (format.toLowerCase()) {
        case 'csv':
          return this._convertToCSV(controls);
        case 'excel':
          return this._convertToExcel(controls);
        default:
          return controls;
      }
    } catch (error) {
      throw new Error(`Failed to export control items: ${error.message}`);
    }
  }

  /**
   * Convert control items to CSV format
   */
  _convertToCSV(controls) {
    const headers = ['Control ID', 'Control Category', 'Control Description'];
    const rows = controls.map(control => [
      control.controlId || '',
      control.controlCategory || '',
      control.controlDescription || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Convert control items to Excel-like format (tab-separated)
   */
  _convertToExcel(controls) {
    const headers = ['Control ID', 'Control Category', 'Control Description'];
    const rows = controls.map(control => [
      control.controlId || '',
      control.controlCategory || '',
      control.controlDescription || ''
    ]);

    const excelContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');

    return excelContent;
  }
}
