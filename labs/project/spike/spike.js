//
// PHYS 311 - Final Project Risk Prototype
// Slingshot Destruction
//
// Tests rotational collision response and
// numerical conservation properties.
//
// In order to run, simply use the command: node spike.js

const EPS = 1e-12;

// ==========================================
// PHYSICS HELPERS
// ==========================================

function inertia(m, width, height) {
  return (m / 12) * (width ** 2 + height ** 2);
}

function kineticEnergy(body) {
  return (
    0.5 * body.m * (body.vx ** 2 + body.vy ** 2) +
    0.5 * body.I * body.omega ** 2
  );
}

function momentum(bodies) {
  return bodies.reduce((total, b) => ({
    x: total.x + b.m * b.vx,
    y: total.y + b.m * b.vy
  }), { x: 0, y: 0 });
}

function angularMomentum(bodies) {
  return bodies.reduce((total, b) => {
    return total +
      b.m * (b.x * b.vy - b.y * b.vx) +
      b.I * b.omega;
  }, 0);
}

function applyImpulse(body, jx, jy, rx, ry) {
  body.vx += jx / body.m;
  body.vy += jy / body.m;

  body.omega +=
    (rx * jy - ry * jx) / body.I;
}

// ==========================================
// COLLISION EXPERIMENT
// ==========================================

// Projectile hits the left face of a block.
// The impulse is computed at the contact point.

function collisionTest(offset, restitution = 1) {
  const projectile = {
    x: -1.2,
    y: offset,
    vx: 10,
    vy: 0,
    m: 1,
    radius: 0.2,
    I: 0.5 * 1 * 0.2 ** 2,
    omega: 0
  };

  const block = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    m: 3,
    width: 2,
    height: 1,
    I: inertia(3, 2, 1),
    omega: 0
  };

  const bodies = [projectile, block];

  const initialP = momentum(bodies);
  const initialL = angularMomentum(bodies);
  const initialE = bodies.reduce(
    (sum, b) => sum + kineticEnergy(b), 0
  );

  // Contact point on left face of block
  const rx = -block.width / 2;
  const ry = offset;

  // Collision normal points from projectile
  // toward the block.
  const nx = 1;
  const ny = 0;

  // Effective inverse mass
  const inverseMass =
    1 / projectile.m +
    1 / block.m +
    (rx * ny - ry * nx) ** 2 / block.I;

  const relativeVelocity =
    block.vx - projectile.vx;

  const J =
    -(1 + restitution) *
    relativeVelocity / inverseMass;

  // Projectile impulse
  applyImpulse(
    projectile,
    -J,
    0,
    0,
    0
  );

  // Block impulse
  applyImpulse(
    block,
    J,
    0,
    rx,
    ry
  );

  const finalP = momentum(bodies);
  const finalL = angularMomentum(bodies);
  const finalE = bodies.reduce(
    (sum, b) => sum + kineticEnergy(b), 0
  );

  return {
    projectile,
    block,
    impulse: J,
    momentumError: Math.hypot(
      finalP.x - initialP.x,
      finalP.y - initialP.y
    ),
    angularMomentumError: finalL - initialL,
    energyError: finalE - initialE,
    initialEnergy: initialE,
    finalEnergy: finalE
  };
}

// ==========================================
// TEST 1: CENTERED IMPACT
// ==========================================

console.log("TEST 1: CENTERED IMPACT");

const center = collisionTest(0, 1);

console.log(
  "Block angular velocity:",
  center.block.omega.toFixed(6),
  "rad/s"
);

console.log(
  "Momentum error:",
  center.momentumError.toExponential(3)
);

console.log(
  "Energy error:",
  center.energyError.toExponential(3),
  "J"
);

console.log("");

// ==========================================
// TEST 2: OFF-CENTER IMPACT
// ==========================================

console.log("TEST 2: OFF-CENTER IMPACT");

const offCenter = collisionTest(0.35, 1);

console.log(
  "Block angular velocity:",
  offCenter.block.omega.toFixed(6),
  "rad/s"
);

console.log(
  "Momentum error:",
  offCenter.momentumError.toExponential(3)
);

console.log(
  "Angular momentum error:",
  offCenter.angularMomentumError.toExponential(3)
);

console.log(
  "Energy error:",
  offCenter.energyError.toExponential(3),
  "J"
);

console.log("");

// ==========================================
// TEST 3: INELASTIC COLLISION
// ==========================================

console.log("TEST 3: INELASTIC IMPACT");

const inelastic = collisionTest(0.35, 0.5);

console.log(
  "Initial energy:",
  inelastic.initialEnergy.toFixed(6),
  "J"
);

console.log(
  "Final energy:",
  inelastic.finalEnergy.toFixed(6),
  "J"
);

console.log(
  "Energy lost:",
  (
    inelastic.initialEnergy -
    inelastic.finalEnergy
  ).toFixed(6),
  "J"
);

console.log(
  "Momentum error:",
  inelastic.momentumError.toExponential(3)
);

console.log("");

// ==========================================
// TEST 4: RESTING CONTACT
// ==========================================

// Simple vertical block resting on a floor.
// Tests repeated gravity and contact correction.

console.log("TEST 4: RESTING CONTACT");

const dt = 1 / 240;
const g = 9.81;
const groundY = 0;

const body = {
  y: 1.01,
  vy: 0,
  height: 2
};

let contacts = 0;
let maximumPenetration = 0;

for (let i = 0; i < 2400; i++) {
  body.vy -= g * dt;
  body.y += body.vy * dt;

  const bottom = body.y - body.height / 2;

  if (bottom < groundY) {
    const penetration = groundY - bottom;

    maximumPenetration = Math.max(
      maximumPenetration,
      penetration
    );

    body.y += penetration;

    if (body.vy < 0) {
      body.vy = 0;
    }

    contacts++;
  }
}

console.log(
  "Final block height:",
  body.y.toFixed(6),
  "m"
);

console.log(
  "Final vertical velocity:",
  body.vy.toFixed(6),
  "m/s"
);

console.log(
  "Contact corrections:",
  contacts
);

console.log(
  "Maximum penetration:",
  maximumPenetration.toExponential(3),
  "m"
);

console.log("");

console.log("PROTOTYPE COMPLETE");