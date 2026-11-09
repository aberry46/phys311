import { Vec2 } from './vec2.js';

let nextId = 0;

export class Body {
  constructor({ x = 0, y = 0, vx = 0, vy = 0, m = 1, radius = 0.2,
                isStatic = false, color = '#ff8200' } = {}) {
    if (m <= 0 || radius <= 0) throw new Error('Mass and radius must be positive');
    this.id = nextId++;
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(vx, vy);
    this.acc = new Vec2();
    this.force = new Vec2();
    this.m = m;
    this.radius = radius;
    this.isStatic = isStatic;
    this.color = color;
    this.trail = [];
  }
  get invMass() { return this.isStatic ? 0 : 1 / this.m; }
  clearForce() { this.force.x = 0; this.force.y = 0; }
  kineticEnergy() { return this.isStatic ? 0 : 0.5 * this.m * (this.vel.x ** 2 + this.vel.y ** 2); }
}