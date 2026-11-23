
import { EulerCromer } from './integrators.js';
import { resolveCollisions } from './collisions.js';

import {
  Gravity,
  NewtonGravity,
  Spring
} from './forces.js';

// ==========================================
// WORLD AND PHYSICS INSTRUMENTATION
// ==========================================

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

    this.contactIterations = contactIterations;

    this.jitterGuard = true;

    this.time = 0;

    // ======================================
    // DEBUG INSTRUMENTATION
    // ======================================

    this.stepCount = 0;

    this.contactsThisStep = 0;
    this.totalContacts = 0;
    this.peakContacts = 0;

    this.maxSpeed = 0;
    this.maxAngularSpeed = 0;

    this.lastDT = 0;

    // ======================================
    // CONSERVATIVE TEST MODE
    // ======================================

    const params = new URLSearchParams(

      typeof window !== 'undefined'
        ? window.location.search
        : ''

    );

    this.conservativeMode =

      params.get('conservative') === '1';
  }

  // ========================================
  // CONSERVATIVE MODE CONTROL
  // ========================================

  setConservativeMode(enabled) {

    this.conservativeMode = Boolean(enabled);
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
  // CONSERVATIVE FORCE CHECK
  // ========================================

  isConservativeForce(force) {

    return (

      force instanceof Gravity ||

      force instanceof NewtonGravity ||

      force instanceof Spring

    );
  }

  forceEnabled(force) {

    if (!this.conservativeMode) {

      return true;
    }

    return this.isConservativeForce(force);
  }

  // ========================================
  // FORCE CALCULATIONS
  // ========================================

  applyForces() {

    // Clear accumulated forces.

    for (const body of this.bodies) {

      body.clearForce();
    }

    // Apply active forces.

    for (const force of this.forces) {

      if (!this.forceEnabled(force)) {

        continue;
      }

      force.apply(this);
    }
  }

  // ========================================
  // CONTACT INSTRUMENTATION
  // ========================================

  recordContact(count = 1) {

    this.contactsThisStep += count;
  }

  // ========================================
  // PHYSICS TIMESTEP
  // ========================================

  step(dt) {

    this.contactsThisStep = 0;

    this.lastDT = dt;

    // Apply forces.

    this.applyForces();

    // Integrate body motion.

    this.integrator.step(this, dt);

    // Resolve collisions.

    const iterations = Math.max(

      1,

      Math.floor(this.contactIterations)

    );

    let collisionEnergyChange = 0;
    let collisionKineticChange = 0;
    let collisionPotentialChange = 0;

    for (let i = 0; i < iterations; i++) {

      const kineticBefore =
        this.totalTranslationalEnergy() +
        this.totalRotationalEnergy();

      const potentialBefore =
        this.totalPotentialEnergy();

      resolveCollisions(this);

      const kineticAfter =
        this.totalTranslationalEnergy() +
        this.totalRotationalEnergy();

      const potentialAfter =
        this.totalPotentialEnergy();

      collisionKineticChange +=
        kineticAfter - kineticBefore;

      collisionPotentialChange +=
        potentialAfter - potentialBefore;
    }

    collisionEnergyChange =
      collisionKineticChange +
      collisionPotentialChange;

    this.lastCollisionEnergyChange =
      collisionEnergyChange;

    this.lastCollisionKineticChange =
      collisionKineticChange;

    this.lastCollisionPotentialChange =
      collisionPotentialChange;

    // Update collision diagnostics.

    this.totalContacts +=

      this.contactsThisStep;

    this.peakContacts = Math.max(

      this.peakContacts,

      this.contactsThisStep

    );

    this.updateMeasurements();

    // Advance simulation time.

    this.time += dt;

    this.stepCount++;
  }

  // ========================================
  // VELOCITY DIAGNOSTICS
  // ========================================

  updateMeasurements() {

    let maxSpeed = 0;

    let maxAngularSpeed = 0;

    for (const body of this.bodies) {

      if (body.isStatic) continue;

      const speed = Math.hypot(

        body.vel.x,

        body.vel.y

      );

      const angularSpeed = Math.abs(

        body.omega ?? 0

      );

      maxSpeed = Math.max(

        maxSpeed,

        speed

      );

      maxAngularSpeed = Math.max(

        maxAngularSpeed,

        angularSpeed

      );
    }

    this.maxSpeed = maxSpeed;

    this.maxAngularSpeed =

      maxAngularSpeed;
  }

  // ========================================
  // TRANSLATIONAL KINETIC ENERGY
  // ========================================

  totalTranslationalEnergy() {

    let energy = 0;

    for (const body of this.bodies) {

      if (body.isStatic) continue;

      energy +=

        0.5 *

        body.m *

        (

          body.vel.x ** 2 +

          body.vel.y ** 2

        );
    }

    return energy;
  }

  // ========================================
  // ROTATIONAL KINETIC ENERGY
  // ========================================

  totalRotationalEnergy() {

    let energy = 0;

    for (const body of this.bodies) {

      if (body.isStatic) continue;

      energy +=

        0.5 *

        body.inertia *

        body.omega ** 2;
    }

    return energy;
  }

  // ========================================
  // POTENTIAL ENERGY
  // ========================================

  totalPotentialEnergy() {

    let energy = 0;

    for (const force of this.forces) {

      if (!this.forceEnabled(force)) {

        continue;
      }

      if (

        typeof force.potentialEnergy !==
        'function'

      ) {

        continue;
      }

      // Reference gravitational potential
      // energy to the ground when present.

      if (

        force instanceof Gravity &&

        Number.isFinite(this.groundY)

      ) {

        for (const body of this.bodies) {

          if (body.isStatic) continue;

          energy +=

            body.m *

            force.g *

            (body.pos.y - this.groundY);
        }

      } else {

        energy +=

          force.potentialEnergy(this);
      }
    }

    return energy;
  }

  // ========================================
  // TOTAL MECHANICAL ENERGY
  // ========================================

  totalEnergy() {

    return (

      this.totalTranslationalEnergy() +

      this.totalRotationalEnergy() +

      this.totalPotentialEnergy()

    );
  }

  // ========================================
  // TOTAL LINEAR MOMENTUM
  // ========================================

  totalMomentum() {

    let x = 0;

    let y = 0;

    for (const body of this.bodies) {

      if (body.isStatic) continue;

      x += body.m * body.vel.x;

      y += body.m * body.vel.y;
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

    for (const body of this.bodies) {

      if (body.isStatic) continue;

      // Orbital angular momentum.

      const orbital =

        body.m *

        (

          body.pos.x * body.vel.y -

          body.pos.y * body.vel.x

        );

      // Rotational angular momentum.

      const spin =

        body.inertia *

        body.omega;

      L += orbital + spin;
    }

    return L;
  }

  // ========================================
  // PHYSICS DIAGNOSTIC SNAPSHOT
  // ========================================

  diagnostics() {

    return {

      time: this.time,

      timestep: this.lastDT,

      stepCount: this.stepCount,

      bodyCount: this.bodies.length,

      dynamicBodies:

        this.bodies.filter(

          body => !body.isStatic

        ).length,

      energy:

        this.totalEnergy(),

      translationalEnergy:

        this.totalTranslationalEnergy(),

      rotationalEnergy:

        this.totalRotationalEnergy(),

      potentialEnergy:

        this.totalPotentialEnergy(),

      momentum:

        this.totalMomentum(),

      angularMomentum:

        this.totalAngularMomentum(),

      contactsThisStep:

        this.contactsThisStep,

      totalContacts:

        this.totalContacts,

      peakContacts:

        this.peakContacts,

      maxSpeed:

        this.maxSpeed,

      maxAngularSpeed:

        this.maxAngularSpeed,

      contactIterations:

        this.contactIterations,

      restitution:

        this.conservativeMode

          ? 1

          : this.restitution,

      conservativeMode:

        this.conservativeMode

    };
  }

  // ========================================
  // TARGET STATUS
  // ========================================

  targetStatus() {

    const targets = this.bodies.filter(

      body => body.isTarget

    );

    const hit = targets.filter(

      body => body.isHit

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
