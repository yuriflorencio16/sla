// JavaScript / public/practice.js / browser and Node.js / local training without wallet operations
export class PracticeSession {
  constructor({ mode = 'precision', radius = 28, duration = 60000 } = {}, now = 0, random = Math.random) {
    this.mode = ['precision', 'flick', 'tracking'].includes(mode) ? mode : 'precision';
    this.radius = Math.max(12, Math.min(48, Number(radius) || 28));
    this.duration = [0, 30000, 60000].includes(duration) ? duration : 60000;
    this.random = random; this.started = now; this.last = now; this.finishedAt = null; this.active = true;
    this.hits = 0; this.shots = 0; this.streak = 0; this.bestStreak = 0; this.reactionTotal = 0; this.onTargetMs = 0; this.trackedMs = 0;
    this.targets = Array.from({ length: this.mode === 'precision' ? 3 : 1 }, (_, id) => this.target(id, now));
  }
  target(id, now) {
    let x = 500, y = 300;
    for (let attempt = 0; attempt < 20; attempt++) {
      x = 90 + this.random() * 820; y = 95 + this.random() * 380;
      if (!(this.targets ?? []).some(t => t.id !== id && Math.hypot(t.x - x, t.y - y) < this.radius * 2 + 24)) break;
    }
    return { id, x, y, r: this.radius, born: now };
  }
  tick(now, cursor = null) {
    if (!this.active) return;
    const end = this.duration ? Math.min(now, this.started + this.duration) : now;
    const delta = Math.max(0, Math.min(100, end - this.last));
    if (this.mode === 'tracking') {
      const time = (end - this.started) / 1000, t = this.targets[0];
      t.x = 500 + Math.sin(time * 1.2) * 310; t.y = 285 + Math.sin(time * 1.9) * 130;
      this.trackedMs += delta;
      if (cursor && Math.hypot(cursor[0] - t.x, cursor[1] - t.y) <= t.r) this.onTargetMs += delta;
    }
    this.last = end;
    if (this.duration && now >= this.started + this.duration) this.finish(end);
  }
  shoot(x, y, now) {
    this.tick(now);
    if (!this.active) return null;
    this.shots++;
    const index = this.targets.findIndex(t => Math.hypot(t.x - x, t.y - y) <= t.r);
    if (index < 0) { this.streak = 0; return false; }
    const t = this.targets[index]; this.hits++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); this.reactionTotal += Math.max(0, now - t.born);
    if (this.mode !== 'tracking') this.targets[index] = this.target(t.id, now);
    else t.born = now;
    return true;
  }
  finish(now) { this.active = false; this.finishedAt = now; }
  stats(now) {
    const elapsed = Math.max(0, (this.finishedAt ?? now) - this.started);
    return { accuracy: this.shots ? Math.round(this.hits / this.shots * 100) : 0, reaction: this.hits ? Math.round(this.reactionTotal / this.hits) : 0, tracking: this.trackedMs ? Math.round(this.onTargetMs / this.trackedMs * 100) : 0, elapsed, remaining: this.duration ? Math.max(0, this.duration - elapsed) : null };
  }
}
