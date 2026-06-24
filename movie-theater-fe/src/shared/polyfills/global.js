// sockjs-client expects Node's `global`; browsers only have globalThis/window.
if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}
