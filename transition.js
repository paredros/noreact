export function runTransitionOut(container) {
  return new Promise(resolve => {
    container.style.opacity = 0;
    setTimeout(resolve, 300);
  });
}

export function runTransitionIn(container) {
  return new Promise(resolve => {
    container.style.opacity = 1;
    setTimeout(resolve, 300);
  });
}
