export class HUD {
  constructor(element) { this.element = element; this.initialEnergy = null; }
  reset(world) { this.initialEnergy = world.totalEnergy(); }
  update(world, fps, physicsMs, renderMs) {
    if (this.initialEnergy === null) this.reset(world);
    const E = world.totalEnergy();
    const p = world.totalMomentum();
    const drift = Math.abs(this.initialEnergy) > 1e-12
      ? 100 * (E - this.initialEnergy) / Math.abs(this.initialEnergy) : 0;
    this.element.textContent = [
      `t = ${world.time.toFixed(2)} s   Bodies = ${world.bodies.length}`,
      `E = ${E.toFixed(5)} J`,
      `Energy drift = ${drift.toFixed(4)}%`,
      `p = (${p.x.toFixed(4)}, ${p.y.toFixed(4)}) kg m/s`,
      `|p| = ${p.magnitude.toFixed(5)} kg m/s`,
      `fps = ${fps.toFixed(0)}`,
      `Physics = ${physicsMs.toFixed(2)} ms   Render = ${renderMs.toFixed(2)} ms`
    ].join('\n');
    this.element.style.color = Math.abs(drift) > 1 ? '#f87171' : '#d1fae5';
  }
}