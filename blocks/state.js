const _state = {
  live: 'A',     // 'A' | 'B'
  block: null,   // clave actual (string)
};

export function get() {
  return { ..._state };
}

export function setLive(bucket /* 'A' | 'B' */) {
  _state.live = bucket;
}

export function setBlock(key) {
  _state.block = key;
}