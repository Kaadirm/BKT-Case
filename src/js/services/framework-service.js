import { Api } from './api.js';

export class FrameworkService {
  constructor(apiInstance = null) {
    this.api = apiInstance || new Api();
  }

  /**
   * Get all frameworks with optional filtering and sorting
   */
  async getFrameworks(options = {}) {
    const { search, status, sortBy = 'name', sortOrder = 'asc' } = options;
    let frameworks = await this.api.getFrameworks();

    // Apply search filter
    if (search) {
      frameworks = await this.api.searchFrameworks(search);
    }

    // Apply status filter
    if (status && status !== 'all') {
      frameworks = frameworks.filter(f => f.status === status);
    }

    // Apply sorting
    frameworks.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return frameworks;
  }

  /**
   * Get framework by ID with full details
   */
  async getFrameworkDetails(id) {
    try {
      const framework = await this.api.getFrameworkById(id);
      const controls = await this.api.getFrameworkRows(id);
      return {
        ...framework,
        controls,
        controlCount: controls.length
      };
    } catch (error) {
      throw new Error(`Failed to load framework details: ${error.message}`);
    }
  }

  /**
   * Create a new framework
   */
  async createFramework(frameworkData) {
    const { name, shortName, description, controls = [], template } = frameworkData;

    // Validate required fields
    if (!name?.trim()) {
      throw new Error('Framework name is required');
    }
    if (!shortName?.trim()) {
      throw new Error('Framework short name is required');
    }

    try {
      // Upload template if provided
      let templateInfo = null;
      if (template instanceof File) {
        templateInfo = await this.api.uploadFrameworkTemplate(template);
      }

      // Create framework
      const payload = {
        name: name.trim(),
        shortName: shortName.trim(),
        description: description?.trim() || '',
        status: 'Ready to Map',
        statusClass: 'status-ready',
        icon: 'bi-grid',
        controls,
        template: templateInfo
      };

      const result = await this.api.createFramework(payload);
      return result;
    } catch (error) {
      throw new Error(`Failed to create framework: ${error.message}`);
    }
  }

  /**
   * Update an existing framework
   */
  async updateFramework(id, updates) {
    try {
      const result = await this.api.updateFramework(id, updates);
      return result;
    } catch (error) {
      throw new Error(`Failed to update framework: ${error.message}`);
    }
  }

  /**
   * Delete a framework
   */
  async deleteFramework(id) {
    try {
      const result = await this.api.deleteFramework(id);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete framework: ${error.message}`);
    }
  }

  /**
   * Update framework status
   */
  async updateFrameworkStatus(id, status) {
    const statusClassMap = {
      'Ready to Map': 'status-ready',
      'Mapping in Progress': 'status-progress',
      'Ready to Publish': 'status-ready',
      'Published': 'status-published',
      'Mapping Failed': 'status-failed',
      'Deactivated': 'status-deactivated',
      'System': 'text-bg-light'
    };

    try {
      const result = await this.api.updateFramework(id, {
        status,
        statusClass: statusClassMap[status] || 'text-bg-light'
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to update framework status: ${error.message}`);
    }
  }

  /**
   * Get framework statistics
   */
  async getStatistics() {
    try {
      return await this.api.getFrameworkStatistics();
    } catch (error) {
      // Fallback to manual calculation
      const frameworks = await this.api.getFrameworks();
      return {
        total: frameworks.length,
        published: frameworks.filter(f => f.status === 'Published').length,
        inProgress: frameworks.filter(f => f.status === 'Mapping in Progress').length,
        ready: frameworks.filter(f => f.status === 'Ready to Map' || f.status === 'Ready to Publish').length,
        failed: frameworks.filter(f => f.status === 'Mapping Failed').length,
        deactivated: frameworks.filter(f => f.status === 'Deactivated').length
      };
    }
  }

  /**
   * Duplicate a framework
   */
  async duplicateFramework(id, newName) {
    try {
      const original = await this.getFrameworkDetails(id);
      const duplicated = {
        name: newName || `${original.name} (Copy)`,
        shortName: `${original.shortName}_copy`,
        description: original.description,
        controls: original.controls || []
      };
      return await this.createFramework(duplicated);
    } catch (error) {
      throw new Error(`Failed to duplicate framework: ${error.message}`);
    }
  }
}
