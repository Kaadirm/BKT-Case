// Main API and Service exports
export { Api } from './api.js';
export { FrameworkService } from './framework-service.js';
export { ControlItemService } from './control-item-service.js';
import fileUploadService from './file-upload-service.js';
export { fileUploadService };
export { UtilityService } from './utility-service.js';

// Service factory for creating configured service instances
export class ServiceFactory {
  constructor(config = {}) {
    this.config = {
      serviceBase: 'https://bk-backend.vercel.app/api/v1',
      ...config
    };

    this._api = null;
    this._frameworkService = null;
    this._controlItemService = null;
    this._fileUploadService = null;
  }

  get api() {
    if (!this._api) {
      const { serviceBase } = this.config;
      this._api = new Api({ serviceBase });
    }
    return this._api;
  }

  get frameworkService() {
    if (!this._frameworkService) {
      this._frameworkService = new FrameworkService(this.api);
    }
    return this._frameworkService;
  }

  get controlItemService() {
    if (!this._controlItemService) {
      this._controlItemService = ControlItemService(this.api);
    }
    return this._controlItemService;
  }

  get fileUploadService() {
    if (!this._fileUploadService) {
      this._fileUploadService = fileUploadService;
    }
    return this._fileUploadService;
  }

  get utilityService() {
    return UtilityService; // Static class
  }

  // Reset all service instances (useful for testing or config changes)
  reset() {
    this._api = null;
    this._frameworkService = null;
    this._controlItemService = null;
    this._fileUploadService = null;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.reset(); // Reset instances to use new config
  }
}

// Create default service factory instance
export const services = new ServiceFactory();
