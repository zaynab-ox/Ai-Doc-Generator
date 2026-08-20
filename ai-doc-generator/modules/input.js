// modules/input.js — Module 1: Code Input

const InputModule = {

  init() {
    this.editor   = document.getElementById('code-input');
    this.lineNums = document.getElementById('line-numbers');
    this.metaEl   = document.getElementById('input-meta');
    this.langEl   = document.getElementById('lang-badge');

    this._bindEditorEvents();
    this._bindButtons();
    this._bindGenerateButton();
  },

  _bindEditorEvents() {
    // Live line numbers + meta update
    this.editor.addEventListener('input', () => {
      this._updateLineNumbers();
      this._updateMeta();
      this._liveStats();
    });

    // Sync scroll
    this.editor.addEventListener('scroll', () => {
      this.lineNums.scrollTop = this.editor.scrollTop;
    });

    // Tab key support
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end   = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + '  ' + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
        this._updateLineNumbers();
      }
    });
  },

  _bindButtons() {
    // Clear button
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.editor.value = '';
      this.lineNums.textContent = '1';
      this.metaEl.textContent = 'Paste your code';
      this.langEl.textContent = '—';
      updateStats();
      resetPipeline();
    });

    // Upload file button
    const uploadBtn  = document.getElementById('upload-btn');
    const fileInput  = document.getElementById('file-upload');

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 1MB file size guard
      if (file.size > 1_000_000) {
        showToast('File too large. Max 1MB.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        this.editor.value = ev.target.result;
        this._updateLineNumbers();
        this._updateMeta(file.name);
        this._liveStats();
        showToast(`Loaded: ${file.name}`, 'success');
      };
      reader.onerror = () => showToast('Failed to read file.', 'error');
      reader.readAsText(file);

      // Reset so same file can be re-uploaded
      fileInput.value = '';
    });
  },

  _bindGenerateButton() {
    document.getElementById('generate-btn').addEventListener('click', () => {
      const code = this.editor.value.trim();

      if (!code) {
        showToast('Please paste some code first!', 'error');
        this.editor.focus();
        return;
      }

      if (code.length < 10) {
        showToast('Code seems too short. Try more code.', 'error');
        return;
      }

      // Save to state
      AppState.rawCode = code;

      // Update UI
      setModuleStatus('input', 'done');
      setAppStatus('Running pipeline…', 'running');

      const btn = document.getElementById('generate-btn');
      btn.disabled = true;
      btn.classList.add('loading');
      btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" style="animation:spin 1s linear infinite"><path d="M5.5 1A4.5 4.5 0 1110 5.5" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg> Generating…`;

      // Fire the pipeline
      EventBus.emit('code:ready', code);
    });
  },

  _updateLineNumbers() {
    const count = this.editor.value.split('\n').length;
    this.lineNums.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
  },

  _updateMeta(filename = '') {
    const code  = this.editor.value;
    const lines = code.split('\n').length;
    const chars = code.length;
    this.metaEl.textContent = filename
      ? `${filename} · ${lines} lines`
      : `${lines} lines · ${chars} chars`;

    // Detect language
    const lang = this._detectLang(code);
    this.langEl.textContent = lang;
  },

  _liveStats() {
    const lines = this.editor.value.split('\n').length;
    updateStats({ lines });
  },

  _detectLang(code) {
    if (/def |import |from .+ import|print\(/.test(code))    return 'Python';
    if (/function |=>|const |let |require\(/.test(code))      return 'JS';
    if (/interface |type |: string|: number/.test(code))      return 'TS';
    if (/public class|void main|System\.out/.test(code))      return 'Java';
    if (/func |package main|:= /.test(code))                  return 'Go';
    if (/#include|int main\(|std::/.test(code))               return 'C++';
    if (/<\?php|echo |function .+\(\)/.test(code))            return 'PHP';
    return 'Code';
  }
};

// Add spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }';
document.head.appendChild(spinStyle);

InputModule.init();
