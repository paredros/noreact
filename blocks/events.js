export function emit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}