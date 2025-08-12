// blocks.js — plugin Fase 0
// Objetivo: navigateTo(key) → pedir HTML del bloque → core.mount.dual lo monta A/B.
// Sin animaciones, sin history. Dispara before/afterPageLoad para que loader procese scripts.

import { trigger } from '../events.js';
import { createDual } from '../mount.js';
import {ScrollGate} from "./ScrollGate.js";


const ROLES = { blockMeta: 'block-meta' };
const SENTINEL_OFFSET = 5;

let cfg = {
  selectors: { mainA: '#main-a', mainB: '#main-b' },
  debug: false,
  requestBlock: null, // (key) => Promise<string HTML>; si no, usa /blocks/<key>/
};

let mount;
let currentBlock = null;
let busy = false;

const gateTop    = new ScrollGate({ threshold: 140, minDelta: 1.5, decayPerSec: 0.6 });
const gateBottom = new ScrollGate({ threshold: 140, minDelta: 1.5, decayPerSec: 0.6 });
// listeners únicos (no bloquean scroll, solo miden deltas)
function onWheelGate(e) {
  // up: deltaY < 0 → top gate; down: deltaY > 0 → bottom gate
  if (e.deltaY < 0) gateTop.feedWheel(e.deltaY);
  else              gateBottom.feedWheel(e.deltaY);
}
let touchStartY = 0;
function onTouchStartGate(ev){ const t=ev.touches&&ev.touches[0]; if (!t) return; touchStartY = t.clientY; }
function onTouchMoveGate(ev){ const t=ev.touches&&ev.touches[0]; if (!t) return; const dy = t.clientY - touchStartY;
  // dy>0 “hacia abajo” → top gate; dy<0 “hacia arriba” → bottom gate
  if (dy > 0) gateTop.feedTouch(dy);
  else        gateBottom.feedTouch(dy);
}

function attachGateListeners(){
  window.addEventListener('wheel', onWheelGate, { passive: true });
  window.addEventListener('touchstart', onTouchStartGate, { passive: true });
  window.addEventListener('touchmove', onTouchMoveGate, { passive: true });
}
function detachGateListeners(){
  window.removeEventListener('wheel', onWheelGate);
  window.removeEventListener('touchstart', onTouchStartGate);
  window.removeEventListener('touchmove', onTouchMoveGate);
}

export function initBlocks(options = {}) {
  cfg = {
    ...cfg,
    ...options,
    selectors: { ...cfg.selectors, ...(options.selectors || {}) },
  };

  mount = createDual(cfg.selectors);

  // Tomar meta SSR si existe
  const initial = readMetaFromContainer(mount.getLiveEl());
  if (initial?.block) {
    currentBlock = initial.block;
    if (cfg.debug) console.log('[blocks] init SSR:', currentBlock);
    try {
      attachGateListeners();
      attachSentinelsForLive(initial);              // pone bottom IO + guard top
      mount.updateContainerHeightFor(mount.getLiveEl(), SENTINEL_OFFSET);
      const st = history.state || {};
      // no pisamos campos existentes (p.ej. scrollY del core)
      const newState = {
        ...st,
        type: 'block',
        block: currentBlock,
        // aseguramos scrollY presente (el core ya lo usa)
        scrollY: (typeof st.scrollY === 'number') ? st.scrollY : window.scrollY,
        __noreact: 'blocks' // marcador opcional p/depurar
      };
      history.replaceState(newState, '', location.href);
      window.addEventListener('keydown', onKeyDownNav, { passive: false });
      if (cfg.debug) console.log('[blocks] init → replaceState', newState);
    } catch (e) {
      if (cfg.debug) console.warn('[blocks] init replaceState failed', e);
    }
  }

  // Exponer API (para que el router pueda llamarnos)
  window.noreactBlocks = { navigateTo, getState };
}

export function getState() {
  return { block: currentBlock, live: mount.which() };
}

export async function navigateTo(key, { via = 'click' } = {}) {
  if (busy) { if (cfg.debug) console.log('[blocks] IGNORE (busy)'); return; }
  busy = true;
  gateTop.disable();
  gateBottom.disable();
  lockScroll();

  const url = `/blocks/${encodeURIComponent(key)}/`;
  try {
    trigger('beforePageLoad', { url });

    const html = cfg.requestBlock ? await cfg.requestBlock(key) : await defaultRequest(key);

    // Montar en buffer y validar meta
    mount.mountInBuffer(html);
    const meta = readMetaFromContainer(mount.getBufferEl());
    if (!meta?.block) throw new Error('[blocks] block-meta ausente/ inválida');

    const liveEl   = mount.getLiveEl();
    const bufferEl = mount.getBufferEl();

    const { outFn: outLive }  = getAnimHooks(liveEl);
    const { inFn:  inBuffer } = getAnimHooks(bufferEl);

    // Hacer visible el buffer sin cambiar quién es live todavía
    mount.bringBufferToFront();
    // body scroll al top del nuevo bloque visible
    // (si guardás/restaurás scroll en history para blocks, este 0 coincide con el pushState de scrollY:0)
    window.scrollTo(0, 0);

    // Podés arrancar el IN ya mismo; si querés retrasarlo, lo hacés *adentro* de tu in()
    try { if (typeof inBuffer === 'function') inBuffer(bufferEl, { via, keyFrom: currentBlock, keyTo: meta.block }); } catch(e){}

    // OUT del live y esperar su final si retorna tween/promise
    let outRet;
    try { if (typeof outLive === 'function') outRet = outLive(liveEl, { via, keyFrom: currentBlock, keyTo: meta.block }); } catch(e){}
    await toPromise(outRet);

    // Ahora sí: swap de identidad y limpieza del viejo
    mount.swap();

    // (opcional defensivo) matar tweens del viejo contenedor, por si quedó algo colgado
    const oldEl = mount.getBufferEl();
    try { if (window.gsap) gsap.killTweensOf(oldEl, { children: true }); } catch(_) {}

    detachSentinels();
    attachSentinelsForLive(meta);
    mount.removeOldLive();

    currentBlock = meta.block;
    if (meta.title) document.title = meta.title;

    if (cfg.debug) console.log('[blocks] done', getState());
    trigger('afterPageLoad', { url });
  } catch (e) {
    console.error('[blocks] navigateTo error:', e);
    // Fase 0: no tocamos historia ni cambiamos el live si falla
  } finally {
    unlockScroll();                       // ⬅️ liberar siempre
    busy = false;
  }
}
// blocks.js — añadidos Fase 3 (hooks in/out + delay fijo)
// blocks.js — helpers nuevos
function toPromise(ret) {
  // 1) Promise-like
  if (ret && typeof ret.then === 'function') return ret;
  // 2) GSAP tween/timeline
  if (ret && typeof ret.eventCallback === 'function') {
    return new Promise((resolve) => {
      // preservamos callbacks previos si los hubiera
      const prev = ret.eventCallback('onComplete');
      ret.eventCallback('onComplete', () => {
        try { prev && prev(); } catch (_) {}
        resolve();
      });
    });
  }
  // 3) Nada: seguir sin esperar
  return Promise.resolve();
}

const DELAY_BETWEEN = 300;

// Fallbacks globales opcionales (si querés, definilos en tu app)
// window.noreactBlocksDefaultIn  = (el, ctx) => {};
// window.noreactBlocksDefaultOut = (el, ctx) => {};

function getAnimHooks(containerEl) {
  if (!containerEl) return { inFn: null, outFn: null };

  // 1) ¿hay <script type="text/anim-js" data-role="block-anim">?
  const tag = containerEl.querySelector('script[type="text/anim-js"][data-role="block-anim"]');
  let inFn = null, outFn = null;

  if (tag) {
    const code = (tag.textContent || '').trim();

    // a) Si el script define un objeto literal / expresión que retorna { in, out }
    //    Ejemplo válido en el HTML:
    //      <script type="text/anim-js" data-role="block-anim">
    //        ({ in: (el)=>gsap.to(...), out: (el)=>gsap.to(...) })
    //      </script>
    if (code.startsWith('{') || code.startsWith('({') || code.startsWith('(')) {
      try {
        const obj = new Function('"use strict"; return (' + code + ');')();
        if (obj && typeof obj === 'object') {
          inFn  = typeof obj.in  === 'function' ? obj.in  : null;
          outFn = typeof obj.out === 'function' ? obj.out : null;
        }
      } catch (e) {
        console.warn('[blocks] anim eval (expr) falló:', e);
      }
    }

    // b) Si el script asigna a window.blockAnim = { in, out }
    if (!inFn && !outFn) {
      try {
        // Ejecutamos el código tal cual (no hace nada si solo es objeto)
        new Function('"use strict"; (function(){ ' + code + ' })();')();
        if (window.blockAnim && typeof window.blockAnim === 'object') {
          inFn  = typeof window.blockAnim.in  === 'function' ? window.blockAnim.in  : null;
          outFn = typeof window.blockAnim.out === 'function' ? window.blockAnim.out : null;
          // Limpieza para no “contaminar” global si el próximo bloque también usa window.blockAnim
          try { delete window.blockAnim; } catch(_) {}
        }
      } catch (e) {
        console.warn('[blocks] anim eval (window.blockAnim) falló:', e);
      }
    }
  }

  // c) Fallbacks globales
  if (!inFn  && typeof window.noreactBlocksDefaultIn  === 'function')  inFn  = window.noreactBlocksDefaultIn;
  if (!outFn && typeof window.noreactBlocksDefaultOut === 'function') outFn = window.noreactBlocksDefaultOut;

  return { inFn, outFn };
}

/* helpers */

function readMetaFromContainer(containerEl) {
  const tag = containerEl.querySelector(`script[type="application/json"][data-role="${ROLES.blockMeta}"]`);
  if (!tag) return null;
  try { return JSON.parse(tag.textContent || '{}'); }
  catch (e) { console.error('[blocks] meta parse error', e); return null; }
}

async function defaultRequest(key) {
  const res = await fetch(`/blocks/${encodeURIComponent(key)}/`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`[blocks] HTTP ${res.status} al pedir ${key}`);
  return await res.text();
}


let ioBottom;       // IntersectionObserver para el sentinela inferior
let detachTopGuard; // para remover listeners de “intención arriba”

function placeBottomSentinel(liveEl) {
  // Creamos (o reciclamos) un marcador al final del bloque visible
  let s = liveEl.querySelector('[data-role="block-sentinel-bottom"]');
  if (!s) {
    s = document.createElement('div');
    s.setAttribute('data-role', 'block-sentinel-bottom');
    s.style.position = 'absolute';
    s.style.left = '0';
    s.style.right = '0';
    s.style.height = '1px';
    // Lo ponemos justo DESPUÉS del contenido: bottom = -OFFSET (desde el contenedor absoluto)
    s.style.bottom = `-${SENTINEL_OFFSET}px`;
    liveEl.appendChild(s);
  }
  return s;
}

function ensureBottomObserver(sentinelEl, nextKey, navigateFn) {
  if (ioBottom) ioBottom.disconnect();
  ioBottom = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (!nextKey || busy) return;

      // en zona inferior → habilitar gate hacia abajo
      gateBottom.enable('down', () => {
        if (busy) return;
        navigateFn(nextKey);
      });
    }
  }, { root: null, rootMargin: '0px', threshold: 0.01 });
  ioBottom.observe(sentinelEl);
}

// “intención arriba”: si estás en top y hay un gesto hacia arriba, dispara prev
function attachTopIntentGuard(prevKey, navigateFn) {
  if (!prevKey) return () => {};
  let pulling = false;
  let touchStartY = 0;

  const onWheel = (ev) => {
    if (window.scrollY <= 0 && ev.deltaY < 0) {
      navigateFn(prevKey);
    }
  };

  const onTouchStart = (ev) => {
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    touching = true;
    touchStartY = t.clientY;
  };

  const onTouchMove = (ev) => {
    if (!touching) return;
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    const dy = t.clientY - touchStartY; // positivo = “tirar hacia abajo”
    if (window.scrollY <= 0 && dy > 24) {
      touching = false;
      navigateFn(prevKey);
    }
  };

  const onTouchEnd = () => { touching = false; };

  let touching = false;
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };
}
// fuera, al tope del módulo:
let onScrollSimpleRef = null;
function reevaluateTopGate(prevKey) {
  if (!prevKey || busy) { gateTop.disable(); return; }
  if (window.scrollY <= 0) {
    gateTop.enable('up', () => {
      if (busy) return;
      navigateTo(prevKey, { via: 'scroll' });
    });
  } else {
    gateTop.disable();
  }
}
let currentMeta = null;

function attachSentinelsForLive(meta) {
  currentMeta = meta;
  // liveEl es el que se ve arriba ahora
  const liveEl = mount.getLiveEl();
  const { prev, next } = meta || {};

  // Ajustar altura del contenedor con espacio extra abajo (para “>100%”)
  mount.updateContainerHeightFor(liveEl, SENTINEL_OFFSET);

  // Bottom sentinel (si hay next)
  const bottom = placeBottomSentinel(liveEl);
  ensureBottomObserver(bottom, next, (key) => {
    if (busy) return; // evita reentradas durante transición
    navigateTo(key, { via: 'scroll' });
  });

  // Top intent (si hay prev)
  if (detachTopGuard) detachTopGuard();
  detachTopGuard = attachTopIntentGuard(prev, (key) => {
    if (busy) return;
    navigateTo(key, { via: 'scroll' });
  });

  // ⬇⬇⬇ NUEVO: listener de scroll para encender/apagar el gate superior según estés en top
  if (onScrollSimpleRef) {
    window.removeEventListener('scroll', onScrollSimpleRef);
    onScrollSimpleRef = null;
  }
  onScrollSimpleRef = function onScrollSimple() {
    // reevaluá el gate del TOP solo con la prev del **bloque actual**
    reevaluateTopGate(prev);
  };
  window.addEventListener('scroll', onScrollSimpleRef, { passive: true });

  // Primera evaluación inmediata (por si ya estás en scrollY=0)
  reevaluateTopGate(prev);
}

function detachSentinels() {
  currentMeta = null;
  if (ioBottom) {
    ioBottom.disconnect();
    ioBottom = null;
  }
  if (detachTopGuard) {
    detachTopGuard();
    detachTopGuard = null;
  }
  // ⬇⬇⬇ NUEVO: quitar el listener de scroll del gate superior
  if (onScrollSimpleRef) {
    window.removeEventListener('scroll', onScrollSimpleRef);
    onScrollSimpleRef = null;
  }
  // y asegurarte de apagar los gates
  gateTop.disable();
  gateBottom.disable();
}

// blocks.js — helpers de scroll lock
let unlockFn = null;

function lockScroll() {
  if (unlockFn) return; // ya lockeado
  const keys = new Set(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ']);

  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); return false; };

  const onWheel = (e) => prevent(e);
  const onTouchMove = (e) => prevent(e);
  const onKeyDown = (e) => { if (keys.has(e.key)) prevent(e); };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('keydown', onKeyDown, { passive: false });

  // matar inercia actual y rebotitos
  const prevOverflow = document.body.style.overflow;
  const prevOSB = document.body.style.overscrollBehavior;
  document.body.style.overflow = 'hidden';
  document.body.style.overscrollBehavior = 'contain';
  // “clavar” la posición para cortar inercia
  window.scrollTo(window.scrollX, window.scrollY);

  // pausar smooth-scroll si existe
  const hadLenis = !!window.lenis;
  if (hadLenis && typeof window.lenis.stop === 'function') window.lenis.stop();

  unlockFn = () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown', onKeyDown);
    document.body.style.overflow = prevOverflow;
    document.body.style.overscrollBehavior = prevOSB;
    if (hadLenis && typeof window.lenis.start === 'function') window.lenis.start();
    unlockFn = null;
  };
}

function unlockScroll() {
  if (unlockFn) unlockFn();
}
// === KEY NAV ===
// mapear teclas a dirección
function keyDir(e) {
  if (e.key === 'ArrowDown' || e.key === 'PageDown') return 'down';
  if (e.key === 'ArrowUp'   || e.key === 'PageUp')   return 'up';
  if (e.key === ' ') return e.shiftKey ? 'up' : 'down';
  return null;
}

// evitar en inputs/textarea/contenteditable
function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return true;
  return false;
}

// encontrar el scroller “efectivo” desde el foco, limitado al bloque live
function getActiveScroller(liveEl) {
  let el = document.activeElement || document.body;
  // si está fuera del bloque live, usamos window/document
  if (!liveEl.contains(el)) return window;
  // subir hasta el live buscando overflow que scrollee
  while (el && el !== liveEl) {
    const cs = getComputedStyle(el);
    const canScrollY = /(auto|scroll)/.test(cs.overflowY);
    if (canScrollY && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  // fallback: window
  return window;
}

function isAtTop(scroller, epsilon = 1) {
  if (scroller === window) return window.scrollY <= epsilon;
  return scroller.scrollTop <= epsilon;
}
function isAtBottom(scroller, epsilon = 1) {
  if (scroller === window) {
    return (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - epsilon);
  }
  return (scroller.scrollTop + scroller.clientHeight) >= (scroller.scrollHeight - epsilon);
}

// handler único (se registra una vez en initBlocks)
let lastKeyAt = 0;
function onKeyDownNav(e) {
  const dir = keyDir(e);
  if (!dir) return;

  if (busy) return;                    // no reentrar en transición
  if (isEditable(document.activeElement)) return; // no interferir con inputs

  const liveEl = mount.getLiveEl();
  const scroller = getActiveScroller(liveEl);

  // si no estás en el borde, no hacemos nada: dejá que scrollée normal
  if (dir === 'down' && !isAtBottom(scroller)) return;
  if (dir === 'up'   && !isAtTop(scroller))    return;

  // estás en el borde correcto → disparar prev/next si hay
  const meta = currentMeta; // guardá esto cuando adjuntás sentinelas (prev/next vigente)
  const key  = dir === 'down' ? meta?.next : meta?.prev;
  if (!key) return;

  // debouncing simple para teclas sostenidas
  const now = performance.now();
  if (now - lastKeyAt < 200) return;
  lastKeyAt = now;

  e.preventDefault();
  e.stopPropagation();
  navigateTo(key, { via: 'key' });
}


export default { initBlocks, navigateTo, getState };
