export function runTransitionOut(container) {
  /*return new Promise(resolve => {
    container.style.opacity = 0;
    setTimeout(resolve, 300);
  });*/
  /*return new Promise(resolve => {
    container.classList.add('noreact-out-transition');

    const onDone = () => {
      container.removeEventListener('transitionend', onDone);
      container.classList.remove('noreact-out-transition');
      resolve();
    };

    container.addEventListener('transitionend', onDone, { once: true });

    // fallback por si no hay transición CSS
    //setTimeout(onDone, 1000);
  });*/
  return new Promise(resolve => {
    // Asegurar que transform-origin refleje la posición actual del viewport
    const viewportCenterY = window.scrollY + window.innerHeight / 2;
    const containerRect = container.getBoundingClientRect();
    const offsetY = viewportCenterY - containerRect.top;
    const percentY = (offsetY / container.offsetHeight) * 100;
    container.style.transformOrigin = `50% ${percentY}%`;

    container.classList.add('noreact-out-transition');

    const styles = getComputedStyle(container);
    const duration =
      styles.getPropertyValue('--noreact-out-duration') ||
      styles.getPropertyValue('--noreact-out-animation-duration') ||
      '0.7s';

    const timeout = parseTime(duration);

    setTimeout(() => {
      container.style.opacity = 0;
      container.classList.remove('noreact-out-transition');
      resolve();
    }, timeout);
  });
}

export function runTransitionIn(container) {
  /*return new Promise(resolve => {
    container.style.opacity = 1;
    setTimeout(resolve, 300);
  });*/
  /*return new Promise(resolve => {
    container.classList.add('noreact-in-transition');

    const onDone = () => {
      //container.style.opacity = 1;
      container.removeEventListener('transitionend', onDone);
      container.classList.remove('noreact-in-transition');
      resolve();
    };

    container.addEventListener('transitionend', onDone, { once: true });
    setTimeout(onDone, 500);
  });*/
  return new Promise(resolve => {
    const viewportCenterY = window.scrollY + window.innerHeight / 2;
    const containerRect = container.getBoundingClientRect();
    const offsetY = viewportCenterY - containerRect.top;
    const percentY = (offsetY / container.offsetHeight) * 100;
    container.style.transformOrigin = `50% ${percentY}%`;

    container.style.opacity = 0;
    container.classList.add('noreact-in-transition');

    const styles = getComputedStyle(container);
    const duration =
      styles.getPropertyValue('--noreact-in-duration') ||
      styles.getPropertyValue('--noreact-in-animation-duration') ||
      '0.7s';

    const timeout = parseTime(duration);
    //container.style.opacity = 'unset';
    setTimeout(() => {
      container.style.opacity = 1;
      container.classList.remove('noreact-in-transition');
      resolve();
    }, timeout);
  });
}
function parseTime(str) {
  const trimmed = str.trim();
  if (trimmed.endsWith('ms')) return parseFloat(trimmed);
  if (trimmed.endsWith('s')) return parseFloat(trimmed) * 1000;
  return 700; // fallback
}