export class Api {
  constructor({ mode = 'auto', serviceBase = '/api', jsonBase = './public/api' } = {}) {
    this.mode = mode; // 'service' | 'json' | 'auto'
    this.serviceBase = serviceBase.replace(/\/$/, '');
    this.jsonBase = jsonBase.replace(/\/$/, '');
    this._controller = null;
  }

  abort() {
    if (this._controller) {
      try { this._controller.abort(); } catch {}
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
  async _json(file, opts) { return this._fetch(`${this.jsonBase}/${file}`, opts); }

  async getFrameworks() {
  const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
  if (this.mode === 'json') return pick(await this._json('frameworks.json'));
  if (this.mode === 'service') return pick(await this._service('/frameworks'));
  try { return pick(await this._service('/frameworks')); } catch { return pick(await this._json('frameworks.json')); }
  }

  async getFrameworkRows(id, options = {}) {
    const { signal } = options;
    // Get controls for a specific framework using the controls endpoint
    if (this.mode === 'json') {
      const data = await this._json(`${id}.json`, { abortable: true, signal });
      return Array.isArray(data) ? data : (data.rows || []);
    }
    if (this.mode === 'service') {
      // Use the controls endpoint with framework filter
      const controls = await this._service(`/controls?frameworkId=${encodeURIComponent(id)}`, { abortable: true, signal });
      return Array.isArray(controls) ? controls : (controls.data || controls.items || []);
    }
    try {
      // Use the controls endpoint with framework filter
      const controls = await this._service(`/controls?frameworkId=${encodeURIComponent(id)}`, { abortable: true, signal });
      return Array.isArray(controls) ? controls : (controls.data || controls.items || []);
    } catch {
      const data = await this._json(`${id}.json`, { abortable: true, signal });
      return Array.isArray(data) ? data : (data.rows || []);
    }
  }

  async createFramework(payload) {
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, id: `local-${Date.now()}`, ...payload };
    }
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
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, id, ...payload };
    }
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
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, id };
    }
    const url = `${this.serviceBase}/frameworks/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getFrameworkById(id) {
    const pick = (res) => res?.data ?? res;
    if (this.mode === 'json') {
      try {
        return pick(await this._json(`${id}.json`));
      } catch {
        // Fallback: find in frameworks list
        const frameworks = await this.getFrameworks();
        return frameworks.find(f => f.id === id || f._id === id);
      }
    }
    if (this.mode === 'service') return pick(await this._service(`/frameworks/${encodeURIComponent(id)}`));
    try { 
      return pick(await this._service(`/frameworks/${encodeURIComponent(id)}`)); 
    } catch { 
      const frameworks = await this.getFrameworks();
      return frameworks.find(f => f.id === id || f._id === id);
    }
  }

  async addControlItem(frameworkId, controlItem) {
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, id: `control-${Date.now()}`, ...controlItem };
    }
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
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, id: controlId, ...controlItem };
    }
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
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, id: controlId };
    }
    const url = `${this.serviceBase}/controls/${encodeURIComponent(controlId)}`;
    const res = await fetch(url, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async uploadFrameworkTemplate(file) {
    if (this.mode === 'json') {
      // Local mock: pretend success
      return { ok: true, fileName: file.name, size: file.size };
    }
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
    if (this.mode === 'json') {
      // Local mock statistics
      const frameworks = await this.getFrameworks();
      return {
        total: frameworks.length,
        published: frameworks.filter(f => f.status === 'Published').length,
        inProgress: frameworks.filter(f => f.status === 'Mapping in Progress').length,
        ready: frameworks.filter(f => f.status === 'Ready to Map' || f.status === 'Ready to Publish').length,
        failed: frameworks.filter(f => f.status === 'Mapping Failed').length
      };
    }
    const url = `${this.serviceBase}/frameworks/statistics`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // Additional control methods
  async getAllControls() {
    const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
    if (this.mode === 'json') {
      // For JSON mode, we'd need to aggregate from all framework files
      const frameworks = await this.getFrameworks();
      const allControls = [];
      for (const framework of frameworks) {
        try {
          const controls = await this.getFrameworkRows(framework.id);
          allControls.push(...controls.map(c => ({ ...c, frameworkId: framework.id })));
        } catch (e) {
          // Skip if framework data not available
        }
      }
      return allControls;
    }
    if (this.mode === 'service') return pick(await this._service('/controls'));
    try { return pick(await this._service('/controls')); } catch { return []; }
  }

  async getControlById(id) {
    const pick = (res) => res?.data ?? res;
    if (this.mode === 'json') {
      // Would need to search through all framework files
      const allControls = await this.getAllControls();
      return allControls.find(c => c.id === id || c.controlId === id);
    }
    if (this.mode === 'service') return pick(await this._service(`/controls/${encodeURIComponent(id)}`));
    try { 
      return pick(await this._service(`/controls/${encodeURIComponent(id)}`)); 
    } catch { 
      return null;
    }
  }
}
