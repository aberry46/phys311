export class EulerCromer {
  step(world, dt) {
    for (const b of world.bodies) {
      if (b.isStatic) continue;

      // Linear acceleration
      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;

      // Update linear velocity
      b.vel.x += b.acc.x * dt;
      b.vel.y += b.acc.y * dt;

      // Update position
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;

      // Angular acceleration
      const alpha = b.torque * b.invInertia;

      // Update angular velocity and angle
      b.omega += alpha * dt;
      b.angle += b.omega * dt;
    }
  }
}

export class VelocityVerlet {
  step(world, dt) {

    // First half-step
    for (const b of world.bodies) {
      if (b.isStatic) continue;

      // Linear acceleration
      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;

      // Half velocity update
      b.vel.x += 0.5 * dt * b.acc.x;
      b.vel.y += 0.5 * dt * b.acc.y;

      // Position update
      b.pos.x += dt * b.vel.x;

      b.pos.y += dt * b.vel.y;

      // Angular acceleration
      const alpha = b.torque * b.invInertia;

      // Half angular velocity update
      b.omega += 0.5 * dt * alpha;

      // Angle update
      b.angle += dt * b.omega;
    }

    // Recalculate forces at the new positions
    world.applyForces();

    // Second half-step
    for (const b of world.bodies) {
      if (b.isStatic) continue;

      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;

      b.vel.x += 0.5 * dt * b.acc.x;
      b.vel.y += 0.5 * dt * b.acc.y;

      const alpha = b.torque * b.invInertia;

      b.omega += 0.5 * dt * alpha;
    }
  }
}

export class Euler {
  step(world, dt) {
    for (const b of world.bodies) {
      if (b.isStatic) continue;

      // Linear acceleration
      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;

      // Position uses old velocity
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;

      // Velocity update
      b.vel.x += b.acc.x * dt;
      b.vel.y += b.acc.y * dt;

      // Angular acceleration
      const alpha = b.torque * b.invInertia;

      // Angle uses old angular velocity
      b.angle += b.omega * dt;

      // Angular velocity update
      b.omega += alpha * dt;
    }
  }
}

