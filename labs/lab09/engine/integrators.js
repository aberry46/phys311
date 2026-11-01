export class EulerCromer {
  step(world, dt) {
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;
      b.vel.x += b.acc.x * dt;
      b.vel.y += b.acc.y * dt;
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
    }
  }
}

export class VelocityVerlet {
  step(world, dt) {
    // Half kick, drift, force update, second half kick.
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;
      b.vel.x += 0.5 * dt * b.acc.x;
      b.vel.y += 0.5 * dt * b.acc.y;
      b.pos.x += dt * b.vel.x;
      b.pos.y += dt * b.vel.y;
    }
    world.applyForces();
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      b.acc.x = b.force.x / b.m;
      b.acc.y = b.force.y / b.m;
      b.vel.x += 0.5 * dt * b.acc.x;
      b.vel.y += 0.5 * dt * b.acc.y;
    }
  }
}
