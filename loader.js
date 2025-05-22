import { on, trigger } from './events.js';
import { expandVideoAndNavigate } from './video-transition.js';

let loaderEl;

function createLoader() {
  loaderEl = document.createElement('div');
  loaderEl.id = 'ajax-loader';
  loaderEl.innerHTML = '<div class="bar"></div>';
  document.body.appendChild(loaderEl);
}

function setProgress(percent) {
  const bar = loaderEl.querySelector('.bar');
  bar.style.width = percent + '%';
}

function showLoader() {
  loaderEl.style.opacity = 1;
  setProgress(0);
}

function hideLoader() {
  loaderEl.style.opacity = 0;
  setProgress(0);
}

on('beforePageLoad', ({ url }) => {
  showLoader();


  if (typeof window.cleanupPage === 'function') {
    try {
      window.cleanupPage();
    } catch (e) {
      console.warn("Error ejecutando cleanupPage:", e);
    }
    window.cleanupPage = null;
  }
  // Limpieza de animaciones GSAP
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }

  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf("*");
  }

  // 🧹 Eliminar scripts <script type="module-js"> anteriores
  document.querySelectorAll('script[data-dynamic-module]').forEach(script => {
    script.remove();
  });


  // simular progreso de carga
  let progress = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 10, 90);
    setProgress(progress);
    if (progress >= 90) clearInterval(interval);
  }, 100);
});

on('afterPageLoad', () => {

  setProgress(100);
  setTimeout(hideLoader, 300);
  // Ejecutar nuevos scripts type="module-js"
  const scripts = document.querySelectorAll('script[type="module-js"]');
  scripts.forEach((script) => {
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.textContent = script.textContent;
    moduleScript.setAttribute('data-dynamic-module', 'true');
    document.body.appendChild(moduleScript);
  });


  // Ejecutar animaciones embebidas de cada vista
  document.querySelectorAll('script[type="text/anim-js"]').forEach(script => {
    try {
      new Function(script.textContent)();
    } catch (e) {
      console.error("Error ejecutando animación:", e);
    }
  });

  // 🔽 Scroll manual al anchor si hay hash
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: 'auto' });
    }
  }
});

document.addEventListener("DOMContentLoaded", createLoader);
