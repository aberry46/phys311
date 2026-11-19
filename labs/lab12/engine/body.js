import { Vec2 } from './vec2.js';

let nextId = 0;

export class Body {
  constructor({
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    m = 1,
    radius = 0.2,
    width = 1,
    height = 1,
    shape = 'circle',
    angle = 0,
    omega = 0,
    isStatic = false,
    color = '#ff8200',
    isTarget = false
  } = {}) {

    if (m <= 0 || radius <= 0) {
      throw new Error('Mass and radius must be positive');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive');
    }

    this.id = nextId++;

    // Position and translational motion
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(vx, vy);
    this.acc = new Vec2();
    this.force = new Vec2();

    // Basic properties
    this.m = m;
    this.radius = radius;
    this.isStatic = isStatic;
    this.color = color;
    this.trail = [];

    // Shape properties
    this.shape = shape;
    this.width = width;
    this.height = height;

    // Rotational motion
    this.angle = angle;
    this.omega = omega;
    this.torque = 0;

    // Target identification
    this.isTarget = isTarget;

    // Moment of inertia
    if (shape === 'rectangle') {
      this.inertia = (m / 12) *
        (width ** 2 + height ** 2);
    } else {
      this.inertia = 0.5 * m * radius ** 2;
    }
  }

  // Inverse mass
  get invMass() {
    return this.isStatic ? 0 : 1 / this.m;
  }

  // Inverse moment of inertia
  get invInertia() {
    return this.isStatic ? 0 : 1 / this.inertia;
  }

  // Clear forces and torque
  clearForce() {
    this.force.x = 0;
    this.force.y = 0;
    this.torque = 0;
  }

  // Apply a force at an offset from the center
  applyForce(fx, fy, rx = 0, ry = 0) {
    if (this.isStatic) return;

    this.force.x += fx;
    this.force.y += fy;

    // Torque = r x F
    this.torque += rx * fy - ry * fx;
  }

  // Apply an instantaneous impulse
  applyImpulse(jx, jy, rx = 0, ry = 0) {
    if (this.isStatic) return;

    this.vel.x += jx * this.invMass;
    this.vel.y += jy * this.invMass;

    // Angular impulse
    this.omega +=
      (rx * jy - ry * jx) * this.invInertia;
  }

  // Translational and rotational kinetic energy
  kineticEnergy() {
    if (this.isStatic) return 0;

    const translational =
      0.5 * this.m *
      (this.vel.x ** 2 + this.vel.y ** 2);

    const rotational =
      0.5 * this.inertia * this.omega ** 2;

    return translational + rotational;
  }

  // Angular momentum about the center of mass
  angularMomentum() {
    return this.inertia * this.omega;
  }
}
