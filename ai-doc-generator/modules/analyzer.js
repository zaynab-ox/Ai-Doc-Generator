// modules/analyzer.js — Module 3: Code Analyzer
// Listens: 'parsed:done' → Emits: 'analyzed:done'

const AnalyzerModule = {

  init() {
    EventBus.on('parsed:done', (parsed) => this._run(parsed));
  },

  _run(parsed) {
    setModuleStatus('analyzer', 'running');

    setTimeout(() => {
      try {
        const result = this.analyze(parsed);
        AppState.analyzedData = result;

        this._renderUI(result, parsed);
        this._updateStats(result);

        setModuleStatus('analyzer', 'done');
        document.getElementById('analyzer-meta').textContent = `${result.totalSymbols} symbols found`;
        EventBus.emit('analyzed:done', result);
      } catch (err) {
        setModuleStatus('analyzer', 'error');
        EventBus.emit('error:occurred', 'Analyzer failed: ' + err.message);
      }
    }, 100);
  },

  analyze(parsed) {
    const hasDocstring = (fn) =>
      parsed.comments.some(c => Math.abs(c.line - fn.line) <= 2);

    const documented   = parsed.functions.filter(hasDocstring);
    const undocumented = parsed.functions.filter(f => !hasDocstring(f));

    const complexity = this._calcComplexity(parsed);
    const coverage   = parsed.functions.length > 0
      ? Math.round((documented.length / parsed.functions.length) * 100)
      : 0;

    return {
      language:       parsed.language,
      totalLines:     parsed.totalLines,
      totalSymbols:   parsed.functions.length + parsed.classes.length + parsed.variables.length,
      functions:      parsed.functions,
      classes:        parsed.classes,
      imports:        parsed.imports,
      variables:      parsed.variables,
      comments:       parsed.comments,
      exports:        parsed.exports,
      documented,
      undocumented,
      coverage,
      complexity,
      avgFnLength:    this._avgFnLength(parsed),
      hasAsyncCode:   /async|await|Promise/.test(parsed.rawCode),
      hasErrorHandling: /try|catch|finally|throw/.test(parsed.rawCode),
    };
  },

  _renderUI(result, parsed) {
    const body = document.getElementById('analyzer-body');

    // ── Tag cloud ──
    const tagHTML = [
      ...result.functions.slice(0, 5).map(f =>
        `<span class="tag tag-fn">fn: ${f.name}</span>`),
      ...result.classes.slice(0, 3).map(c =>
        `<span class="tag tag-cls">class: ${c.name}</span>`),
      ...result.imports.slice(0, 3).map(i => {
        const name = i.raw.replace(/^(import|from|const|let|var)\s+/, '').split(/[\s{(]/)[0];
        return `<span class="tag tag-imp">↓ ${name}</span>`;
      }),
      ...result.variables.slice(0, 3).map(v =>
        `<span class="tag tag-var">${v.kind}: ${v.name}</span>`),
    ].join('');

    // ── Stats rows ──
    const rows = [
      ['Language',       result.language],
      ['Total lines',    result.totalLines],
      ['Functions',      result.functions.length],
      ['Classes',        result.classes.length],
      ['Imports',        result.imports.length],
      ['Variables',      result.variables.length],
      ['Doc coverage',   `${result.coverage}%`],
      ['Complexity',     result.complexity],
      ['Async code',     result.hasAsyncCode ? '✓ Yes' : '— No'],
      ['Error handling', result.hasErrorHandling ? '✓ Yes' : '— No'],
    ].map(([label, val]) =>
      `<div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-val">${val}</span>
      </div>`
    ).join('');

    body.innerHTML = `
      <div class="tag-cloud">${tagHTML || '<span class="tag tag-var">No symbols found</span>'}</div>
      ${rows}
    `;
  },

  _updateStats(result) {
    updateStats({
      lines: result.totalLines,
      fns:   result.functions.length,
      cls:   result.classes.length,
    });
  },

  _calcComplexity(parsed) {
    const code = parsed.rawCode;
    let score = 1;
    const add = (pattern) => { score += (code.match(new RegExp(pattern, 'g')) || []).length; };
    add('\\bif\\b'); add('\\belse\\b'); add('\\bfor\\b');
    add('\\bwhile\\b'); add('\\bswitch\\b'); add('\\bcatch\\b');
    add('\\?\\?'); add('&&'); add('\\|\\|');
    if (score <= 5)  return 'Low';
    if (score <= 15) return 'Medium';
    if (score <= 30) return 'High';
    return 'Very High';
  },

  _avgFnLength(parsed) {
    if (!parsed.functions.length) return 0;
    return Math.round(parsed.totalLines / parsed.functions.length);
  }
};

AnalyzerModule.init();
