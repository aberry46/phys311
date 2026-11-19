
import { EulerCromer } from './integrators.js';
import { resolveCollisions } from './collisions.js';

export class World {
  constructor({
    integrator = new EulerCromer(),
    bounds = null,
    restitution = 1,
    pairCollisions = true,
    contactIterations = 1
  } = {}) {

    this.bodies = [];
    this.forces = [];

    this.integrator = integrator;

    this.bounds = bounds;
    this.restitution = restitution;
    this.pairCollisions = pairCollisions;

    // Additional contact passes
    this.contactIterations = contactIterations;

    this.jitterGuard = true;

    this.time = 0;
  }

  // ========================================
  // ADD OBJECTS
  // ========================================

  add(body) {
    this.bodies.push(body);
    return body;
  }

  addForce(force) {
    this.forces.push(force);
    return force;
  }

  // ========================================
  // FORCE CALCULATIONS
  // ========================================

  applyForces() {
    for (const b of this.bodies) {
      b.clearForce();
    }

    for (const f of this.forces) {
      f.apply(this);
    }
  }

  // ========================================
  // PHYSICS TIMESTEP
  // ========================================

  step(dt) {

    // Apply forces
    this.applyForces();

    // Integrate translational and rotational motion
    this.integrator.step(this, dt);

    // Resolve collisions and resting contacts
    const iterations = Math.max(
      1,
      Math.floor(this.contactIterations)
    );

    for (let i = 0; i < iterations; i++) {
      resolveCollisions(this);
    }

    this.time += dt;
  }

  // ========================================
  // TOTAL MECHANICAL ENERGY
  // ========================================

  totalEnergy() {
    let energy = 0;

    // Translational and rotational KE
    for (const b of this.bodies) {
      energy += b.kineticEnergy();
    }

    // Potential energy from forces
    for (const f of this.forces) {
      if (
        typeof f.potentialEnergy === 'function'
      ) {
        energy += f.potentialEnergy(this);
      }
    }

    return energy;
  }

  // ========================================
  // TOTAL LINEAR MOMENTUM
  // ========================================

  totalMomentum() {
    let x = 0;
    let y = 0;

    for (const b of this.bodies) {
      if (b.isStatic) continue;

      x += b.m * b.vel.x;
      y += b.m * b.vel.y;
    }

    return {
      x,
      y,
      magnitude: Math.hypot(x, y)
    };
  }

  // ========================================
  // TOTAL ANGULAR MOMENTUM
  // ========================================

  totalAngularMomentum() {
    let L = 0;

    for (const b of this.bodies) {
      if (b.isStatic) continue;

      // Orbital angular momentum about origin
      const orbital =
        b.m * (
          b.pos.x * b.vel.y -
          b.pos.y * b.vel.x
        );

      // Rotational angular momentum about COM
      const spin =
        b.inertia * b.omega;

      L += orbital + spin;
    }

    return L;
  }

  // ========================================
  // TARGET STATUS
  // ========================================

  targetStatus() {
    const targets = this.bodies.filter(
      b => b.isTarget
    );

    const hit = targets.filter(
      b => b.isHit
    ).length;

    return {
      total: targets.length,
      hit,
      remaining: targets.length - hit,
      complete:
        targets.length > 0 &&
        hit === targets.length
    };
  }
}
