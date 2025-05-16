import { initRouter } from './router.js';
import { trigger } from './events.js';
import './loader.js';

document.addEventListener("DOMContentLoaded", () => {
  initRouter();
  trigger('afterPageLoad', { url: window.location.href });
});
