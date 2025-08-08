import { DEFAULTS, ATTRS, ROLES } from './constants.js';
import { createContentSwitcher } from './content-switcher.js';
import * as state from './state.js';
import { fetchBlock } from './fetcher.js';

let cfg = { ...DEFAULTS };
let switcher = null;
let isNavigating = false;

/**
 * init(options)
 *  - options.selectors.mainA / mainB
 *  - options.debug (bool)
 *  - options.requestBlock(key) -> Promise<string HTML>  (opcional)
 */
export function init(options = {}) {
  cfg = {
    ...DEFAULTS,
    ...options,
    selectors: { ...DEFAULTS.selectors, ...(options.selectors || {}) },
  };

  switcher = createContentSwitcher(cfg);

  // Si ya hay un bloque inicial renderizado por server, tomar su meta para state.block
  const live = switcher.getLiveEl();
  const initialMeta = readMetaFromContainer(live);
  if (initialMeta?.block) {
    state.setBlock(initialMeta.block);
    if (cfg.debug) console.log('[blocks] init - initial block:', initialMeta.block);
  }

  // Interceptar clicks internos en data-block-target (delegado en document)
  document.addEventListener('click', onDocumentClick, true);
}

export function getState() {
  return state.get();
}

export async function navigateTo(key, { via = 'click' } = {}) {
  if (isNavigating) {
    if (cfg.debug) console.debug('[blocks] navigateTo IGNORE (already navigating)', key);
    return;
  }
  isNavigating = true;
  if (cfg.debug) console.debug('[blocks] navigateTo start', { key, via });

  try {
    const { html, meta } = await fetchBlock(key, cfg.requestBlock);

    // Montar en buffer
    switcher.mountInBuffer(html);

    // Actualizar estado con la meta que vino
    const finalMeta = meta || readMetaFromContainer(switcher.getBufferEl());
    if (!finalMeta?.block) {
      throw new Error('[blocks] meta.block ausente en respuesta');
    }

    // Swap A/B
    switcher.swap();

    // El buffer (antiguo live) se limpia
    switcher.removeOldLive();

    // Guardar key actual
    state.setBlock(finalMeta.block);

    if (cfg.debug) console.debug('[blocks] navigateTo done', { live: state.get().live, block: finalMeta.block });
  } catch (err) {
    console.error('[blocks] navigateTo error', err);
    // Fase 0: no overlay, solo no tocar nada si falla
  } finally {
    isNavigating = false;
  }
}

/* -------------------- helpers -------------------- */

function onDocumentClick(e) {
  // Buscar ascendente con data-block-target
  const targetEl = e.target.closest(`[${ATTRS.blockTarget}]`);
  if (!targetEl) return;

  // Evitar navegación real
  e.preventDefault();
  e.stopPropagation();

  const key = targetEl.getAttribute(ATTRS.blockTarget);
  if (!key) return;

  navigateTo(key, { via: 'click' });
}

function readMetaFromContainer(containerEl) {
  const metaTag = containerEl.querySelector(`script[type="application/json"][data-role="${ROLES.blockMeta}"]`);
  if (!metaTag) return null;
  try {
    return JSON.parse(metaTag.textContent || '{}');
  } catch (e) {
    console.error('[blocks] Error parseando meta inicial', e);
    return null;
  }
}

/* API pública por defecto */
export default {
  init,
  navigateTo,
  getState,
};