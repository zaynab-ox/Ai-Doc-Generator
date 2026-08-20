// modules/preview.js — Module 5: Documentation Preview
// Listens: 'docs:ready'

const PreviewModule = {

  init() {
    EventBus.on('docs:ready', ({ docs, analyzed, ms }) => this._run(docs, analyzed, ms));
  },

  _run(docs, analyzed, ms) {
    setModuleStatus('preview', 'running');

    setTimeout(() => {
      try {
        this._render(docs, analyzed, ms);
        setModuleStatus('preview', 'done');
        document.getElementById('preview-meta').textContent =
          `${analyzed.language} · ${analyzed.functions.length} functions documented · ${ms}ms`;
      } catch (err) {
        setModuleStatus('preview', 'error');
        console.error('Preview error:', err);
      }
    }, 50);
  },

  _render(docs, analyzed, ms) {
    const body = document.getElementById('preview-body');
    const html = this._markdownToHTML(docs);
    body.innerHTML = html;

    // Scroll preview into view
    document.getElementById('preview-bar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _markdownToHTML(md) {
    return md
      // H1
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // H2
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      // H3
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      // Code blocks
      .replace(/```[\w]*\n([\s\S]*?)```/gm, '<pre>$1</pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // HR
      .replace(/^---$/gm, '<hr>')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p>')
      // Wrap in p tags
      .replace(/^(?!<[h|p|pre|hr|ul|li])(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return `<p>${match}</p>`;
      })
      // Clean up empty p tags
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '');
  }
};

PreviewModule.init();
