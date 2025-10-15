import { runTransitionOut, runTransitionIn } from './transition.js';
import { trigger } from './events.js';
import { expandVideoAndNavigate } from './video-transition.js';
import {expandImageAndNavigate} from "./image-transition.js";

let container;
const containerSelector = '#main-content';

export function initRouter() {
  container = document.querySelector(containerSelector);

  function setupDelegatedNavigation() {
    document.body.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Sólo formularios dentro del container principal
      if (!container || !container.contains(form)) return;

      // Opt-out coherente con tus links
      if (form.hasAttribute('data-no-ajax')) return;

      // Interceptar
      e.preventDefault();

      const method = (form.getAttribute('method') || 'GET').toUpperCase();
      let url = form.getAttribute('action') || location.href;

      // Preparar fetch con los mismos headers que usás en loadPage()
      const headers = { 'X-Requested-With': 'XMLHttpRequest' };
      let body = null;

      if (method === 'GET') {
        const qs = new URLSearchParams(new FormData(form)).toString();
        url += (url.includes('?') ? '&' : '?') + qs;
      } else {
        body = new FormData(form); // incluye csrfmiddlewaretoken
      }

      // --- mismo flujo que loadPage(url) ---
      trigger('beforePageLoad', { url });

      const oldContainer = container;
      await runTransitionOut(oldContainer);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      const response = await fetch(url, { method, headers, body });
      const html = await response.text();
      const newDoc = new DOMParser().parseFromString(html, 'text/html');
      if (response.headers.get("X-Cart-Changed") === "1") {
        dispatchEvent(new CustomEvent("cart:changed"));
      }

      const newContent = newDoc.querySelector('#main-content');
      if (!newContent) {
        // fallback: si la respuesta no trae #main-content, no tocamos el DOM
        trigger('afterPageLoad', { url });
        return;
      }

      oldContainer.replaceWith(newContent);
      container = newContent;

      void container.offsetHeight;
      await runTransitionIn(container);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      trigger('afterPageLoad', { url });
    });
    document.body.addEventListener('click', (e) => {
      // manejo de links AJAX
      /*
      *
      * const link = e.target.closest('a[data-ajax-link]');
      if (link && link.href && !link.hasAttribute('data-no-ajax')) {
        e.preventDefault();
        const url = link.href;
        //if (url === window.location.href) return;
        history.pushState(null, '', url);
        loadPage(url);
        return;
      }
      * */

      // 🧩 Blocks (Fase 0): navegación interna por bloques
      const blockBtn = e.target.closest('[data-block-target]');
      if (blockBtn && window.noreactBlocks && typeof window.noreactBlocks.navigateTo === 'function') {
        e.preventDefault();

        const key = blockBtn.getAttribute('data-block-target');
        if (!key) return;

        // Guardar el scroll actual en el estado presente (igual que hacés con data-ajax-link)
        const currentState = history.state || {};
        currentState.scrollY = window.scrollY;
        history.replaceState(currentState, '');

        // Empujar un nuevo estado de tipo "block" SIN cambiar la URL visible
        history.pushState({ type: 'block', block: key, via: 'click', scrollY: 0 }, '', location.href);

        // Disparar el swap A/B del plugin (esto ya lanza before/afterPageLoad)
        window.noreactBlocks.navigateTo(key, { via: 'click' });
        return;
      }

      const linkEl = e.target.closest('[data-ajax-link]');
      if (linkEl && !linkEl.hasAttribute('data-no-ajax')) {
        //console.log("DATA-NO-AJAX");
        e.preventDefault();

        const url = linkEl.tagName === 'A'
          ? linkEl.getAttribute('href')
          : linkEl.getAttribute('data-target');

        if (!url) return;

        // ⬇️ Guardar el scroll actual en el estado del historial actual
        const currentState = history.state || {};
        currentState.scrollY = window.scrollY;
        history.replaceState(currentState, '');

        history.pushState({ scrollY: 0 }, '', url);
        loadPage(url);
        return;
      }




      // transición de video
      /*const videoWrapper = e.target.closest('.to-video-transition');
      if (videoWrapper) {
        const video = videoWrapper.querySelector('video');
        const target = videoWrapper.getAttribute('data-target');
        if (video && target) {
          e.preventDefault();
          //if (target === window.location.href) return;
          import('./video-transition.js').then(mod => {
            mod.expandVideoAndNavigate(video, target);
          });
          return;
        }
      }*/
      const videoWrapper = e.target.closest('.to-video-transition');
      if (videoWrapper) {
        const target = videoWrapper.getAttribute('data-target');
        if (!target) return;

        let video = videoWrapper.querySelector('video');

        const selector = videoWrapper.getAttribute('data-video-selector');
        if (selector) {
          const externalVideo = document.querySelector(selector);
          if (externalVideo instanceof HTMLVideoElement) {
            video = externalVideo;
          }
        }

        if (video) {
          e.preventDefault();
          import('./video-transition.js').then(mod => {
            mod.expandVideoAndNavigate(video, target);
          });
          return;
        }
      }

      // transición de imagen
      /*const imageWrapper = e.target.closest('.to-image-transition');
      if (imageWrapper) {
        const img = imageWrapper.querySelector('img');
        const target = imageWrapper.getAttribute('data-target');
        if (img && target) {
          e.preventDefault();
          //if (target === window.location.href) return;
          import('./image-transition.js').then(mod => {
            mod.expandImageAndNavigate(img, target);
          });
          return;
        }
      }^/

       */
      // transición de imagen
      const imageWrapper = e.target.closest('.to-image-transition');
      if (imageWrapper) {
        const target = imageWrapper.getAttribute('data-target');
        if (!target) return;

        let img = imageWrapper.querySelector('img');

        const selector = imageWrapper.getAttribute('data-image-selector');
        if (selector) {
          const externalImage = document.querySelector(selector);
          if (externalImage instanceof HTMLImageElement) {
            img = externalImage;
          }
        }

        if (img) {
          e.preventDefault();
          import('./image-transition.js').then(mod => {
            mod.expandImageAndNavigate(img, target);
          });
          return;
        }
      }

    });

  }

  /*window.addEventListener('popstate', () => {
    loadPage(location.href);
  });*/
  window.addEventListener('popstate', (event) => {
    //alert("P")
    //trigger('beforePageLoad', { url: location.href });
    //loadPage(location.href);
    console.log('popstate', event.state);
    const scrollY = event.state?.scrollY ?? 0;
    const st = event.state;
    if (st && st.type === 'block' && window.noreactBlocks && typeof window.noreactBlocks.navigateTo === 'function') {
      console.log("ENTRA");
      const targetKey = st.block;
      const restoreY = st.scrollY ?? 0;

      // navigateTo es async; esperá a que monte y luego restaurá scroll
      Promise.resolve(window.noreactBlocks.navigateTo(targetKey, { via: 'history' }))
        .then(() => {
          if (location.hash) return;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (window.ScrollTrigger) window.ScrollTrigger.refresh(true);
              if (window.lenis?.scrollTo) {
                window.lenis.scrollTo(restoreY, { immediate: true });
              } else {
                window.scrollTo(0, restoreY);
              }
            });
          });
        })
        .catch(() => {/* si falla, no hacemos nada extra en Fase 0 */});

      return; // ⬅️ importante: no sigas al flujo de loadPage(...)
    }
    //console.log("aca")
    loadPage(location.href).then(() => {
      if (location.hash) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (window.ScrollTrigger) {
            window.ScrollTrigger.refresh(true);
          }

          setTimeout(() => {
            if (window.lenis?.scrollTo) {
              window.lenis.scrollTo(scrollY, { immediate: true });
            } else {
              window.scrollTo(0, scrollY);
            }
          }, 0);
        });
      });
    });
  });
  /*window.addEventListener('pageshow', (event) => {
    alert("K"+event.persisted)
    if (event.persisted) {
      // Safari restauró desde el back-forward cache
      trigger('beforePageLoad', { url: location.href });
      loadPage(location.href);
    }
  });*/

  setupDelegatedNavigation();
}

export async function loadPage(url) {
  trigger('beforePageLoad', { url });

  const oldContainer = container;

  await runTransitionOut(oldContainer);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  const response = await fetch(url, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });


  const html = await response.text();
  const newDoc = new DOMParser().parseFromString(html, 'text/html');
  const newContent = newDoc.querySelector(containerSelector);

  if (!newContent) {
    console.error(`No se encontró el selector ${containerSelector} en la respuesta AJAX`);
    window.location.href = url;
    return;
  }

  //oldContainer.style.opacity = 0;
  //newContent.style.opacity = 0;
  //container.replaceWith(newContent);
  oldContainer.replaceWith(newContent);
  container = newContent;

  void container.offsetHeight;
  await runTransitionIn(container);


  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  trigger('afterPageLoad', { url });
}
