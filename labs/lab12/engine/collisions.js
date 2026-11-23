
//
// PHYS 311 - Slingshot Destruction
// Collision Physics and Instrumentation
//

// ==========================================
// VECTOR HELPERS
// ==========================================

const dot = (a, b) =>
  a.x * b.x + a.y * b.y;

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

function recordContact(world) {

  if (
    world &&
    typeof world.recordContact === 'function'
  ) {
    world.recordContact();
  }
}

// ==========================================
// CIRCLE-CIRCLE COLLISIONS
// ==========================================

export function resolvePair(

  a,
  b,
  e = 1,
  jitterGuard = true,
  world = null

) {

  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;

  const r = a.radius + b.radius;

  const distSq = dx * dx + dy * dy;

  if (distSq >= r * r) return false;

  const dist = Math.sqrt(distSq);

  const nx = dist > 1e-12 ? dx / dist : 1;
  const ny = dist > 1e-12 ? dy / dist : 0;

  const invMassSum =
    a.invMass + b.invMass;

  if (invMassSum === 0) return false;

  // Correct overlap

  const overlap = r - dist;

  a.pos.x -=
    nx * overlap * a.invMass / invMassSum;

  a.pos.y -=
    ny * overlap * a.invMass / invMassSum;

  b.pos.x +=
    nx * overlap * b.invMass / invMassSum;

  b.pos.y +=
    ny * overlap * b.invMass / invMassSum;

  // Relative normal velocity

  const rvx = b.vel.x - a.vel.x;
  const rvy = b.vel.y - a.vel.y;

  const vn = rvx * nx + rvy * ny;

  if (jitterGuard && vn >= 0) return true;

  // Collision impulse

  const J =
    -(1 + e) * vn / invMassSum;

  a.vel.x -= J * a.invMass * nx;
  a.vel.y -= J * a.invMass * ny;

  b.vel.x += J * b.invMass * nx;
  b.vel.y += J * b.invMass * ny;

  if (Math.abs(J) > 1e-12) {
    recordContact(world);
  }

  return true;
}

// ==========================================
// RECTANGLE GEOMETRY
// ==========================================

function rectangleVertices(b) {

  const c = Math.cos(b.angle);
  const s = Math.sin(b.angle);

  const hw = b.width / 2;
  const hh = b.height / 2;

  const corners = [

    [-hw, -hh],
    [ hw, -hh],
    [ hw,  hh],
    [-hw,  hh]

  ];

  return corners.map(([x, y]) => ({

    x: b.pos.x + c * x - s * y,

    y: b.pos.y + s * x + c * y

  }));
}

function projectVertices(vertices, axis) {

  const values = vertices.map(
    v => dot(v, axis)
  );

  return {

    min: Math.min(...values),

    max: Math.max(...values)

  };
}

// ==========================================
// CONTACT-POINT VELOCITY
// ==========================================

function contactVelocity(body, rx, ry) {

  return {

    x: body.vel.x - body.omega * ry,

    y: body.vel.y + body.omega * rx

  };
}

// ==========================================
// GENERAL RIGID-BODY IMPULSE
// ==========================================

function applyContactImpulse(

  a,
  b,
  contact,
  normal,
  restitution,
  friction = 0,
  world = null

) {

  const conservative =
    world?.conservativeMode === true;

  const rax = contact.x - a.pos.x;
  const ray = contact.y - a.pos.y;

  const rbx = contact.x - b.pos.x;
  const rby = contact.y - b.pos.y;

  const va = contactVelocity(a, rax, ray);
  const vb = contactVelocity(b, rbx, rby);

  const rv = {

    x: vb.x - va.x,

    y: vb.y - va.y

  };

  const vn = dot(rv, normal);

  // Never apply impulses when separating.

  if (vn >= 0) return 0;

  const raCrossN =
    rax * normal.y - ray * normal.x;

  const rbCrossN =
    rbx * normal.y - rby * normal.x;

  const denominator =

    a.invMass +

    b.invMass +

    raCrossN ** 2 * a.invInertia +

    rbCrossN ** 2 * b.invInertia;

  if (denominator <= 0) return 0;

  // ========================================
  // RESTITUTION
  // ========================================

  const e = conservative

    ? 1

    : Math.abs(vn) < 0.5

      ? 0

      : restitution;

  const J =
    -(1 + e) * vn / denominator;

  const jx = J * normal.x;
  const jy = J * normal.y;

  a.applyImpulse(
    -jx,
    -jy,
    rax,
    ray
  );

  b.applyImpulse(
    jx,
    jy,
    rbx,
    rby
  );

  if (Math.abs(J) > 1e-12) {
    recordContact(world);
  }

  // ========================================
  // FRICTION IMPULSE
  // ========================================

  const mu = conservative ? 0 : friction;

  if (mu > 0 && J > 0) {

    const va2 =
      contactVelocity(a, rax, ray);

    const vb2 =
      contactVelocity(b, rbx, rby);

    const rv2 = {

      x: vb2.x - va2.x,

      y: vb2.y - va2.y

    };

    const tangent = {

      x: -normal.y,

      y: normal.x

    };

    const vt = dot(rv2, tangent);

    const raCrossT =
      rax * tangent.y -
      ray * tangent.x;

    const rbCrossT =
      rbx * tangent.y -
      rby * tangent.x;

    const tangentDenominator =

      a.invMass +

      b.invMass +

      raCrossT ** 2 * a.invInertia +

      rbCrossT ** 2 * b.invInertia;

    if (tangentDenominator > 0) {

      const desiredJt =
        -vt / tangentDenominator;

      const Jt = clamp(

        desiredJt,

        -mu * J,

        mu * J

      );

      a.applyImpulse(

        -Jt * tangent.x,

        -Jt * tangent.y,

        rax,

        ray

      );

      b.applyImpulse(

        Jt * tangent.x,

        Jt * tangent.y,

        rbx,

        rby

      );
    }
  }

  return J;
}

// ==========================================
// CIRCLE-RECTANGLE COLLISIONS
// ==========================================

export function resolveCircleRectangle(

  circle,
  block,
  e = 0.35,
  world = null

) {

  const dx = circle.pos.x - block.pos.x;
  const dy = circle.pos.y - block.pos.y;

  const c = Math.cos(block.angle);
  const s = Math.sin(block.angle);

  const localX = c * dx + s * dy;
  const localY = -s * dx + c * dy;

  const hw = block.width / 2;
  const hh = block.height / 2;

  let closestX = clamp(localX, -hw, hw);
  let closestY = clamp(localY, -hh, hh);

  let nxLocal = localX - closestX;
  let nyLocal = localY - closestY;

  const distSq =

    nxLocal * nxLocal +

    nyLocal * nyLocal;

  if (distSq > circle.radius ** 2) {
    return false;
  }

  let penetration;

  if (distSq > 1e-12) {

    const dist = Math.sqrt(distSq);

    nxLocal /= dist;
    nyLocal /= dist;

    penetration = circle.radius - dist;

  } else {

    // Circle center inside rectangle

    const gapX = hw - Math.abs(localX);
    const gapY = hh - Math.abs(localY);

    if (gapX < gapY) {

      nxLocal = localX >= 0 ? 1 : -1;
      nyLocal = 0;

      closestX = nxLocal * hw;
      closestY = localY;

      penetration =
        circle.radius + gapX;

    } else {

      nxLocal = 0;
      nyLocal = localY >= 0 ? 1 : -1;

      closestX = localX;
      closestY = nyLocal * hh;

      penetration =
        circle.radius + gapY;
    }
  }

  // Normal points from block to circle.

  const nx =
    c * nxLocal - s * nyLocal;

  const ny =
    s * nxLocal + c * nyLocal;

  const contact = {

    x: block.pos.x +
      c * closestX -
      s * closestY,

    y: block.pos.y +
      s * closestX +
      c * closestY

  };

  const invMassSum =
    circle.invMass + block.invMass;

  if (invMassSum <= 0) return false;

  // Positional correction

  const correction = Math.max(

    0,

    penetration - 0.0001

  );

  circle.pos.x +=

    nx * correction *
    circle.invMass / invMassSum;

  circle.pos.y +=

    ny * correction *
    circle.invMass / invMassSum;

  block.pos.x -=

    nx * correction *
    block.invMass / invMassSum;

  block.pos.y -=

    ny * correction *
    block.invMass / invMassSum;

  applyContactImpulse(

    block,

    circle,

    contact,

    { x: nx, y: ny },

    e,

    0.25,

    world

  );

  return true;
}

// ==========================================
// POLYGON CLIPPING
// ==========================================

function clipPolygon(subject, clipper) {

  let output = subject.map(
    p => ({ ...p })
  );

  for (
    let i = 0;
    i < clipper.length;
    i++
  ) {

    const A = clipper[i];

    const B =
      clipper[(i + 1) % clipper.length];

    const ex = B.x - A.x;
    const ey = B.y - A.y;

    const signedDistance = p =>

      ex * (p.y - A.y) -

      ey * (p.x - A.x);

    const input = output;

    output = [];

    if (input.length === 0) break;

    for (
      let j = 0;
      j < input.length;
      j++
    ) {

      const current = input[j];

      const previous =

        input[
          (j + input.length - 1) %
          input.length
        ];

      const dc = signedDistance(current);
      const dp = signedDistance(previous);

      const currentInside = dc >= -1e-10;
      const previousInside = dp >= -1e-10;

      if (
        currentInside !== previousInside
      ) {

        const fraction = dp / (dp - dc);

        output.push({

          x: previous.x +
            fraction *
            (current.x - previous.x),

          y: previous.y +
            fraction *
            (current.y - previous.y)

        });
      }

      if (currentInside) {

        output.push(current);
      }
    }
  }

  return output;
}

// ==========================================
// RECTANGLE-RECTANGLE COLLISIONS
// ==========================================

export function resolveRectangleRectangle(

  a,
  b,
  e = 0.25,
  world = null

) {

  if (a.isStatic && b.isStatic) {
    return false;
  }

  const va = rectangleVertices(a);
  const vb = rectangleVertices(b);

  const axes = [];

  for (const body of [a, b]) {

    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);

    axes.push({ x: c, y: s });

    axes.push({ x: -s, y: c });
  }

  let minOverlap = Infinity;
  let normal = null;

  // ========================================
  // SEPARATING AXIS THEOREM
  // ========================================

  for (const axis of axes) {

    const pa = projectVertices(va, axis);
    const pb = projectVertices(vb, axis);

    const overlap = Math.min(

      pa.max - pb.min,

      pb.max - pa.min

    );

    if (overlap <= 0) return false;

    if (overlap < minOverlap) {

      minOverlap = overlap;

      normal = { ...axis };
    }
  }

  // Normal from A toward B.

  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;

  if (
    dx * normal.x +
    dy * normal.y < 0
  ) {

    normal.x *= -1;
    normal.y *= -1;
  }

  const invMassSum =
    a.invMass + b.invMass;

  if (invMassSum <= 0) return false;

  // ========================================
  // CONTACT MANIFOLD
  // ========================================

  const polygon = clipPolygon(va, vb);

  if (polygon.length === 0) {
    return false;
  }

  const tangent = {

    x: -normal.y,

    y: normal.x

  };

  polygon.sort(

    (p, q) =>
      dot(p, tangent) -
      dot(q, tangent)

  );

  const first = polygon[0];

  const last =
    polygon[polygon.length - 1];

  const contacts = [first];

  if (

    Math.hypot(

      last.x - first.x,

      last.y - first.y

    ) > 0.01

  ) {

    contacts.push(last);
  }

  // ========================================
  // SOLVE CONTACT IMPULSES
  // ========================================

  for (const contact of contacts) {

    applyContactImpulse(

      a,

      b,

      contact,

      normal,

      e,

      0.5,

      world

    );
  }

  // ========================================
  // POSITIONAL CORRECTION
  // ========================================

  const conservative =
    world?.conservativeMode === true;

  const slop = conservative ? 0.002 : 0.001;

  const percent = conservative ? 0.25 : 0.5;

  const correction =

    percent *

    Math.max(0, minOverlap - slop) /

    invMassSum;

  a.pos.x -=

    correction *
    a.invMass *
    normal.x;

  a.pos.y -=

    correction *
    a.invMass *
    normal.y;

  b.pos.x +=

    correction *
    b.invMass *
    normal.x;

  b.pos.y +=

    correction *
    b.invMass *
    normal.y;

  return true;
}

// ==========================================
// GROUND COLLISIONS
// ==========================================

export function resolveGround(

  body,
  groundY,
  e = 0.2,
  world = null

) {

  if (body.isStatic) return false;

  const conservative =
    world?.conservativeMode === true;

  // ========================================
  // CIRCLE-GROUND
  // ========================================

  if (body.shape === 'circle') {

    const bottom =
      body.pos.y - body.radius;

    if (bottom >= groundY) {
      return false;
    }

    const penetration = groundY - bottom;

    // Allow a small tolerance in conservative mode.
    // Normal gameplay retains full correction.
    const slop = conservative ? 0.0005 : 0;

    body.pos.y += Math.max(
      0,
      penetration - slop
    );

    if (body.vel.y < 0) {

      const restitution = conservative

        ? 1

        : Math.abs(body.vel.y) < 0.5

          ? 0

          : e;

      body.vel.y *= -restitution;

      if (!conservative) {

        body.vel.x *= 0.90;
      }

      recordContact(world);
    }

    return true;
  }

  // ========================================
  // RECTANGLE-GROUND
  // ========================================

  if (body.shape !== 'rectangle') {
    return false;
  }

  const hw = body.width / 2;
  const hh = body.height / 2;

  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);

  const corners = [

    [-hw, -hh],
    [ hw, -hh],
    [ hw,  hh],
    [-hw,  hh]

  ].map(([x, y]) => ({

    rx: c * x - s * y,

    ry: s * x + c * y

  }));

  const lowestY = Math.min(

    ...corners.map(
      p => body.pos.y + p.ry
    )

  );

  if (lowestY >= groundY) {
    return false;
  }

  // Correct ground penetration.
  
  const penetration = groundY - lowestY;

  // Avoid correcting extremely small penetrations
  // during conservative resting contact.
  const slop = conservative ? 0.0005 : 0;

  body.pos.y += Math.max(
    0,
    penetration - slop
  );

  // Identify contact corners.

  const contacts = corners.filter(

    p => Math.abs(

      body.pos.y +
      p.ry -
      groundY

    ) < 0.01

  );

  for (const p of contacts) {

    const contactVy =

      body.vel.y +

      body.omega * p.rx;

    if (contactVy >= 0) continue;

    const restitution = conservative

      ? 1

      : Math.abs(contactVy) < 0.5

        ? 0

        : e;

    const denominator =

      body.invMass +

      p.rx ** 2 * body.invInertia;

    if (denominator <= 0) continue;

    const J =

      -(1 + restitution) *

      contactVy /

      denominator;

    body.applyImpulse(

      0,

      J,

      p.rx,

      p.ry

    );

    if (Math.abs(J) > 1e-12) {

      recordContact(world);
    }

    // ======================================
    // GROUND FRICTION
    // ======================================

    if (conservative) continue;

    const contactVx =

      body.vel.x -

      body.omega * p.ry;

    const tangentDenominator =

      body.invMass +

      p.ry ** 2 * body.invInertia;

    if (tangentDenominator > 0) {

      const desiredJt =

        -contactVx /

        tangentDenominator;

      const mu = 0.6;

      const Jt = clamp(

        desiredJt,

        -mu * J,

        mu * J

      );

      body.applyImpulse(

        Jt,

        0,

        p.rx,

        p.ry

      );
    }
  }

  return true;
}

// ==========================================
// WORLD BOUNDARIES
// ==========================================

export function resolveWalls(

  body,
  bounds,
  e = 1,
  world = null

) {

  if (body.isStatic || !bounds) return;

  if (body.shape === 'rectangle') return;

  const {

    xMin,
    xMax,
    yMin,
    yMax

  } = bounds;

  // Left wall

  if (
    body.pos.x - body.radius < xMin
  ) {

    body.pos.x = xMin + body.radius;

    if (body.vel.x < 0) {

      body.vel.x *= -e;

      recordContact(world);
    }
  }

  // Right wall

  if (
    body.pos.x + body.radius > xMax
  ) {

    body.pos.x = xMax - body.radius;

    if (body.vel.x > 0) {

      body.vel.x *= -e;

      recordContact(world);
    }
  }

  // Bottom wall

  if (
    body.pos.y - body.radius < yMin
  ) {

    body.pos.y = yMin + body.radius;

    if (body.vel.y < 0) {

      body.vel.y *= -e;

      recordContact(world);
    }
  }

  // Top wall

  if (
    body.pos.y + body.radius > yMax
  ) {

    body.pos.y = yMax - body.radius;

    if (body.vel.y > 0) {

      body.vel.y *= -e;

      recordContact(world);
    }
  }
}

// ==========================================
// TARGET OVERLAP DETECTION
// ==========================================

function targetOverlap(target, body) {

  // Circle target and circle body

  if (body.shape === 'circle') {

    const dx = target.pos.x - body.pos.x;
    const dy = target.pos.y - body.pos.y;

    const r = target.radius + body.radius;

    return dx * dx + dy * dy <= r * r;
  }

  // Circle target and rectangular body

  if (body.shape === 'rectangle') {

    const dx =
      target.pos.x - body.pos.x;

    const dy =
      target.pos.y - body.pos.y;

    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);

    const localX = c * dx + s * dy;
    const localY = -s * dx + c * dy;

    const hw = body.width / 2;
    const hh = body.height / 2;

    const x = clamp(localX, -hw, hw);
    const y = clamp(localY, -hh, hh);

    return (

      (localX - x) ** 2 +

      (localY - y) ** 2

    ) <= target.radius ** 2;
  }

  return false;
}

// ==========================================
// TARGET COLLISION PROCESSING
// ==========================================

function checkTargetCollision(a, b) {

  const target = a.isTarget

    ? a

    : b.isTarget

      ? b

      : null;

  if (!target) return false;

  const other =
    target === a ? b : a;

  if (

    !target.isHit &&

    !other.isTarget &&

    targetOverlap(target, other)

  ) {

    target.isHit = true;

    target.color = '#4ade80';

    console.log('Target hit!');
  }

  // Targets are sensors, not solid bodies.
  // Do not count them as physical contacts.

  return true;
}

// ==========================================
// MAIN COLLISION DISPATCH
// ==========================================

export function resolveCollisions(world) {

  const conservative =
    world.conservativeMode === true;

  const e = conservative

    ? 1

    : world.restitution;

  // ========================================
  // GROUND CONTACT
  // ========================================

  if (Number.isFinite(world.groundY)) {

    const groundRestitution = conservative

      ? 1

      : Math.min(e, 0.2);

    for (const body of world.bodies) {

      resolveGround(

        body,

        world.groundY,

        groundRestitution,

        world

      );
    }
  }

  // ========================================
  // WORLD WALLS
  // ========================================

  for (const body of world.bodies) {

    resolveWalls(

      body,

      world.bounds,

      e,

      world

    );
  }

  if (!world.pairCollisions) return;

  // ========================================
  // BODY-BODY COLLISIONS
  // ========================================

  for (
    let i = 0;
    i < world.bodies.length;
    i++
  ) {

    for (
      let j = i + 1;
      j < world.bodies.length;
      j++
    ) {

      const a = world.bodies[i];
      const b = world.bodies[j];

      // Target sensors

      if (checkTargetCollision(a, b)) {

        continue;
      }

      if (a.isStatic && b.isStatic) {

        continue;
      }

      // ====================================
      // CIRCLE-CIRCLE
      // ====================================

      if (

        a.shape === 'circle' &&

        b.shape === 'circle'

      ) {

        resolvePair(

          a,

          b,

          e,

          conservative
            ? true
            : world.jitterGuard,

          world

        );
      }

      // ====================================
      // CIRCLE-RECTANGLE
      // ====================================

      else if (

        a.shape === 'circle' &&

        b.shape === 'rectangle'

      ) {

        resolveCircleRectangle(

          a,

          b,

          e,

          world

        );
      }

      // ====================================
      // RECTANGLE-CIRCLE
      // ====================================

      else if (

        a.shape === 'rectangle' &&

        b.shape === 'circle'

      ) {

        resolveCircleRectangle(

          b,

          a,

          e,

          world

        );
      }

      // ====================================
      // RECTANGLE-RECTANGLE
      // ====================================

      else if (

        a.shape === 'rectangle' &&

        b.shape === 'rectangle'

      ) {

        resolveRectangleRectangle(

          a,

          b,

          e,

          world

        );
      }
    }
  }
}
