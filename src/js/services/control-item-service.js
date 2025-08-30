import { createApi } from './api.js';

export function ControlItemService(apiInstance = null) {
  const api = apiInstance || createApi();

  return {
    /**
     * Get all control items for a framework
     */
    async getControlItems(frameworkId, options = {}) {
      const { search, category, sortBy = 'controlId', sortOrder = 'asc', signal } = options;
      let controls = await api.getControlsbyFrameworkId(frameworkId, { signal });
      return controls;
    }
  };
}
