/**
 * A minimal DOM, enough to boot the UI in Node.
 *
 * Not a browser and not trying to be. It exists so `npm test` catches the
 * errors that actually happen when wiring widgets — a selector that matches
 * nothing, a method called on null, a canvas context used before it exists —
 * without pulling in jsdom or a headless browser.
 */

class ClassList {
  constructor(el) { this.el = el; }
  add(...c) { this.el._classes.push(...c); }
  contains(c) { return this.el._classes.includes(c); }
}

let nodeSeq = 0;

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.attrs = {};
    this._classes = [];
    this._text = '';
    this._listeners = {};
    this._id = ++nodeSeq;
    this.classList = new ClassList(this);
  }
  get className() { return this._classes.join(' '); }
  set className(v) { this._classes = String(v).split(/\s+/).filter(Boolean); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._html || ''; }
  set innerHTML(html) { this._html = html; this.children = parseHTML(html, this); }
  append(...kids) { for (const k of kids) this.appendChild(k); }
  appendChild(k) { if (typeof k !== 'object') return; k.parentNode = this; this.children.push(k); return k; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, fn) { (this._listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  dispatch(type, ev = {}) { for (const fn of this._listeners[type] || []) fn({ type, target: this, preventDefault() {}, ...ev }); }
  matches() { return false; }
  querySelector(sel) { return descend(this).find((n) => matchSel(n, sel)) || null; }
  querySelectorAll(sel) { return descend(this).filter((n) => matchSel(n, sel)); }
  // canvas
  getBoundingClientRect() { return { width: 400, height: 140, top: 0, left: 0 }; }
  getContext() { return CTX; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function descend(root) {
  const out = [];
  const walk = (n) => { for (const c of n.children || []) { out.push(c); walk(c); } };
  walk(root);
  return out;
}

function matchSimple(n, s) {
  const parts = s.split('.').filter(Boolean);
  if (s.startsWith('.')) return parts.every((c) => n._classes.includes(c));
  const [tag, ...cls] = parts;
  if (tag && n.tagName !== tag.toUpperCase()) return false;
  return cls.every((c) => n._classes.includes(c));
}

/** Supports comma lists and descendant combinators — '.gauge-bar i'. */
function matchSel(n, sel) {
  return sel.split(',').map((s) => s.trim()).some((branch) => {
    const steps = branch.split(/\s+/).filter(Boolean);
    if (!matchSimple(n, steps[steps.length - 1])) return false;
    let cur = n.parentNode;
    for (let i = steps.length - 2; i >= 0; i--) {
      while (cur && !matchSimple(cur, steps[i])) cur = cur.parentNode;
      if (!cur) return false;
      cur = cur.parentNode;
    }
    return true;
  });
}

/** Naive but sufficient for the flat, well-formed fragments the widgets use. */
function parseHTML(html, parent) {
  const out = [];
  const stack = [{ el: { children: out } }];
  const re = /<(\/)?([a-zA-Z][\w-]*)([^>]*?)(\/)?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const [, closing, tag, attrs, selfClose, text] = m;
    if (text) continue;            // text nodes are not modelled
    if (closing) { if (stack.length > 1) stack.pop(); continue; }
    const el = new El(tag);
    for (const a of (attrs || '').matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) el.setAttribute(a[1], a[2]);
    el.parentNode = stack[stack.length - 1].el;
    stack[stack.length - 1].el.children.push(el);
    const VOID = ['input', 'br', 'img', 'hr', 'meta', 'link'];
    if (!selfClose && !VOID.includes(tag.toLowerCase())) stack.push({ el });
  }
  return out;
}

const CTX = new Proxy({}, {
  get: (_, prop) => {
    if (prop === 'canvas') return {};
    return () => {};
  },
  set: () => true,
});

export function installDOM(shellHtml) {
  const doc = new El('body');
  doc.children = parseHTML(shellHtml, doc);

  const document = {
    body: doc,
    readyState: 'complete',
    createElement: (t) => new El(t),
    querySelector: (s) => (matchSel(doc, s) ? doc : doc.querySelector(s) || byId(doc, s)),
    querySelectorAll: (s) => doc.querySelectorAll(s),
    addEventListener() {},
  };
  function byId(root, sel) {
    if (!sel.startsWith('#')) return null;
    const id = sel.slice(1);
    return descend(root).find((n) => n.attrs.id === id) || null;
  }
  document.querySelector = (s) => (s.startsWith('#') ? byId(doc, s) : doc.querySelector(s));

  const listeners = {};
  const win = {
    devicePixelRatio: 1,
    addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); },
    dispatch: (t, ev) => { for (const fn of listeners[t] || []) fn({ type: t, target: { matches: () => false }, preventDefault() {}, ...ev }); },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
  };

  globalThis.document = document;
  globalThis.window = win;
  globalThis.requestAnimationFrame = win.requestAnimationFrame;
  globalThis.cancelAnimationFrame = win.cancelAnimationFrame;
  globalThis.performance = globalThis.performance || { now: () => 0 };
  globalThis.Option = function Option(text, value) {
    const o = new El('option'); o.textContent = text; o.value = value; return o;
  };
  return { document, window: win, root: doc };
}
