// ---- ScrollGate: integra wheel/touch con acumulación y decaimiento ----
export class ScrollGate {
  constructor({ threshold = 160, minDelta = 2, decayPerSec = 0.75 } = {}) {
    this.threshold = threshold;   // acumulado necesario para disparar
    this.minDelta  = minDelta;    // ignora micro-deltas
    this.decayPerSec = decayPerSec;
    this.activeDir = null;        // 'up' | 'down' | null
    this.accum = 0;
    this.lastT = 0;
    this.enabled = false;
    this.onTrigger = null;        // () => void
  }
  enable(dir, cb) {
    this.activeDir = dir;         // fija dirección
    this.onTrigger = cb;
    this.accum = 0;
    this.lastT = performance.now();
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
    this.activeDir = null;
    this.onTrigger = null;
    this.accum = 0;
  }
  _applyDecay(now) {
    const dt = Math.max(0, (now - this.lastT) / 1000); // seg
    // decaimiento exponencial
    const k = Math.pow(this.decayPerSec, dt);
    this.accum *= k;
    this.lastT = now;
  }
  feedWheel(deltaY) {
    if (!this.enabled) return;
    const now = performance.now();
    this._applyDecay(now);

    // signo según dirección activa
    const dir = this.activeDir;
    const signed = dir === 'down' ? deltaY : -deltaY;

    if (Math.abs(signed) < this.minDelta) return; // ruido
    if (signed < 0) {
      // gesto contrario a la dirección: resetea acumulado
      this.accum = 0;
      return;
    }

    this.accum += signed;
    if (this.accum >= this.threshold && this.onTrigger) {
      const cb = this.onTrigger;
      this.disable();      // se apaga al disparar
      cb();
    }
  }
  feedTouch(dy) { // dy > 0 = “arrastrar hacia abajo”
    // Wheel usa pixel delta; acá usamos delta de touch (px también)
    this.feedWheel(-dy); // para mantener convención: wheel down = positivo
  }
}
