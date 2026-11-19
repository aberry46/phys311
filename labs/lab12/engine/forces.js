export class Gravity {
  constructor(g = 9.81) { this.g = g; }
  apply(world) {
    for (const b of world.bodies) if (!b.isStatic) b.force.y -= b.m * this.g;
  }
  potentialEnergy(world) {
    return world.bodies.reduce((sum, b) => sum + (b.isStatic ? 0 : b.m * this.g * b.pos.y), 0);
  }
}

export class Drag {
  constructor(c = 0.1) { this.c = c; }
  apply(world) {
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      const speed = Math.hypot(b.vel.x, b.vel.y);
      b.force.x -= this.c * speed * b.vel.x;
      b.force.y -= this.c * speed * b.vel.y;
    }
  }
}

export class NewtonGravity {
  constructor(G = 1, softening = 0.1) { this.G = G; this.eps = softening; }
  apply(world) {
    const bs = world.bodies;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
      const r2 = dx * dx + dy * dy + this.eps ** 2;
      const factor = this.G * a.m * b.m / (r2 * Math.sqrt(r2));
      if (!a.isStatic) { a.force.x += factor * dx; a.force.y += factor * dy; }
      if (!b.isStatic) { b.force.x -= factor * dx; b.force.y -= factor * dy; }
    }
  }
  potentialEnergy(world) {
    let energy = 0;
    const bs = world.bodies;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const dx = bs[j].pos.x - bs[i].pos.x, dy = bs[j].pos.y - bs[i].pos.y;
      energy -= this.G * bs[i].m * bs[j].m / Math.sqrt(dx * dx + dy * dy + this.eps ** 2);
    }
    return energy;
  }
}

// One spring force joins two bodies. A static body can serve as an anchor.
export class Spring {
  constructor(a, b, k = 10, restLength = 1) {
    this.a = a; this.b = b; this.k = k; this.restLength = restLength;
  }
  apply() {
    const dx = this.b.pos.x - this.a.pos.x, dy = this.b.pos.y - this.a.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-12) return;
    const magnitude = this.k * (dist - this.restLength) / dist;
    if (!this.a.isStatic) { this.a.force.x += magnitude * dx; this.a.force.y += magnitude * dy; }
    if (!this.b.isStatic) { this.b.force.x -= magnitude * dx; this.b.force.y -= magnitude * dy; }
  }
  potentialEnergy() {
    const d = Math.hypot(this.b.pos.x - this.a.pos.x, this.b.pos.y - this.a.pos.y);
    return 0.5 * this.k * (d - this.restLength) ** 2;
  }
}