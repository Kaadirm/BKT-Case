export function createApi({ serviceBase = '/api' } = {}) {
  serviceBase = serviceBase.replace(/\/$/, '');
  let _controller = null;

  const abort = () => {
    if (_controller) {
      try { _controller.abort(); } catch { }
      _controller = null;
    }
  };

  const _fetch = async (url, { abortable = false, signal = null } = {}) => {
    let controller;
    if (abortable && !signal) {
      abort();
      controller = new AbortController();
      _controller = controller;
      signal = controller.signal;
    }
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
      if (abortable && controller) _controller = null;
    }
  };

  const _service = (path, opts) => _fetch(`${serviceBase}${path}`, opts);

  const getFrameworks = async (options = {}) => {
    const { signal } = options;
    const pick = (res) => Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.rows ?? []);
    return pick(await _service('/frameworks', { abortable: true, signal }));
  };

  const getControlsbyFrameworkId = async (id, options = {}) => {
    const { signal } = options;
    // Get controls for a specific framework using the controls endpoint
    const controls = await _service(`/controls?frameworkId=${encodeURIComponent(id)}`, { abortable: true, signal });
    return Array.isArray(controls) ? controls : (controls.data || controls.items || []);
  };

  return {
    abort,
    getFrameworks,
    getControlsbyFrameworkId
  };
}
