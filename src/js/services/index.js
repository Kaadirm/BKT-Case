// Main API and Service exports
import { createApi } from './api.js';
export { createApi };
export { createFrameworkService } from './framework-service.js';
export { ControlItemService } from './control-item-service.js';
import fileUploadService from './file-upload-service.js';
export { fileUploadService };
export { UtilityService } from './utility-service.js';

// Service factory for creating configured service instances
export function createServiceFactory(config = {}) {
  const state = {
    config: {
      serviceBase: 'https://bk-backend.vercel.app/api/v1',
      ...config
    },
    _api: null,
    _frameworkService: null,
    _controlItemService: null,
    _fileUploadService: null
  };

  const reset = () => {
    state._api = null;
    state._frameworkService = null;
    state._controlItemService = null;
    state._fileUploadService = null;
  };

  const updateConfig = (newConfig) => {
    state.config = { ...state.config, ...newConfig };
    reset();
  };

  return {
    get api() {
      if (!state._api) {
        const { serviceBase } = state.config;
        state._api = createApi({ serviceBase });
      }
      return state._api;
    },

    get frameworkService() {
      if (!state._frameworkService) {
        state._frameworkService = createFrameworkService(this.api);
      }
      return state._frameworkService;
    },

    get controlItemService() {
      if (!state._controlItemService) {
        state._controlItemService = ControlItemService(this.api);
      }
      return state._controlItemService;
    },

    get fileUploadService() {
      if (!state._fileUploadService) {
        state._fileUploadService = fileUploadService;
      }
      return state._fileUploadService;
    },

    get utilityService() {
      return UtilityService;
    },

    reset,
    updateConfig
  };
}

// Create default service factory instance
export const services = createServiceFactory();
