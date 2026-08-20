// modules/parser.js — Module 2: Code Parser
// Listens: 'code:ready' → Emits: 'parsed:done'

const ParserModule = {

  init() {
    EventBus.on('code:ready', (code) => this._run(code));
  },

  _run(code) {
    setModuleStatus('parser', 'running');

    // Small delay for UI to reflect "running"
    setTimeout(() => {
      try {
        const result = this.parse(code);
        AppState.parsedData = result;
        setModuleStatus('parser', 'done');
        EventBus.emit('parsed:done', result);
      } catch (err) {
        setModuleStatus('parser', 'error');
        EventBus.emit('error:occurred', 'Parser failed: ' + err.message);
      }
    }, 80);
  },

  parse(code) {
    const lines    = code.split('\n');
    const language = this._detectLanguage(code);

    const result = {
      language,
      totalLines:    lines.length,
      functions:     [],
      classes:       [],
      imports:       [],
      variables:     [],
      comments:      [],
      exports:       [],
      rawCode:       code
    };

    lines.forEach((line, idx) => {
      const t   = line.trim();
      const num = idx + 1;
      if (!t) return;

      this._parseFunction(t, num, result);
      this._parseClass(t, num, result);
      this._parseImport(t, num, result, language);
      this._parseVariable(t, num, result);
      this._parseComment(t, num, result);
      this._parseExport(t, num, result);
    });

    // Deduplicate
    result.functions = this._dedup(result.functions, 'name');
    result.classes   = this._dedup(result.classes,   'name');
    result.imports   = this._dedup(result.imports,    'raw');

    return result;
  },

  _parseFunction(t, num, result) {
    const patterns = [
      // JS/TS: function foo()
      { re: /^(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/, group: 2, params: 3 },
      // JS/TS: const foo = () =>
      { re: /^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/, group: 3, params: 5 },
      // JS/TS: const foo = async function
      { re: /^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?function/, group: 3, params: -1 },
      // Python: def foo(...)
      { re: /^def\s+(\w+)\s*\(([^)]*)\)/, group: 1, params: 2 },
      // Java/C#: public/private void/type foo(
      { re: /^(public|private|protected|static)[\w\s<>[\]]+\s+(\w+)\s*\(([^)]*)\)\s*\{?$/, group: 2, params: 3 },
    ];

    for (const p of patterns) {
      const m = t.match(p.re);
      if (m && m[p.group]) {
        const name = m[p.group];
        if (['if','for','while','switch','catch'].includes(name)) break;
        const rawParams = p.params > 0 ? (m[p.params] || '') : '';
        const params = rawParams.split(',').map(s => s.trim()).filter(Boolean);
        result.functions.push({ name, params, line: num, raw: t });
        break;
      }
    }
  },

  _parseClass(t, num, result) {
    const m = t.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)(\s+extends\s+(\w+))?(\s+implements\s+([\w,\s]+))?/)
           || t.match(/^class\s+(\w+)/);
    if (m) {
      const name   = m[3] || m[1];
      const parent = m[5] || null;
      result.classes.push({ name, parent, line: num, raw: t });
    }
  },

  _parseImport(t, num, result, lang) {
    const isJS  = /^import\s+/.test(t) || /^(const|let|var)\s+\w+\s*=\s*require\(/.test(t);
    const isPY  = /^import\s+\w+/.test(t) || /^from\s+\w+\s+import\s+/.test(t);
    const isJAVA = /^import\s+[\w.]+;$/.test(t);
    if (isJS || isPY || isJAVA) {
      if (!result.imports.find(i => i.raw === t))
        result.imports.push({ raw: t, line: num });
    }
  },

  _parseVariable(t, num, result) {
    const m = t.match(/^(const|let|var)\s+(\w+)\s*=/);
    if (m) {
      const isFn = result.functions.find(f => f.line === num);
      if (!isFn) result.variables.push({ name: m[2], kind: m[1], line: num });
    }
  },

  _parseComment(t, num, result) {
    if (t.startsWith('//') || t.startsWith('#') || t.startsWith('*') ||
        t.startsWith('/*') || t.startsWith('"""') || t.startsWith("'''")) {
      result.comments.push({ raw: t, line: num });
    }
  },

  _parseExport(t, num, result) {
    if (/^export\s+(default\s+)?/.test(t)) {
      result.exports.push({ raw: t, line: num });
    }
    if (/^module\.exports\s*=/.test(t)) {
      result.exports.push({ raw: t, line: num });
    }
  },

  _detectLanguage(code) {
    const scores = {
      Python:     (/def |import |from .+ import|print\(|:\s*$/.test(code) ? 2 : 0),
      JavaScript: (/function |=>|const |let |require\(|console\.log/.test(code) ? 2 : 0),
      TypeScript: (/interface |type |: string|: number|<T>/.test(code) ? 3 : 0),
      Java:       (/public class|void main|System\.out|@Override/.test(code) ? 3 : 0),
      Go:         (/func |package |:= |fmt\./.test(code) ? 3 : 0),
      'C/C++':    (/#include|int main\(|std::/.test(code) ? 3 : 0),
      PHP:        (/<\?php|echo |->/.test(code) ? 3 : 0),
    };
    return Object.entries(scores).sort((a,b) => b[1]-a[1])[0][0];
  },

  _dedup(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
      const v = item[key];
      if (seen.has(v)) return false;
      seen.add(v); return true;
    });
  }
};

ParserModule.init();
