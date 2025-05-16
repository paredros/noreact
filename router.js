import { runTransitionOut, runTransitionIn } from './transition.js';
import { trigger } from './events.js';
import { expandVideoAndNavigate } from './video-transition.js';
import {expandImageAndNavigate} from "./image-transition.js";

let container;
const containerSelector = '#main-content';

export function initRouter() {
  container = document.querySelector(containerSelector);

  function setupDelegatedNavigation() {
    document.body.addEventListener('click', (e) => {
      // manejo de links AJAX
      const link = e.target.closest('a[data-ajax-link]');
      if (link && link.href && !link.hasAttribute('data-no-ajax')) {
        e.preventDefault();
        const url = link.href;
        //if (url === window.location.href) return;
        history.pushState(null, '', url);
        loadPage(url);
        return;
      }


      // transición de video
      const videoWrapper = e.target.closest('.to-video-transition');
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
      }

      // transición de imagen
      const imageWrapper = e.target.closest('.to-image-transition');
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
      }
    });

  }

  /*window.addEventListener('popstate', () => {
    loadPage(location.href);
  });*/
  window.addEventListener('popstate', () => {
    //alert("P")
    //trigger('beforePageLoad', { url: location.href });
    loadPage(location.href);
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

  await runTransitionOut(container);
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

  newContent.style.opacity = 0;
  container.replaceWith(newContent);
  container = newContent;

  void container.offsetHeight;
  await runTransitionIn(container);


  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  trigger('afterPageLoad', { url });
}
