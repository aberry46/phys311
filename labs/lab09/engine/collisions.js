export function resolvePair(a, b, e = 1, jitterGuard = true) {
  const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
  const r = a.radius + b.radius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= r * r) return false;

  // If centers coincide, choose a repeatable normal.
  const dist = Math.sqrt(distSq);
  const nx = dist > 1e-12 ? dx / dist : 1;
  const ny = dist > 1e-12 ? dy / dist : 0;
  const sumInv = a.invMass + b.invMass;
  if (sumInv === 0) return false;

  // Correct interpenetration by inverse-mass weighting.
  const overlap = r - dist;
  const ca = overlap * a.invMass / sumInv;
  const cb = overlap * b.invMass / sumInv;
  a.pos.x -= nx * ca; a.pos.y -= ny * ca;
  b.pos.x += nx * cb; b.pos.y += ny * cb;

  const relVx = b.vel.x - a.vel.x, relVy = b.vel.y - a.vel.y;
  const vn = relVx * nx + relVy * ny;
  if (jitterGuard && vn >= 0) return true;

  const J = -(1 + e) * vn / sumInv;
  a.vel.x -= J * a.invMass * nx;
  a.vel.y -= J * a.invMass * ny;
  b.vel.x += J * b.invMass * nx;
  b.vel.y += J * b.invMass * ny;
  return true;
}

export function resolveWalls(b, bounds, e = 1) {
  if (b.isStatic || !bounds) return;
  const { xMin, xMax, yMin, yMax } = bounds;
  if (b.pos.x - b.radius < xMin) {
    b.pos.x = xMin + b.radius;
    if (b.vel.x < 0) b.vel.x *= -e;
  }
  if (b.pos.x + b.radius > xMax) {
    b.pos.x = xMax - b.radius;
    if (b.vel.x > 0) b.vel.x *= -e;
  }
  if (b.pos.y - b.radius < yMin) {
    b.pos.y = yMin + b.radius;
    if (b.vel.y < 0) b.vel.y *= -e;
  }
  if (b.pos.y + b.radius > yMax) {
    b.pos.y = yMax - b.radius;
    if (b.vel.y > 0) b.vel.y *= -e;
  }
}

export function resolveCollisions(world) {
  for (const b of world.bodies) resolveWalls(b, world.bounds, world.restitution);
  if (!world.pairCollisions) return;
  for (let i = 0; i < world.bodies.length; i++) {
    for (let j = i + 1; j < world.bodies.length; j++) {
      resolvePair(world.bodies[i], world.bodies[j], world.restitution, world.jitterGuard);
    }
  }
}