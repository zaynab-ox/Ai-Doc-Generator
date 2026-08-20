// core/state.js — Shared App State + UI Helpers

const AppState = {
  rawCode:      '',
  parsedData:   null,
  analyzedData: null,
  generatedDoc: '',
  history:      [],
  settings: {
    model:  'claude-sonnet-4-20250514',
    style:  'detailed',
    tokens: 2000
  }
};

// ── Module status update ──────────────────
function setModuleStatus(id, status) {
  // Sidebar badge
  const badge = document.getElementById(`status-${id}`);
  if (badge) { badge.className = `mod-badge ${status}`; badge.textContent = status; }

  // Pipeline node
  const pipe = document.getElementById(`pipe-${id}`);
  if (pipe) { pipe.className = `pipe-node ${status === 'running' ? 'active' : status}`; }

  // Topbar dot
  const dot = document.getElementById(`ps-${id}`);
  if (dot) { dot.className = `pd ${status}`; }
}

// ── App-wide status pill ──────────────────
function setAppStatus(text, type = '') {
  const el = document.getElementById('app-status');
  if (el) { el.textContent = text; el.className = `status-pill ${type}`; }
}

// ── Toast notifications ───────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', info: '●' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s';
    setTimeout(() => toast.remove(), 260);
  }, duration);
}

// ── Sidebar stat boxes ────────────────────
function updateStats({ lines = 0, fns = 0, cls = 0, time = '—' } = {}) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-lines', lines);
  set('stat-fns',   fns);
  set('stat-cls',   cls);
  set('stat-time',  time);
}

// ── Reset all modules to idle ─────────────
function resetPipeline() {
  ['input','parser','analyzer','ai','preview','export'].forEach(id => setModuleStatus(id, 'idle'));
  setAppStatus('Ready', '');
}

// ── File downloader ───────────────────────
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
