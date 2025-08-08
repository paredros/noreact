import { DEFAULTS, ROLES } from './constants.js';
import * as state from './state.js';

export function createContentSwitcher(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const mainA = document.querySelector(cfg.selectors.mainA);
  const mainB = document.querySelector(cfg.selectors.mainB);

  if (!mainA || !mainB) {
    throw new Error('[blocks] No encontré #main-a / #main-b');
  }

  // Determinar live inicial: si alguno ya tiene un bloque en server-render.
  let live = mainA.querySelector(`[data-role="${ROLES.block}"]`) ? 'A' :
             mainB.querySelector(`[data-role="${ROLES.block}"]`) ? 'B' : 'A';
  state.setLive(live);

  function getLiveEl()   { return (state.get().live === 'A') ? mainA : mainB; }
  function getBufferEl() { return (state.get().live === 'A') ? mainB : mainA; }

  function mountInBuffer(html) {
    const buf = getBufferEl();
    buf.innerHTML = html;
  }

  function swap() {
    // Elevar el buffer a live, bajar el anterior y limpiar referencias
    const prevLive = getLiveEl();
    const nextLive = getBufferEl();

    // Z-index simple: el nuevo al tope
    prevLive.style.zIndex = '0';
    nextLive.style.zIndex = '1';

    // Cambiar bandera
    state.setLive(state.get().live === 'A' ? 'B' : 'A');
  }

  function removeOldLive() {
    // Luego de swap, el buffer pasó a live; el que fue live es ahora buffer.
    // Limpiamos el buffer para evitar leaks.
    const buf = getBufferEl();
    buf.innerHTML = '';
  }

  return {
    getLiveEl,
    getBufferEl,
    mountInBuffer,
    swap,
    removeOldLive,
  };
}