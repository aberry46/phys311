// Run using: node contact-diagnostics.js

import { Body } from './engine/body.js';
import { World } from './engine/world.js';
import { Gravity } from './engine/forces.js';
import { VelocityVerlet } from './engine/integrators.js';

// ==========================================
// CONFIGURATION
// ==========================================

const G = 9.81;
const GROUND_Y = -4.5;
const DURATION = 10;

const TIMESTEPS = [
  1 / 120,
  1 / 240,
  1 / 480
];

const ITERATIONS = [1, 4, 8];

// ==========================================
// RECREATE THE SLINGSHOT STRUCTURE
// ==========================================

function makeWorld(dt, iterations, conservative) {
  const world = new World({
    integrator: new VelocityVerlet(),
    restitution: 0.35,
    pairCollisions: true,
    contactIterations: iterations
  });

  world.groundY = GROUND_Y;
  world.addForce(new Gravity(G));
  world.setConservativeMode(conservative);

  function addBlock(x, y, width, height, mass) {
    return world.add(new Body({
      shape: 'rectangle',
      x,
      y,
      width,
      height,
      m: mass
    }));
  }

  addBlock(3.0, GROUND_Y + 1.0, 0.8, 2.0, 3);
  addBlock(5.0, GROUND_Y + 1.0, 0.8, 2.0, 3);
  addBlock(4.0, GROUND_Y + 2.25, 3.2, 0.5, 3);

  return world;
}

// ==========================================
// MEASURE GROUND PENETRATION
// ==========================================

function groundPenetration(body) {
  if (body.shape !== 'rectangle') return 0;

  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);

  const hw = body.width / 2;
  const hh = body.height / 2;

  const corners = [
    [-hw, -hh],
    [ hw, -hh],
    [ hw,  hh],
    [-hw,  hh]
  ];

  let lowestY = Infinity;

  for (const [x, y] of corners) {
    const worldY = body.pos.y + s * x + c * y;
    lowestY = Math.min(lowestY, worldY);
  }

  return Math.max(0, GROUND_Y - lowestY);
}

// ==========================================
// RUN ONE EXPERIMENT
// ==========================================

function runExperiment(dt, iterations, conservative) {
  const world = makeWorld(
    dt,
    iterations,
    conservative
  );

  const initialEnergy = world.totalEnergy();

  const steps = Math.round(DURATION / dt);

  let accumulatedCollisionEnergyChange = 0;
  let accumulatedCollisionKE = 0;
  let accumulatedCollisionPE = 0;
  let maxEnergyDrift = 0;
  let maxGroundPenetration = 0;
  let maxAngularSpeed = 0;
  let totalContacts = 0;
  let nonFinite = false;

  for (let step = 0; step < steps; step++) {
    world.step(dt);
    
    accumulatedCollisionKE +=
        world.lastCollisionKineticChange ?? 0;

    accumulatedCollisionPE +=
        world.lastCollisionPotentialChange ?? 0;

    accumulatedCollisionEnergyChange +=
        world.lastCollisionEnergyChange ?? 0;

    const energy = world.totalEnergy();

    const drift = Math.abs(
      100 * (energy - initialEnergy) /
      Math.max(Math.abs(initialEnergy), 1e-12)
    );

    if (!Number.isFinite(energy) ||
        !Number.isFinite(drift)) {
      nonFinite = true;
      break;
    }

    maxEnergyDrift = Math.max(
      maxEnergyDrift,
      drift
    );

    totalContacts += world.contactsThisStep;

    for (const body of world.bodies) {
      maxGroundPenetration = Math.max(
        maxGroundPenetration,
        groundPenetration(body)
      );

      maxAngularSpeed = Math.max(
        maxAngularSpeed,
        Math.abs(body.omega)
      );

      if (
        !Number.isFinite(body.pos.x) ||
        !Number.isFinite(body.pos.y) ||
        !Number.isFinite(body.omega)
      ) {
        nonFinite = true;
        break;
      }
    }

    if (nonFinite) break;
  }

  const finalEnergy = world.totalEnergy();

  const finalDrift =
    100 * (finalEnergy - initialEnergy) /
    Math.max(Math.abs(initialEnergy), 1e-12);

  return {
    Mode: conservative ? 'Conservative' : 'Normal',
    DT: `1/${Math.round(1 / dt)}`,
    Iterations: iterations,
    'Final Drift (%)': finalDrift.toFixed(5),
    'Peak Drift (%)': maxEnergyDrift.toFixed(5),
    'Ground Penetration (m)':
      maxGroundPenetration.toExponential(3),
    'Max Angular Speed (rad/s)':
      maxAngularSpeed.toFixed(5),
    'Contact Impulses': totalContacts,
    'Finite': !nonFinite,
    'Collision Energy Change (J)':
     accumulatedCollisionEnergyChange.toFixed(6),
    'Collision KE Change (J)':
        accumulatedCollisionKE.toFixed(6),
    'Collision PE Change (J)':
        accumulatedCollisionPE.toFixed(6),

  };
}

// ==========================================
// EXPERIMENT MATRIX
// ==========================================

console.log(
  '\nPHYS 311: RESTING CONTACT DIAGNOSTICS'
);

console.log(
  '===================================='
);

console.log(`Simulation duration: ${DURATION} s`);
console.log('Structure: 3 rectangular blocks');
console.log('Integrator: Velocity Verlet');
console.log(`Gravity: ${G} m/s²`);

const results = [];

for (const conservative of [false, true]) {
  for (const dt of TIMESTEPS) {
    for (const iterations of ITERATIONS) {
      results.push(
        runExperiment(
          dt,
          iterations,
          conservative
        )
      );
    }
  }
}

console.log('\nNORMAL MODE');
console.table(
  results.filter(row => row.Mode === 'Normal')
);

console.log('\nCONSERVATIVE MODE');
console.table(
  results.filter(row => row.Mode === 'Conservative')
);

// ==========================================
// SUMMARY
// ==========================================

const stable = results.filter(
  row => row.Finite
);

const ranked = [...stable].sort(
  (a, b) =>
    parseFloat(a['Peak Drift (%)']) -
    parseFloat(b['Peak Drift (%)'])
);

console.log('\nLOWEST PEAK ENERGY DRIFT');
console.table(ranked.slice(0, 5));

console.log('\nDIAGNOSTICS COMPLETE');
console.log(
  'Compare timestep sensitivity, contact count, ' +
  'penetration, and energy drift before changing ' +
  'the collision solver.'
);