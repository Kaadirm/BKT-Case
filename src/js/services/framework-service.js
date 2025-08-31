import { createApi } from './api.js';

export function FrameworkService(apiInstance = null) {
  const api = apiInstance || createApi();

  return {
    /**
     * Get all frameworks
     */
    async getFrameworks() {
      return await api.getFrameworks();
    }
  };
}
