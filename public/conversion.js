// JavaScript / public/conversion.js / browser and Node.js / hipfire cm-per-360 conversion
export const APP_YAW = 0.022;
export const DEFAULT_FOV_Y = 2 * Math.atan(0.75) * 180 / Math.PI;
export const GAME_PROFILES = Object.freeze({
  cs2: { name: 'Counter-Strike 2 — padrão', yaw: 0.022, sens: 1, fov: 90, fovType: 'h43', note: 'Hipfire, m_yaw/m_pitch padrão 0,022. Confira o DPI e eventuais alterações de configuração.' },
  csgo: { name: 'CS:GO — padrão', yaw: 0.022, sens: 1, fov: 90, fovType: 'h43', note: 'Hipfire do Source com fatores de rotação padrão. Aceleração do mouse deve estar desativada.' },
  valorant: { name: 'Valorant — perfil comunitário', yaw: 0.07, sens: 0.3142857142857143, fov: 103, fovType: 'h169', note: 'Hipfire com coeficiente comunitário aproximado de 0,07. Valide no treino; não inclui multiplicadores de luneta.' },
  r6: { name: 'Rainbow Six Siege — hipfire', yaw: 0.0001 * 180 / Math.PI, sens: 6, fov: 60, fovType: 'vertical', note: 'Informe as sensibilidades horizontal/vertical e o MouseSensitivityMultiplierUnit do arquivo GameSettings.ini. Padrão: 0,02. Não converte ADS/zoom.' },
  cod_legacy: { name: 'CoD / Warzone — escala clássica de mouse', yaw: 0.0066, sens: 3.3333333333333335, fov: 80, fovType: 'h169', note: 'Perfil legado comunitário de mouse com yaw 0,0066. Não use em escalas novas ou controle; para outra versão escolha Warzone por cm/360°.' },
  warzone_measured: { name: 'Warzone — versão atual, por medição', measured: true, fov: 90, fovType: 'h169', note: 'Meça no seu Warzone a distância do mouse para um giro de 360°. Esse método não depende da escala de sensibilidade da versão. Informe o FOV usado.' },
  apex: { name: 'Apex Legends — padrão', yaw: 0.022, sens: 1, fov: 90, fovType: 'h43', note: 'Perfil comunitário Source, hipfire e fator padrão 0,022. Confirme seu FOV; ADS não está incluído.' },
  overwatch: { name: 'Overwatch — padrão', yaw: 0.0066, sens: 3.3333333333333335, fov: 103, fovType: 'h169', note: 'Hipfire com fator 0,0066 do perfil Overwatch do Sensitivity Matcher. Zoom e ajustes de herói exigem medição própria.' },
  measured: { name: 'Outro jogo / ADS — cm/360° medidos', measured: true, fov: 90, fovType: 'h169', note: 'Sem tabela presumida. Meça cm/360° no estado que deseja reproduzir, incluindo o zoom se aplicável, e informe o FOV correspondente.' }
});
const number = (value, min, max, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw Error(`${label}: informe um valor entre ${min} e ${max}.`);
  return value;
};
export function verticalFov(value, type) {
  number(value, 1, 179, 'FOV');
  if (type === 'vertical') return value;
  const aspect = { h43: 4 / 3, h169: 16 / 9, hArena: 5 / 3 }[type];
  if (!aspect) throw Error('Formato de FOV inválido.');
  return 2 * Math.atan(Math.tan(value * Math.PI / 360) / aspect) * 180 / Math.PI;
}
export const horizontalFov = (fovY, aspect = 5 / 3) => 2 * Math.atan(Math.tan(fovY * Math.PI / 360) * aspect) * 180 / Math.PI;
export function convertSensitivity(input, currentFovY = DEFAULT_FOV_Y) {
  const profile = GAME_PROFILES[input.game];
  if (!profile) throw Error('Selecione um jogo ou a opção por medição.');
  const targetDpi = number(input.targetDpi, 100, 16000, 'DPI usado no AimRush');
  let cmX, cmY, sourceYaw = null;
  if (profile.measured) {
    cmX = number(input.measuredCm, 0.1, 10000, 'Distância horizontal em cm/360°');
    cmY = input.measuredCmY == null ? cmX : number(input.measuredCmY, 0.1, 10000, 'Distância vertical em cm/360°');
  } else {
    const dpi = number(input.sourceDpi, 100, 16000, 'DPI usado no jogo');
    const sens = number(input.sensitivity, 0.00001, input.game === 'r6' ? 100 : 100000, 'Sensibilidade do jogo');
    const vertical = input.verticalSensitivity == null ? sens : number(input.verticalSensitivity, 0.00001, input.game === 'r6' ? 100 : 100000, 'Sensibilidade vertical');
    sourceYaw = profile.yaw;
    if (input.game === 'r6') sourceYaw *= number(input.multiplier, 0.000001, 1, 'Multiplicador do Rainbow Six') / 0.02;
    cmX = 360 * 2.54 / (sourceYaw * sens * dpi);
    cmY = 360 * 2.54 / (sourceYaw * vertical * dpi);
  }
  const sensitivity = 360 * 2.54 / (cmX * APP_YAW * targetDpi);
  const sensitivityY = 360 * 2.54 / (cmY * APP_YAW * targetDpi);
  number(sensitivity, 0.0001, 1000, 'Sensibilidade horizontal resultante');
  number(sensitivityY, 0.0001, 1000, 'Sensibilidade vertical resultante');
  const fovY = input.applyFov ? verticalFov(input.fov, input.fovType) : currentFovY;
  number(fovY, 20, 150, 'FOV vertical resultante');
  return { game: input.game, sensitivity, sensitivityY, verticalRatio: sensitivityY / sensitivity, dpi: targetDpi, cmX, cmY, fovY, fovX: horizontalFov(fovY), sourceYaw };
}
