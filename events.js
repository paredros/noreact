const listeners = {};

export function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  // devolvemos una función para remover este callback
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
}

export function trigger(event, data = {}) {
  if (listeners[event]) {
    listeners[event].forEach(cb => cb(data));
  }
}
