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

}
