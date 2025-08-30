import { createApi } from './api.js';

export function createFrameworkService(apiInstance = null) {
  const api = apiInstance || createApi();

  return {
    /**
     * Get all frameworks
     */
    async getFrameworks() {
      return await api.getFrameworks();
    },

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
          templateInfo = await api.uploadFrameworkTemplate(template);
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

        const result = await api.createFramework(payload);
        return result;
      } catch (error) {
        throw new Error(`Failed to create framework: ${error.message}`);
      }
    }
  };
}
