import { trigger, on } from './events.js';
import { loadPage } from './router.js';

export async function expandVideoAndNavigate(videoEl, targetUrl) {
  // 1. Clonar el video
  const clone = videoEl.cloneNode(true);
  const rect = videoEl.getBoundingClientRect();

  // ⬇️ Guardar el scroll actual en el estado del historial actual
        const currentState = history.state || {};
        currentState.scrollY = window.lenis?.scroll || window.scrollY;
        history.replaceState(currentState, '');

  // 2. Estilo para posición fija
  Object.assign(clone.style, {
    position: 'fixed',
    top: rect.top + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
    zIndex: 9999,
    transition: 'all 0.9s ease',
    objectFit: 'cover',
    pointerEvents: 'none',
    filter: 'blur(0px) brightness(1)',

  });

  document.body.appendChild(clone);

  // 3. Animar a fullscreen (100vw x 100vh)
  requestAnimationFrame(() => {
    Object.assign(clone.style, {
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
        filter: 'blur(10px) brightness(0.5)',
    });
  });


  function waitForFullscreenTransition(clone) {
    return new Promise((resolve) => {
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        clone.removeEventListener('transitionend', done);
        resolve();
      };

      clone.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 700); // fallback
    });
  }
  await waitForFullscreenTransition(clone);
  // 4. Esperar a que la nueva vista esté lista
  const handler = ({ url }) => {
    if (url !== targetUrl) return;

    const realVideo = document.querySelector('[data-main-video]');
    if (realVideo) {
      realVideo.style.opacity = '0';
      /*realVideo.pause();

      try {
        realVideo.currentTime = clone.currentTime;
      } catch (e) {
        console.warn("No se pudo sincronizar el tiempo del video");
      }

      realVideo.play();*/
      window.__transitionVideoSyncTime = clone.currentTime;

      // 1. Obtener bounding box del nuevo video
    const targetRect = realVideo.getBoundingClientRect();

    // 2. Animar el clon desde fullscreen hasta ese rectángulo
    Object.assign(clone.style, {
      transition: 'all 0.5s ease, opacity 0.3s ease',
      top: `${targetRect.top}px`,
      left: `${targetRect.left}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      filter: 'blur(0px) brightness(1)',
    });

    // 3. Fade del real
    realVideo.style.transition = 'opacity 0.3s ease';
    realVideo.style.opacity = '1';

    // 4. Esperar y hacer fade out del clon
    setTimeout(() => {
      clone.style.opacity = '0';
    }, 500);

    // 5. Quitar el clon del DOM
    setTimeout(() => {
      clone.remove();
    }, 800);
    }
    // Remover el listener después de ejecutarlo
    off();
  };


  const off= on('afterPageLoad', handler);


  // 5. Disparar navegación AJAX normal
  history.pushState({ scrollY: 0 }, '', targetUrl);
  trigger('beforePageLoad', { url: targetUrl });
  await loadPage(targetUrl);
}