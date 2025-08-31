export function createApi({ serviceBase = '/api' } = {}) {
  serviceBase = serviceBase.replace(/\/$/, '');

  const _fetch = async (url, { signal = null } = {}) => {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
    }
  };

  const _service = (path, opts) => _fetch(`${serviceBase}${path}`, opts);

  const getFrameworks = async (options = {}) => {
    const { signal } = options;
    const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
    return pick(await _service('/frameworks', { signal }));
  };

  const getControlsbyFrameworkId = async (id, options = {}) => {
    const { signal } = options;
    // Get controls for a specific framework using the controls endpoint
    const controls = await _service(`/controls?frameworkId=${encodeURIComponent(id)}`, { signal });
    return Array.isArray(controls) ? controls : (controls.data || controls.items || []);
  };

  return {
    getFrameworks,
    getControlsbyFrameworkId
  };
}
