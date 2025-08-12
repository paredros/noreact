// mount.js — core
// Estrategia dual A/B para montar fragmentos HTML sin parpadeo.
// Fase 0: sin animaciones ni scroll-lock.

const ROLES = { block: 'block' };

export function createDual({ mainA = '#main-a', mainB = '#main-b', container = '#main-content' } = {}) {
  const elA = document.querySelector(mainA);
  const elB = document.querySelector(mainB);
  const containerEl = document.querySelector(container);
  if (!elA || !elB || !containerEl) throw new Error('[noreact.mount] faltan #main-a/#main-b o #main-content');

  // Determinar quién arranca “live”
  let live = elA.querySelector(`[data-role="${ROLES.block}"]`) ? 'A'
           : elB.querySelector(`[data-role="${ROLES.block}"]`) ? 'B'
           : 'A';

  function getLiveEl()   { return live === 'A' ? elA : elB; }
  function getBufferEl() { return live === 'A' ? elB : elA; }

  function setInteractivity() {
    // solo el “visible/arriba” debe recibir interacción
    const top = getLiveEl();
    const back = getBufferEl();
    top.style.pointerEvents = 'auto';
    back.style.pointerEvents = 'none';
  }

  /*function updateContainerHeightFor(el) {
    // Altura en función del bloque visible (su scrollHeight)
    // Nota: si el bloque trae imágenes sin layout, quizá necesites re-medición tras load.
    const block = el.querySelector(`[data-role="${ROLES.block}"]`) || el;
    const h = Math.max(block.scrollHeight, window.innerHeight);
    containerEl.style.height = h + 'px';
  }*/
  function updateContainerHeightFor(el, extraBottom = 0) {
    const block = el.querySelector('[data-role="block"]') || el;
    const cs = getComputedStyle(block);
    const mTop = parseFloat(cs.marginTop) || 0;
    const mBot = parseFloat(cs.marginBottom) || 0;
    const contentH = block.scrollHeight + mTop + mBot + extraBottom;
    const minH = window.innerHeight;
    const h = Math.ceil(Math.max(contentH, minH));
    containerEl.style.height = h + 'px';
  }

  function mountInBuffer(html) {
    const buf = getBufferEl();
    buf.innerHTML = html;
  }
  function bringBufferToFront() {
    const oldLive = getLiveEl();
    const buf     = getBufferEl();
    oldLive.style.zIndex = '0';
    buf.style.zIndex     = '1';
    // ahora el buffer es el que se “ve”: ajustamos interactividad y altura
    buf.style.pointerEvents = 'auto';
    oldLive.style.pointerEvents = 'none';
    updateContainerHeightFor(buf);
  }

  /*function swap() {
    const oldLive = getLiveEl();
    const newLive = getBufferEl();
    oldLive.style.zIndex = '0';
    newLive.style.zIndex = '1';

    live = (live === 'A') ? 'B' : 'A';
  }*/
  function swap() {
    // Confirmamos que la identidad cambie (quién es “live”)
    live = (live === 'A') ? 'B' : 'A';
    setInteractivity();
    // Asegurar altura consistente tras el swap
    updateContainerHeightFor(getLiveEl());
  }

  /*function removeOldLive() {
    // el que ahora quedó como buffer se limpia
    const buf = getBufferEl();
    buf.innerHTML = '';
  }*/
  function removeOldLive() {
    // quien quedó como buffer ahora se limpia (y no recibe eventos)
    const buf = getBufferEl();
    buf.innerHTML = '';
    buf.style.pointerEvents = 'none';
  }

  function which() { return live; }
  // mount.js — agregar:
  // exportarlo:
  //return { getLiveEl, getBufferEl, mountInBuffer, swap, removeOldLive, which, bringBufferToFront };
  // setup inicial
  (function boot() {
    // z-index inicial: live arriba
    const top = getLiveEl();
    const back = getBufferEl();
    top.style.zIndex = '1';
    back.style.zIndex = '0';
    setInteractivity();
    updateContainerHeightFor(top);
  })();

  return {
    getLiveEl,
    getBufferEl,
    mountInBuffer,
    bringBufferToFront,
    swap,
    removeOldLive,
    which: () => live,
    updateContainerHeightFor, // por si necesitás recalcular manualmente
  };
}
