export class Api {
  constructor({ serviceBase = '/api' } = {}) {
    this.serviceBase = serviceBase.replace(/\/$/, '');
    this._controller = null;
  }

  abort() {
    if (this._controller) {
      try { this._controller.abort(); } catch { }
      this._controller = null;
    }
  }

  async _fetch(url, { abortable = false, signal = null } = {}) {
    let controller;
    if (abortable && !signal) {
      this.abort();
      controller = new AbortController();
      this._controller = controller;
      signal = controller.signal;
    }
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
      if (abortable && controller) this._controller = null;
    }
  }

  async _service(path, opts) { return this._fetch(`${this.serviceBase}${path}`, opts); }
  async getFrameworks() {
    const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
    return pick(await this._service('/frameworks'));
  }

  async getFrameworkRows(id, options = {}) {
    const { signal } = options;
    // Get controls for a specific framework using the controls endpoint
    const controls = await this._service(`/controls?frameworkId=${encodeURIComponent(id)}`, { abortable: true, signal });
    return Array.isArray(controls) ? controls : (controls.data || controls.items || []);
  }

  async createFramework(payload) {
    const url = `${this.serviceBase}/frameworks`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async updateFramework(id, payload) {
    const url = `${this.serviceBase}/frameworks/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'PATCH', // Use PATCH instead of PUT to match NestJS convention
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async deleteFramework(id) {
    const url = `${this.serviceBase}/frameworks/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getFrameworkById(id) {
    const pick = (res) => res?.data ?? res;
    return pick(await this._service(`/frameworks/${encodeURIComponent(id)}`));
  }

  async addControlItem(frameworkId, controlItem) {
    const url = `${this.serviceBase}/controls`;
    const payload = {
      ...controlItem,
      frameworkId // Include framework ID in the control item
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async updateControlItem(frameworkId, controlId, controlItem) {
    const url = `${this.serviceBase}/controls/${encodeURIComponent(controlId)}`;
    const payload = {
      ...controlItem,
      frameworkId // Include framework ID in the control item
    };
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async deleteControlItem(frameworkId, controlId) {
    const url = `${this.serviceBase}/controls/${encodeURIComponent(controlId)}`;
    const res = await fetch(url, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async uploadFrameworkTemplate(file) {
    const url = `${this.serviceBase}/frameworks/upload-template`;
    const formData = new FormData();
    formData.append('template', file);
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async searchFrameworks(query) {
    const frameworks = await this.getFrameworks();
    if (!query) return frameworks;

    const searchTerm = query.toLowerCase();
    return frameworks.filter(framework =>
      framework.name?.toLowerCase().includes(searchTerm) ||
      framework.subtitle?.toLowerCase().includes(searchTerm) ||
      framework.description?.toLowerCase().includes(searchTerm)
    );
  }

  async getFrameworkStatistics() {
    const url = `${this.serviceBase}/frameworks/statistics`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // Additional control methods
  async getAllControls() {
    const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
    return pick(await this._service('/controls'));
  }

  async getControlById(id) {
    const pick = (res) => res?.data ?? res;
    return pick(await this._service(`/controls/${encodeURIComponent(id)}`));
  }
}
