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

  async _fetch(url, { abortable = false } = {}) {
    let controller;
    if (abortable) {
      this.abort();
      controller = new AbortController();
      this._controller = controller;
    }
    try {
      const res = await fetch(url, { signal: controller?.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
      if (abortable) this._controller = null;
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

  async getFrameworkRows(id) {
    const path = `/frameworks/${encodeURIComponent(id)}/controls`;
    if (this.mode === 'json') {
      const data = await this._json(`${id}.json`, { abortable: true });
      return Array.isArray(data) ? data : (data.rows || []);
    }
    if (this.mode === 'service') {
      const data = await this._service(path, { abortable: true });
      return Array.isArray(data) ? data : (data.rows || []);
    }
    try {
      const data = await this._service(path, { abortable: true });
      return Array.isArray(data) ? data : (data.rows || []);
    } catch {
      const data = await this._json(`${id}.json`, { abortable: true });
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
}
