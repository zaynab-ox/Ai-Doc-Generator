// core/app.js — Master App Controller
// Handles: tabs, loader, history, settings, error recovery, button reset

const App = {

  init() {
    this._initLoader();
    this._initTabs();
    this._initSettings();
    this._initHistory();
    this._initErrorHandler();
    this._initModuleNav();
  },

  // ── LOADER ──────────────────────────────
  _initLoader() {
    const steps = [
      [10,  'Loading EventBus…'],
      [30,  'Initializing modules…'],
      [55,  'Connecting parser…'],
      [75,  'Setting up AI engine…'],
      [90,  'Preparing UI…'],
      [100, 'Ready!'],
    ];

    const fill = document.getElementById('loader-fill');
    const text = document.getElementById('loader-text');
    let i = 0;

    const tick = () => {
      if (i >= steps.length) {
        setTimeout(() => {
          document.getElementById('loader').classList.add('hidden');
        }, 300);
        return;
      }
      const [pct, msg] = steps[i++];
      fill.style.width = pct + '%';
      text.textContent = msg;
      setTimeout(tick, 220);
    };
    tick();
  },

  // ── TABS ────────────────────────────────
  _initTabs() {
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const el = document.getElementById(`tab-${tab}`);
        if (el) el.classList.add('active');

        // Render history when switching to it
        if (tab === 'history') this._renderHistory();
      });
    });
  },

  // ── SETTINGS ────────────────────────────
  _initSettings() {
    // Load saved settings
    const saved = this._loadSettings();
    if (saved) {
      Object.assign(AppState.settings, saved);
      this._applySettings(saved);
    }

    // Model
    document.getElementById('setting-model')?.addEventListener('change', (e) => {
      AppState.settings.model = e.target.value;
      this._saveSettings();
    });

    // Style
    document.getElementById('setting-style')?.addEventListener('change', (e) => {
      AppState.settings.style = e.target.value;
      this._saveSettings();
    });

    // Tokens
    document.getElementById('setting-tokens')?.addEventListener('change', (e) => {
      AppState.settings.tokens = parseInt(e.target.value);
      this._saveSettings();
    });

    // Theme
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.theme === 'light') {
          document.body.classList.add('light');
        } else {
          document.body.classList.remove('light');
        }
        this._saveSettings();
      });
    });
  },

  _applySettings(settings) {
    const m = document.getElementById('setting-model');
    const s = document.getElementById('setting-style');
    const t = document.getElementById('setting-tokens');
    if (m && settings.model)  m.value = settings.model;
    if (s && settings.style)  s.value = settings.style;
    if (t && settings.tokens) t.value = settings.tokens;
  },

  _saveSettings() {
    try {
      sessionStorage.setItem('docai_settings', JSON.stringify(AppState.settings));
    } catch(e) {}
  },

  _loadSettings() {
    try {
      const s = sessionStorage.getItem('docai_settings');
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  },

  // ── HISTORY ─────────────────────────────
 _initHistory() {

  // ── Step 1: LocalStorage se load karo pehle ──
  try {
    const saved = localStorage.getItem('docai_history');
    if (saved) {
      AppState.history = JSON.parse(saved);
      const countEl = document.getElementById('history-count');
      if (countEl) countEl.textContent = AppState.history.length;
    }
  } catch(e) {}

  // ── Step 2: Naya doc aaye toh save bhi karo ──
  EventBus.on('docs:ready', ({ docs, analyzed, ms }) => {
    AppState.history.unshift({
      id:       Date.now(),
      docs,
      analyzed,
      ms,
      lang:     analyzed.language,
      fns:      analyzed.functions.length,
      preview:  docs.slice(0, 100),
      time:     new Date().toLocaleTimeString()
    });

    // Max 10 rakho
    if (AppState.history.length > 10) AppState.history.pop();

    // ── LocalStorage mein save karo ──
    try {
      localStorage.setItem(
        'docai_history',
        JSON.stringify(AppState.history)
      );
    } catch(e) {}
  });
},

  _renderHistory() {
    const list = document.getElementById('history-list');
    if (!AppState.history.length) {
      list.innerHTML = `<div class="empty-state" style="margin-top:60px"><div class="empty-icon">◫</div><p>No generations yet.</p></div>`;
      return;
    }
    list.innerHTML = AppState.history.map(h => `
      <div class="history-item" data-id="${h.id}">
        <div class="history-item__top">
          <span class="history-item__lang">${h.lang}</span>
          <span style="font-size:12px;color:var(--text-2)">${h.fns} functions · ${h.ms}ms</span>
          <span class="history-item__time">${h.time}</span>
        </div>
        <div class="history-item__preview">${h.preview.replace(/</g,'&lt;')}…</div>
      </div>
    `).join('');

    // Click to restore
    list.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const id   = parseInt(el.dataset.id);
        const item = AppState.history.find(h => h.id === id);
        if (!item) return;

        // Switch back to editor tab
        document.querySelector('.nav-btn[data-tab="editor"]')?.click();

        // Restore docs
        AppState.generatedDoc = item.docs;
        EventBus.emit('docs:ready', { docs: item.docs, analyzed: item.analyzed, ms: item.ms });
        showToast('History item restored', 'info');
      });
    });
  },

  // ── ERROR HANDLER ────────────────────────
  _initErrorHandler() {
    EventBus.on('error:occurred', (msg) => {
      showToast(msg, 'error', 5000);
      setAppStatus('Error', 'error');
      this._resetGenerateButton();
    });

    // Global JS errors
    window.addEventListener('unhandledrejection', (e) => {
      showToast('Unexpected error. Check console.', 'error');
      this._resetGenerateButton();
      console.error('Unhandled:', e.reason);
    });

    // When docs are ready — reset generate button
    EventBus.on('docs:ready', () => {
      this._resetGenerateButton();
      setAppStatus('Done ✓', 'done');
      showToast('Documentation generated!', 'success');
    });
  },

  _resetGenerateButton() {
    const btn = document.getElementById('generate-btn');
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 1.5L9.5 5.5L2 9.5V1.5Z" fill="currentColor"/></svg> Generate Docs`;
  },

  // ── SIDEBAR MODULE NAV ───────────────────
  _initModuleNav() {
    document.querySelectorAll('.module-item[data-module]').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.module-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
