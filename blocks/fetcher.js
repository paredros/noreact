import { ROLES } from './constants.js';

/**
 * fetchBlock:
 *  - Retorna { html, meta } donde:
 *      html: string HTML completo del bloque
 *      meta: { block, prev, next, title? }
 *
 * Estrategia:
 *  - Por defecto usa fetch GET a `/blocks/<key>/` (ajustá a tu view).
 *  - Podés inyectar un request custom en init(options.requestBlock).
 */
export async function fetchBlock(key, requestBlock) {
  const html = requestBlock
    ? await requestBlock(key)
    : await defaultRequest(key);

  // Parse meta para devolver meta.block al state (sin tocar DOM todavía)
  const meta = extractMetaFromHtml(html);

  if (!meta || !meta.block) {
    // No rompas DOM; dejá que index.js maneje el error si precisa
    console.warn('[blocks] meta ausente o inválida en respuesta', { key });
  }

  return { html, meta };
}

async function defaultRequest(key) {
  const res = await fetch(`/blocks/${encodeURIComponent(key)}/`, {
    method: 'GET',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(`[blocks] HTTP ${res.status} al pedir ${key}`);
  }
  return await res.text();
}

function extractMetaFromHtml(html) {
  // Creamos un DOM auxiliar para leer el <script data-role="block-meta">
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const metaTag = tpl.content.querySelector(`script[type="application/json"][data-role="${ROLES.blockMeta}"]`);
  if (!metaTag) return null;
  try {
    return JSON.parse(metaTag.textContent || '{}');
  } catch (e) {
    console.error('[blocks] Error parseando block-meta', e);
    return null;
  }
}