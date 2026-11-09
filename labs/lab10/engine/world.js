import { EulerCromer } from './integrators.js';
import { resolveCollisions } from './collisions.js';

export class World {
  constructor({ integrator = new EulerCromer(), bounds = null, restitution = 1,
                pairCollisions = true } = {}) {
    this.bodies = [];
    this.forces = [];
    this.integrator = integrator;
    this.bounds = bounds;
    this.restitution = restitution;
    this.pairCollisions = pairCollisions;
    this.jitterGuard = true;
    this.time = 0;
  }
  add(body) { this.bodies.push(body); return body; }
  addForce(force) { this.forces.push(force); return force; }
  applyForces() {
    for (const b of this.bodies) b.clearForce();
    for (const f of this.forces) f.apply(this);
  }
  step(dt) {
    this.applyForces();
    this.integrator.step(this, dt);
    resolveCollisions(this);
    this.time += dt;
  }
  totalEnergy() {
    let energy = this.bodies.reduce((sum, b) => sum + b.kineticEnergy(), 0);
    for (const f of this.forces) if (typeof f.potentialEnergy === 'function') energy += f.potentialEnergy(this);
    return energy;
  }
  totalMomentum() {
    let x = 0, y = 0;
    for (const b of this.bodies) {
      if (b.isStatic) continue;
      x += b.m * b.vel.x;
      y += b.m * b.vel.y;
    }
    return { x, y, magnitude: Math.hypot(x, y) };
  }
}
