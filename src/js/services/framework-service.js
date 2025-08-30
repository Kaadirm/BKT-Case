import { Api } from './api.js';

export class FrameworkService {
  constructor(apiInstance = null) {
    this.api = apiInstance || new Api();
  }

  /**
   * Get all frameworks 
   */
  async getFrameworks() {
    return await this.api.getFrameworks();
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

}
