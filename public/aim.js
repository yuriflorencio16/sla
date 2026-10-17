// JavaScript / public/aim.js / browser and Node.js / crosshair settings and relative aim
export const DEFAULT_AIM = Object.freeze({ shape: 'classic', color: '#00ff88', outlineColor: '#000000', size: 8, gap: 4, thickness: 2, outline: 1, opacity: 100, dot: false, dotSize: 2, dynamic: false, sensitivity: 1, dpi: 800, invertY: false, inputMode: 'captured' });
export function sanitizeAim(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const clean = { ...DEFAULT_AIM };
  const ranges = { size: [1, 24], gap: [-4, 20], thickness: [0.5, 6], outline: [0, 4], opacity: [20, 100], dotSize: [1, 6], sensitivity: [0.05, 5], dpi: [100, 16000] };
  for (const [key, [min, max]] of Object.entries(ranges)) if (typeof input[key] === 'number' && Number.isFinite(input[key])) clean[key] = Math.max(min, Math.min(max, input[key]));
  for (const key of ['color', 'outlineColor']) if (/^#[\da-f]{6}$/i.test(input[key] ?? '')) clean[key] = input[key];
  for (const key of ['dot', 'dynamic', 'invertY']) if (typeof input[key] === 'boolean') clean[key] = input[key];
  if (['classic', 'cross', 'dot', 'circle', 't'].includes(input.shape)) clean.shape = input.shape;
  if (['captured', 'free'].includes(input.inputMode)) clean.inputMode = input.inputMode;
  return clean;
}
export function loadAim(storage) { try { return sanitizeAim(JSON.parse(storage.getItem('aimrush-aim-v1'))); } catch { return { ...DEFAULT_AIM }; } }
export function saveAim(storage, settings) { try { storage.setItem('aimrush-aim-v1', JSON.stringify(sanitizeAim(settings))); return true; } catch { return false; } }
export const cmPer360 = settings => 360 * 2.54 / (0.022 * settings.sensitivity * settings.dpi);
export function moveAim(position, dx, dy, settings, width = 1000, height = 600) {
  // CS-style 0.022 degrees/count, with a 90-degree 4:3 reference field of view.
  const focal = height * 2 / 3, radians = 0.022 * settings.sensitivity * Math.PI / 180;
  const project = (value, delta, dimension) => {
    const center = dimension / 2, limit = Math.atan(center / focal);
    const angle = Math.max(-limit, Math.min(limit, Math.atan((value - center) / focal) + delta * radians));
    return Math.max(0, Math.min(dimension, center + Math.tan(angle) * focal));
  };
  return [project(position[0], dx, width), project(position[1], dy * (settings.invertY ? -1 : 1), height)];
}
export function drawCrosshair(ctx, x, y, settings, scale = 1, recoil = 0) {
  const s = settings, dynamic = s.dynamic ? recoil * 8 : 0;
  const gap = (s.gap + dynamic) * scale, length = s.size * scale;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = s.opacity / 100; ctx.lineCap = 'butt';
  const stroke = path => {
    if (s.outline > 0) { ctx.strokeStyle = s.outlineColor; ctx.lineWidth = (s.thickness + 2 * s.outline) * scale; ctx.beginPath(); path(); ctx.stroke(); }
    ctx.strokeStyle = s.color; ctx.lineWidth = s.thickness * scale; ctx.beginPath(); path(); ctx.stroke();
  };
  const dot = () => {
    const r = s.dotSize * scale;
    if (s.outline > 0) { ctx.fillStyle = s.outlineColor; ctx.beginPath(); ctx.arc(0, 0, r + s.outline * scale, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  };
  if (s.shape === 'dot') dot();
  else if (s.shape === 'circle') { stroke(() => ctx.arc(0, 0, length + dynamic * scale, 0, Math.PI * 2)); if (s.dot) dot(); }
  else {
    const opening = s.shape === 'cross' ? 0 : gap;
    stroke(() => {
      ctx.moveTo(-opening - length, 0); ctx.lineTo(-opening, 0); ctx.moveTo(opening, 0); ctx.lineTo(opening + length, 0);
      if (s.shape !== 't') { ctx.moveTo(0, -opening - length); ctx.lineTo(0, -opening); }
      ctx.moveTo(0, opening); ctx.lineTo(0, opening + length);
    });
    if (s.dot) dot();
  }
  ctx.restore();
}
export class AimInput {
  constructor(canvas, { settings, enabled, shoot, status = () => {} }) {
    this.canvas = canvas; this.settings = settings; this.enabled = enabled; this.shoot = shoot; this.status = status;
    this.position = [500, 300]; this.visible = false; this.shotAt = -Infinity; this.fallback = false;
    canvas.classList.add('aim-canvas');
    document.addEventListener('pointerlockchange', () => { this.visible = this.locked || this.visible; canvas.classList.toggle('mouse-locked', this.locked); status(this.locked); });
    document.addEventListener('mousemove', event => { if (this.locked && enabled()) { this.position = moveAim(this.position, event.movementX, event.movementY, settings()); this.visible = true; } });
    canvas.addEventListener('pointermove', event => { if (!this.locked) { this.position = this.coordinates(event); this.visible = true; } });
    canvas.addEventListener('pointerleave', () => { if (!this.locked) this.visible = false; });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !enabled()) return;
      event.preventDefault();
      if (!this.locked && event.pointerType !== 'touch' && settings().inputMode === 'captured' && !this.fallback) { this.capture(); return; }
      if (!this.locked) this.position = this.coordinates(event);
      this.visible = true; this.shotAt = performance.now(); shoot(...this.position);
    });
  }
  get locked() { return document.pointerLockElement === this.canvas; }
  coordinates(event) { const r = this.canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1000, (event.clientX - r.left) * 1000 / r.width)), Math.max(0, Math.min(600, (event.clientY - r.top) * 600 / r.height))]; }
  async capture() {
    if (this.locked) return true;
    if (!this.canvas.requestPointerLock) { this.fallback = true; this.status(false, 'Captura indisponível. Use o cursor livre.'); return false; }
    try {
      this.position = [500, 300]; this.visible = true;
      try { await this.canvas.requestPointerLock({ unadjustedMovement: true }); }
      catch (error) { if (error.name !== 'NotSupportedError') throw error; await this.canvas.requestPointerLock(); }
      this.fallback = !this.locked;
      this.status(this.locked, this.locked ? '' : 'Captura indisponível. Use o cursor livre.');
      return this.locked;
    } catch { this.fallback = true; this.status(false, 'Captura não liberada. Cursor livre ativo; clique em Capturar para tentar novamente.'); return false; }
  }
  release() { if (this.locked) document.exitPointerLock(); }
  draw(ctx, now) {
    if (!this.visible) return;
    const width = this.canvas.getBoundingClientRect().width;
    if (width) drawCrosshair(ctx, ...this.position, this.settings(), 1000 / width, Math.max(0, 1 - (now - this.shotAt) / 180));
  }
}
