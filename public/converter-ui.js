// JavaScript / public/converter-ui.js / browser / game-profile conversion controls
import { GAME_PROFILES, convertSensitivity, horizontalFov } from './conversion.js';
const $ = id => document.getElementById(id);
const display = (value, precision = 6) => value.toLocaleString('pt-BR', { maximumFractionDigits: precision });
const numeric = value => value.trim() === '' ? NaN : Number(value.trim().replace(',', '.'));
export class GameConverter {
  constructor({ settings, apply, storage, notify }) {
    this.settings = settings; this.applySettings = apply; this.storage = storage; this.notify = notify;
    for (const [id, profile] of Object.entries(GAME_PROFILES)) { const option = document.createElement('option'); option.value = id; option.textContent = profile.name; $('sourceGame').append(option); }
    $('sourceDpi').value = settings().dpi; $('targetDpi').value = settings().dpi;
    let restored = false;
    try {
      const saved = JSON.parse(storage.getItem('aimrush-conversion-v1'));
      if (saved && typeof saved === 'object' && Object.hasOwn(GAME_PROFILES, saved.game)) {
        document.querySelectorAll('[data-convert]').forEach(control => {
          const value = saved[control.dataset.convert];
          if (control.type === 'checkbox' && typeof value === 'boolean') control.checked = value;
          else if (typeof value === 'string' || typeof value === 'number') control.value = value;
        });
        restored = true;
      }
    } catch {}
    this.profileChanged(!restored);
    document.querySelectorAll('[data-convert]').forEach(control => control.addEventListener('input', () => {
      if (control.id === 'sourceGame') this.profileChanged(true);
      this.persist(); this.render();
    }));
    $('applyConversion').onclick = () => this.apply();
    $('tryConversion').onclick = () => { if (this.apply()) document.querySelector('.bottom-nav [data-open="training"]').click(); };
    const tabs = [...document.querySelectorAll('[data-aim-tab]')];
    const select = tab => {
      tabs.forEach(button => { const active = button === tab; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
      document.querySelectorAll('[data-aim-panel]').forEach(panel => panel.hidden = panel.dataset.aimPanel !== tab.dataset.aimTab);
    };
    tabs.forEach((tab, index) => {
      tab.onclick = () => select(tab);
      tab.onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(tabs[next]); tabs[next].focus();
      };
    });
    this.syncApplied();
  }
  profileChanged(reset) {
    const p = GAME_PROFILES[$('sourceGame').value];
    if (!p) return;
    $('sourceGameNote').textContent = p.note;
    $('sourceSensitivityFields').hidden = Boolean(p.measured); $('measuredFields').hidden = !p.measured;
    $('r6MultiplierField').hidden = $('sourceGame').value !== 'r6';
    if (reset) { $('sourceSensitivity').value = p.sens ?? 1; $('sourceVertical').value = ''; $('sourceFov').value = p.fov; $('sourceFovType').value = p.fovType; }
  }
  values() {
    const data = {};
    document.querySelectorAll('[data-convert]').forEach(control => data[control.dataset.convert] = control.type === 'checkbox' ? control.checked : control.value);
    return data;
  }
  persist() { try { this.storage.setItem('aimrush-conversion-v1', JSON.stringify(this.values())); } catch {} }
  calculate() {
    const raw = this.values(), input = { ...raw };
    for (const key of ['sensitivity', 'verticalSensitivity', 'sourceDpi', 'targetDpi', 'multiplier', 'measuredCm', 'measuredCmY', 'fov']) input[key] = (key === 'verticalSensitivity' || key === 'measuredCmY') && raw[key].trim() === '' ? null : numeric(raw[key]);
    return convertSensitivity(input, this.settings().fovY);
  }
  render() {
    $('sourceFovFields').hidden = !$('matchFov').checked;
    try {
      const result = this.calculate();
      this.result = result; $('conversionError').textContent = '';
      $('convertedCm').textContent = display(result.cmX, 4); $('convertedCmY').textContent = display(result.cmY, 4);
      $('convertedSens').textContent = display(result.sensitivity, 8); $('convertedSensY').textContent = display(result.sensitivityY, 8);
      $('convertedFov').textContent = `${display(result.fovY, 2)}° / ${display(result.fovX, 2)}°`;
      $('applyConversion').disabled = false; $('tryConversion').disabled = false;
      const current = this.settings();
      const same = current.sourceGame === result.game && current.dpi === result.dpi && Math.abs(current.sensitivity - result.sensitivity) < 1e-12 && Math.abs(current.verticalRatio - result.verticalRatio) < 1e-12 && Math.abs(current.fovY - result.fovY) < 1e-12;
      $('conversionStatus').textContent = same ? 'Conversão ativa no treino e na partida.' : 'Prévia: aplique para alterar a configuração ativa.';
    } catch (error) {
      this.result = null; $('conversionError').textContent = error.message;
      for (const id of ['convertedCm', 'convertedCmY', 'convertedSens', 'convertedSensY', 'convertedFov']) $(id).textContent = '—';
      $('applyConversion').disabled = true; $('tryConversion').disabled = true; $('conversionStatus').textContent = 'A configuração ativa permanece a mesma enquanto os campos estiverem inválidos.';
    }
  }
  apply() {
    try {
      const result = this.calculate();
      this.applySettings({ ...this.settings(), sensitivity: result.sensitivity, verticalRatio: result.verticalRatio, dpi: result.dpi, fovY: result.fovY, sourceGame: result.game, inputMode: 'captured' });
      this.persist(); this.syncApplied(); this.notify('Sensibilidade e FOV aplicados. Use o mouse capturado no treino.'); return true;
    } catch (error) { this.notify(error.message); this.render(); return false; }
  }
  syncApplied() {
    const settings = this.settings();
    const name = GAME_PROFILES[settings.sourceGame]?.name ?? 'Manual / personalizado';
    const cm = 360 * 2.54 / (0.022 * settings.sensitivity * settings.dpi);
    $('appliedProfile').textContent = `Ativo: ${name} · ${display(cm, 2)} cm/360° · ${settings.dpi} DPI`;
    $('practiceProfile').textContent = `${name} · ${display(cm, 2)} cm/360° · FOV ${display(horizontalFov(settings.fovY), 1)}° na arena · editar →`;
    this.render();
  }
}
