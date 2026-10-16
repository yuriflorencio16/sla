// JavaScript / public/format.js / browser and Node.js / simulated BRL display
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function money(cents, signed = false) {
  return (signed && cents > 0 ? '+' : '') + brl.format(cents / 100);
}
export function ledgerLabel(label) {
  if (label === 'Welcome demo credits') return 'Saldo inicial de demonstração';
  if (label === 'Free demo refill') return 'Recarga virtual gratuita';
  if (label === 'Round entry · refundable stake') return 'Entrada na partida';
  const settled = label.match(/^Round settled · (\d+)\/(\d+) hits$/);
  return settled ? `Resultado da partida · ${settled[1]}/${settled[2]} acertos` : label;
}

export function parseEntry(text) {
  const value = text.trim();
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(value)) return null;
  const [whole, decimal = ''] = value.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return cents >= 100 && cents <= 10000 ? cents : null;
}
