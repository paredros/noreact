import { trigger, on } from './events.js';
import { loadPage } from './router.js';

export async function expandImageAndNavigate(imageEl, targetUrl) {
  // 1. Clonar la imagen
  const clone = imageEl.cloneNode(true);
  const rect = imageEl.getBoundingClientRect();

  // ⬇️ Guardar el scroll actual en el estado del historial actual
        const currentState = history.state || {};
        currentState.scrollY = window.lenis?.scroll || window.scrollY;
        history.replaceState(currentState, '');

  // 2. Estilo base del clon
  Object.assign(clone.style, {
    position: 'fixed',
    top: rect.top + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
    zIndex: 9999,
    transition: 'all 0.8s ease, filter 0.8s ease',
    objectFit: 'cover',
    pointerEvents: 'none',
    filter: 'blur(0px) brightness(1)'
  });

  document.body.appendChild(clone);

  // 3. Animar a fullscreen
  requestAnimationFrame(() => {
    Object.assign(clone.style, {
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
      filter: 'blur(10px) brightness(0.6)'
    });
  });

  // 4. Esperar que se aplique la transición visual
  await waitForFullscreenTransition(clone);

  const handler = ({ url }) => {
    if (url !== targetUrl) return;
    const realImage = document.querySelector('[data-main-image]');
    if (realImage) {
      realImage.style.opacity = '0';

      const targetRect = realImage.getBoundingClientRect();

      Object.assign(clone.style, {
        transition: 'all 0.5s ease, opacity 0.3s ease, filter 0.5s ease',
        top: `${targetRect.top}px`,
        left: `${targetRect.left}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        filter: 'blur(0px) brightness(1)'
      });

      // Aparecer imagen real
      realImage.style.transition = 'all 0.3s ease';
      realImage.style.opacity = '1';

      // Fade out del clon
      setTimeout(() => {
        clone.style.opacity = '0';
      }, 500);

      setTimeout(() => {
        clone.remove();
      }, 800);
    }
    off();
  };
  // 5. Esperar a que la nueva página se cargue
  const off= on('afterPageLoad', handler);

  // 6. Disparar navegación AJAX
  history.pushState({ scrollY: 0 }, '', targetUrl);
  trigger('beforePageLoad', { url: targetUrl });
  await loadPage(targetUrl);
}

// Función de espera para que el clon haya transicionado correctamente
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
    setTimeout(done, 700); // fallback de seguridad
  });
}
