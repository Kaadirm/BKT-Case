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
  async getFrameworks(options = {}) {
    const { signal } = options;
    const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
    return pick(await this._service('/frameworks', { abortable: true, signal }));
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

}
