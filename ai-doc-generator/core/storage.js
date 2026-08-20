
const StorageModule = {

  KEYS: {
    history:  'docai_history',
    settings: 'docai_settings',
    lastDoc:  'docai_lastDoc'
  },

  
  init() {
    this._loadHistory();
    this._loadLastDoc();
    this._bindEvents();
    console.log('StorageModule: LocalStorage ready');
  },

  // ── EVENTS BIND ────────────────────────────
  _bindEvents() {

    // Jab docs ready hon → save karo
    EventBus.on('docs:ready', ({ docs, analyzed, ms }) => {
      this._saveToHistory({ docs, analyzed, ms });
      this._saveLastDoc(docs);
      showToast('Saved to local storage ✓', 'success');
    });

  },

  // ══════════════════════════════════════════
  //  HISTORY — Save & Load
  // ══════════════════════════════════════════

  _saveToHistory({ docs, analyzed, ms }) {
    try {
      // Naya entry banao
      const entry = {
        id:        Date.now(),
        docs:      docs,
        language:  analyzed.language,
        functions: analyzed.functions.length,
        classes:   analyzed.classes.length,
        lines:     analyzed.totalLines,
        ms:        ms,
        preview:   docs.slice(0, 120),
        savedAt:   new Date().toLocaleString()
      };

      // Purani history lo
      const existing = this._getHistory();

      // Naya entry upar add karo
      existing.unshift(entry);

      // Sirf last 10 rakho
      const trimmed = existing.slice(0, 10);

      // LocalStorage mein save karo
      localStorage.setItem(
        this.KEYS.history,
        JSON.stringify(trimmed)
      );

      // Count update karo
      this._updateHistoryCount(trimmed.length);

      console.log(`StorageModule: Saved entry #${entry.id}`);

    } catch (err) {
      console.error('StorageModule: Save failed', err);
      showToast('Storage save failed', 'error');
    }
  },

  _loadHistory() {
    try {
      const history = this._getHistory();

      if (history.length === 0) {
        console.log('StorageModule: No history found');
        return;
      }

      // AppState mein daal do
      AppState.history = history;

      // Count update karo
      this._updateHistoryCount(history.length);

      showToast(
        `${history.length} saved session(s) loaded`, 
        'info'
      );

      console.log(`StorageModule: Loaded ${history.length} entries`);

    } catch (err) {
      console.error('StorageModule: Load failed', err);
    }
  },

  // ══════════════════════════════════════════
  //  LAST DOC — Last generated doc save karo
  // ══════════════════════════════════════════

  _saveLastDoc(docs) {
    try {
      localStorage.setItem(this.KEYS.lastDoc, docs);
    } catch (err) {
      console.error('StorageModule: LastDoc save failed', err);
    }
  },

  _loadLastDoc() {
    try {
      const lastDoc = localStorage.getItem(this.KEYS.lastDoc);

      if (!lastDoc) return;

      // AppState mein restore karo
      AppState.generatedDoc = lastDoc;

      console.log('StorageModule: Last doc restored');

    } catch (err) {
      console.error('StorageModule: LastDoc load failed', err);
    }
  },

  // ══════════════════════════════════════════
  //  CLEAR — Sab kuch delete karo
  // ══════════════════════════════════════════

  clearHistory() {
    try {
      localStorage.removeItem(this.KEYS.history);
      localStorage.removeItem(this.KEYS.lastDoc);

      // AppState bhi reset
      AppState.history    = [];
      AppState.generatedDoc = '';

      // Count zero karo
      this._updateHistoryCount(0);

      showToast('Storage cleared', 'success');
      console.log('StorageModule: Cleared');

    } catch (err) {
      console.error('StorageModule: Clear failed', err);
    }
  },

  // ══════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════

  // LocalStorage se history array lo
  _getHistory() {
    try {
      const raw = localStorage.getItem(this.KEYS.history);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // History count badge update
  _updateHistoryCount(count) {
    const el = document.getElementById('history-count');
    if (el) el.textContent = count;
  },

  // Storage kitna use ho raha hai — KB mein
  getStorageSize() {
    let total = 0;
    Object.values(this.KEYS).forEach(key => {
      const val = localStorage.getItem(key);
      if (val) total += val.length;
    });
    return (total / 1024).toFixed(2) + ' KB';
  }

};

// Auto init
document.addEventListener('DOMContentLoaded', () => {
  StorageModule.init();
});