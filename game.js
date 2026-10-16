// JavaScript / game.js / Node.js 24+ and browser / AimRush demo rules
export const RULES = Object.freeze({ duration: 30000, count: 30, interval: 1000, lifetime: 950, entry: 100, minEntry: 100, maxEntry: 10000, hit: 6, miss: 4, error: 2, width: 1000, height: 600 });
export const stake = g => g.entry ?? RULES.entry;
export const scaled = (g, amount) => Math.round(amount * stake(g) / 100);
export function maximumPayout(entry) {
  let reward = 0;
  for (let i = 1; i <= RULES.count; i++) reward += scaled({ entry }, RULES.hit + Math.min(10, Math.floor(i / 5) * 2));
  return entry + reward;
}
export function createGame(seed, entry = RULES.entry) {
  if (!Number.isInteger(entry) || entry < RULES.minEntry || entry > RULES.maxEntry) throw Error('A entrada deve ficar entre R$ 1,00 e R$ 100,00.');
  let rng = seed >>> 0;
  const random = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  return { entry, targets: Array.from({ length: RULES.count }, (_, id) => ({ id, x: 70 + random() * 860, y: 65 + random() * 470, r: 25 + random() * 9, at: id * RULES.interval })), resolved: [], errors: [], hits: 0, misses: 0, streak: 0, bestStreak: 0, reward: 0, penalty: 0, reactionTotal: 0 };
}
export function advance(g, elapsed) {
  for (const t of g.targets) if (!g.resolved.includes(t.id) && elapsed >= t.at + RULES.lifetime) {
    g.resolved.push(t.id); g.misses++; g.streak = 0; g.penalty += scaled(g, RULES.miss);
  }
  return g;
}
export function shoot(g, elapsed, id, x, y) {
  if (!Number.isInteger(id) || id < 0 || id >= RULES.count || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > RULES.width || y < 0 || y > RULES.height) throw Error('Tiro inválido.');
  const t = g.targets[id];
  if (elapsed < t.at || elapsed >= t.at + RULES.lifetime || g.resolved.includes(id)) throw Error('Este alvo não está mais disponível.');
  const hit = (x - t.x) ** 2 + (y - t.y) ** 2 <= t.r ** 2;
  if (hit) {
    g.resolved.push(id); g.hits++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
    const bonus = Math.min(10, Math.floor(g.streak / 5) * 2), credits = scaled(g, RULES.hit + bonus);
    g.reward += credits; g.reactionTotal += elapsed - t.at;
    return { hit: true, credits, streak: g.streak };
  }
  if (g.errors.includes(id)) throw Error('A penalidade por tiro fora já foi aplicada a este alvo.');
  g.errors.push(id); const penalty = scaled(g, RULES.error); g.penalty += penalty; g.streak = 0;
  return { hit: false, credits: -penalty, streak: 0 };
}
export function result(g) {
  return { payout: Math.max(0, stake(g) + g.reward - g.penalty), net: Math.max(-stake(g), g.reward - g.penalty), accuracy: g.hits + g.errors.length ? Math.round(g.hits / (g.hits + g.errors.length) * 100) : 0, coverage: Math.round(g.hits / RULES.count * 100), reaction: g.hits ? Math.round(g.reactionTotal / g.hits) : 0 };
}
