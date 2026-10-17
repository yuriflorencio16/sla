// JavaScript / public/customize.js / browser / crosshair editor and free practice UI
import { DEFAULT_AIM, sanitizeAim, loadAim, saveAim, cmPer360, drawCrosshair, AimInput } from '/aim.js';
import { PracticeSession } from '/practice.js';
const $ = id => document.getElementById(id);
export function drawRange(ctx, training = false) {
  const bg = ctx.createLinearGradient(0, 0, 0, 600);
  bg.addColorStop(0, '#081c37'); bg.addColorStop(0.65, '#12364b'); bg.addColorStop(1, '#07162c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 600);
  ctx.lineWidth = 1; ctx.strokeStyle = '#8cb8df18';
  for (let x = 0; x <= 1000; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 415); ctx.stroke(); }
  for (let y = 20; y <= 415; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  ctx.fillStyle = '#082037'; ctx.fillRect(0, 415, 1000, 185);
  ctx.strokeStyle = '#509fc338';
  for (let x = -1800; x < 3000; x += 180) { ctx.beginPath(); ctx.moveTo(500 + (x - 500) * 0.18, 415); ctx.lineTo(x, 600); ctx.stroke(); }
  for (const y of [415, 436, 468, 506, 552, 598]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  if (training) {
    for (const x of [105, 895]) { ctx.fillStyle = '#10283a'; ctx.fillRect(x - 16, 80, 32, 335); ctx.fillStyle = '#328f9c'; ctx.fillRect(x - 10, 95, 3, 300); }
    ctx.fillStyle = '#6c9cb7'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText('PRECISION RANGE / AIMRUSH', 500, 35);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#39bfc750' : '#ffcb5550'; ctx.fillRect(170 + i * 135, 429, 85, 3); }
  }
}
export function drawPracticeTarget(ctx, target, index = 0) {
  const { x, y, r } = target;
  ctx.save(); ctx.shadowColor = '#39e4c850'; ctx.shadowBlur = 20;
  const fill = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  fill.addColorStop(0, '#e2fff6'); fill.addColorStop(0.4, '#4dedd0'); fill.addColorStop(1, '#147d83');
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#b7ffec70'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#b0e7e2'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(index + 1).padStart(2, '0'), x, y + r + 23);
  ctx.restore();
}
export class AimStudio {
  constructor({ notify, tone, hasRound }) {
    this.notify = notify; this.tone = tone; this.hasRound = hasRound; this.view = 'lobby'; this.session = null; this.feedbackAt = -Infinity; this.previewShot = -Infinity;
    try { this.storage = window.localStorage; } catch {}
    this.settings = loadAim(this.storage); this.storageAvailable = true;
    this.preview = $('aimPreview'); this.previewCtx = this.preview.getContext('2d');
    this.canvas = $('practiceRange'); this.ctx = this.canvas.getContext('2d');
    this.input = new AimInput(this.canvas, { settings: () => this.settings, enabled: () => Boolean(this.session?.active), shoot: (x, y) => this.shoot(x, y), status: (locked, error) => this.inputStatus(locked, error) });
    document.querySelectorAll('[data-aim]').forEach(control => {
      const update = () => {
        const key = control.dataset.aim;
        let value = control.type === 'checkbox' ? control.checked : ['range', 'number'].includes(control.type) ? control.valueAsNumber : control.value;
        if (typeof value === 'number' && !Number.isFinite(value)) return;
        this.settings = sanitizeAim({ ...this.settings, [key]: value }); this.sync(); this.persist();
      };
      control.addEventListener('input', update);
      control.addEventListener('change', () => { update(); this.sync(); });
    });
    document.querySelectorAll('[data-aim-preset]').forEach(button => button.onclick = () => {
      const presets = { classic: { shape: 'classic', size: 8, gap: 4, thickness: 2, dot: false, color: '#00ff88' }, dot: { shape: 'dot', dotSize: 2, color: '#ff66bb' }, circle: { shape: 'circle', size: 9, dot: true, color: '#55ddff' }, t: { shape: 't', size: 8, gap: 4, dot: false, color: '#ffb84d' } };
      this.settings = sanitizeAim({ ...this.settings, ...presets[button.dataset.aimPreset] }); this.sync(); this.persist();
    });
    $('resetAim').onclick = () => { this.settings = { ...DEFAULT_AIM }; this.sync(); this.persist(); this.notify('Mira e sensibilidade restauradas.'); };
    this.preview.onclick = () => this.previewShot = performance.now();
    $('practiceSize').oninput = () => $('practiceSizeValue').textContent = $('practiceSize').value;
    $('practiceStart').onclick = () => this.start();
    $('practiceStop').onclick = () => this.finish(performance.now());
    $('capturePractice').onclick = () => { if (this.session?.active) this.input.capture(); else this.notify('Inicie um treino para capturar o mouse.'); };
    $('practiceFullscreen').onclick = async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('practiceCanvasWrap').requestFullscreen(); }
      catch { this.notify('Tela cheia indisponível neste navegador.'); }
    };
    this.sync(); this.inputStatus(false);
  }
  sync() {
    document.querySelectorAll('[data-aim]').forEach(control => {
      const value = this.settings[control.dataset.aim];
      if (control.type === 'checkbox') control.checked = value; else control.value = value;
    });
    $('cm360').textContent = `Referência: ${cmPer360(this.settings).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm/360° a ${this.settings.dpi} DPI.`;
  }
  persist() {
    this.storageAvailable = saveAim(this.storage, this.settings);
    $('settingsSaved').textContent = this.storageAvailable ? 'Salvo neste navegador' : 'Mantido apenas nesta sessão';
  }
  inputStatus(locked, error) {
    $('capturePractice').textContent = locked ? 'Mouse capturado · Esc' : 'Capturar mouse';
    $('practiceInputStatus').textContent = error || (locked ? 'Sensibilidade ativa · Esc libera o mouse. O treino continua até ser encerrado.' : this.settings.inputMode === 'free' ? 'Cursor livre e toque usam posição direta. A sensibilidade exige o modo capturado.' : 'Clique na arena ou em Capturar mouse para usar a sensibilidade. No toque, a posição é direta.');
  }
  setView(view) {
    if (view !== 'training') { if (this.session?.active) this.finish(performance.now()); this.input.release(); }
    this.view = view;
    if (view === 'training') { $('practiceStart').disabled = this.hasRound(); this.inputStatus(this.input.locked); }
  }
  async start() {
    if (this.hasRound()) { this.notify('Encerre a partida atual antes de iniciar o treino gratuito.'); return; }
    $('practiceStart').disabled = true;
    if (this.settings.inputMode === 'captured' && matchMedia('(pointer: fine)').matches) await this.input.capture();
    this.session = new PracticeSession({ mode: $('practiceMode').value, radius: Number($('practiceSize').value), duration: Number($('practiceDuration').value) }, performance.now());
    this.feedbackAt = -Infinity;
    $('practiceOverlay').hidden = true; $('practiceStop').hidden = false; $('practicePhase').textContent = 'TREINO EM ANDAMENTO';
    for (const id of ['practiceMode', 'practiceSize', 'practiceDuration']) $(id).disabled = true;
    $('practiceMessage').textContent = this.session.mode === 'tracking' ? 'Mantenha a mira dentro do alvo em movimento. O indicador de tracking mede a permanência.' : 'Acerte os alvos. Novos alvos aparecem após cada acerto, sem limite de tiros.';
  }
  finish(now) {
    if (!this.session) return;
    if (this.session.active) this.session.finish(now);
    this.input.release();
    const stats = this.session.stats(now);
    $('practiceOverlay').hidden = false; $('practiceStop').hidden = true; $('practiceStart').disabled = false;
    $('practicePhase').textContent = 'TREINO CONCLUÍDO'; $('practiceTitle').textContent = 'Treino concluído.';
    $('practiceSummary').textContent = `${this.session.hits} acertos / ${this.session.shots} tiros · ${stats.accuracy}% de precisão · ${stats.reaction} ms de reação média · melhor combo ${this.session.bestStreak}×${this.session.mode === 'tracking' ? ' · '+stats.tracking+'% no alvo' : ''}`;
    $('practiceStart').textContent = 'Treinar novamente →';
    for (const id of ['practiceMode', 'practiceSize', 'practiceDuration']) $(id).disabled = false;
  }
  shoot(x, y) {
    if (!this.session?.active) return;
    const hit = this.session.shoot(x, y, performance.now());
    if (hit === null) { if (!this.session.active) this.finish(performance.now()); return; }
    this.feedbackAt = performance.now(); this.lastHit = hit; this.tone(hit);
  }
  draw(now) {
    if (this.view === 'settings') {
      const ctx = this.previewCtx; ctx.save(); ctx.scale(0.6, 0.6); drawRange(ctx, true); ctx.restore();
      const scale = this.preview.width / Math.max(1, this.preview.getBoundingClientRect().width);
      drawCrosshair(ctx, 300, 180, this.settings, scale, Math.max(0, 1 - (now - this.previewShot) / 180));
    }
    if (this.view !== 'training') return;
    const session = this.session;
    if (session?.active) { session.tick(now, this.input.visible ? this.input.position : null); if (!session.active) this.finish(now); }
    drawRange(this.ctx, true);
    if (session?.active) session.targets.forEach((target, i) => drawPracticeTarget(this.ctx, target, i));
    if (session?.active) this.input.draw(this.ctx, now);
    if (session) {
      const stats = session.stats(now);
      $('practiceTimer').textContent = stats.remaining === null ? (stats.elapsed / 1000).toFixed(1).replace('.', ',') + 's ↑' : (stats.remaining / 1000).toFixed(1).replace('.', ',') + 's';
      $('practiceHits').textContent = `${session.hits} / ${session.shots}`;
      $('practiceAccuracy').textContent = stats.accuracy + '%'; $('practiceReaction').textContent = stats.reaction + ' ms';
      $('practiceTracking').textContent = session.mode === 'tracking' ? stats.tracking + '%' : '—';
    }
    $('practiceFeedback').className = 'practice-feedback' + (now - this.feedbackAt < 220 ? ' visible' : '') + (this.lastHit ? '' : ' bad');
    $('practiceFeedback').textContent = this.lastHit ? 'ACERTO' : 'ERRO';
  }
}
