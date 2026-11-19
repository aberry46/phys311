
//
// PHYS 311 - Slingshot Destruction
// Numerical Physics Validation
//

import { Body } from './engine/body.js';
import { World } from './engine/world.js';
import { Gravity } from './engine/forces.js';
import { VelocityVerlet } from './engine/integrators.js';

// ==========================================
// CONFIGURATION
// ==========================================

const DT = 1 / 240;
const G = 9.81;

const MOMENTUM_TOL = 1e-9;
const ENERGY_TOL = 1e-8;
const ANGULAR_TOL = 1e-8;

const RANGE_TOL = 0.5;
const POSITION_TOL = 0.01;

const results = [];

// ==========================================
// VALIDATION UTILITIES
// ==========================================

function heading(title) {

  console.log('\n====================================');

  console.log(title);

  console.log('====================================');
}

function report(
  name,
  expected,
  measured,
  error,
  tolerance,
  passed
) {

  const result = {

    Test: name,

    Expected: expected,

    Measured: measured,

    Error: error,

    Tolerance: tolerance,

    Result: passed ? 'PASS' : 'FAIL'

  };

  results.push(result);

  console.table([result]);
}

function exponential(value) {

  return value.toExponential(8);
}

function momentumError(before, after) {

  return Math.hypot(

    after.x - before.x,

    after.y - before.y

  );
}

// ==========================================
// ISOLATED RECTANGULAR COLLISION
// ==========================================

function collisionExperiment({

  restitution = 1,

  conservative = true,

  offset = 0.35

} = {}) {

  const world = new World({

    integrator: new VelocityVerlet(),

    restitution,

    pairCollisions: true,

    contactIterations: 8

  });

  world.setConservativeMode(conservative);

  const a = world.add(new Body({

    shape: 'rectangle',

    x: -1,

    y: 0,

    vx: 3,

    vy: 0,

    width: 1,

    height: 1,

    m: 2

  }));

  const b = world.add(new Body({

    shape: 'rectangle',

    x: 1,

    y: offset,

    vx: -1,

    vy: 0,

    width: 1,

    height: 1,

    m: 3

  }));

  // No gravity, ground, or external forces.

  const before = {

    momentum: world.totalMomentum(),

    energy: world.totalEnergy(),

    angularMomentum:
      world.totalAngularMomentum()

  };

  let contacts = 0;
  let maximumOmega = 0;

  const duration = 1;

  const steps = Math.round(
    duration / DT
  );

  for (let i = 0; i < steps; i++) {

    world.step(DT);

    contacts += world.contactsThisStep;

    maximumOmega = Math.max(

      maximumOmega,

      Math.abs(a.omega),

      Math.abs(b.omega)

    );
  }

  const after = {

    momentum: world.totalMomentum(),

    energy: world.totalEnergy(),

    angularMomentum:
      world.totalAngularMomentum()

  };

  return {

    before,

    after,

    contacts,

    maximumOmega,

    momentumError: momentumError(

      before.momentum,

      after.momentum

    ),

    energyError: Math.abs(

      after.energy -

      before.energy

    ),

    angularError: Math.abs(

      after.angularMomentum -

      before.angularMomentum

    )
  };
}

// ==========================================
// TEST 1
// LINEAR MOMENTUM CONSERVATION
// ==========================================

heading(
  'TEST 1: LINEAR MOMENTUM CONSERVATION'
);

const elastic = collisionExperiment({

  restitution: 1,

  conservative: true,

  offset: 0.35

});

console.log(
  'Contacts resolved:',
  elastic.contacts
);

console.log(
  'Initial momentum:',
  elastic.before.momentum
);

console.log(
  'Final momentum:',
  elastic.after.momentum
);

report(

  'Linear momentum',

  exponential(0),

  exponential(elastic.momentumError),

  exponential(elastic.momentumError),

  '1e-9 kg m/s',

  elastic.contacts > 0 &&

  elastic.momentumError < MOMENTUM_TOL

);

// ==========================================
// TEST 2
// ENERGY AND ANGULAR MOMENTUM
// ==========================================

heading(
  'TEST 2: ENERGY AND ANGULAR MOMENTUM'
);

console.log(
  'Initial energy:',
  elastic.before.energy,
  'J'
);

console.log(
  'Final energy:',
  elastic.after.energy,
  'J'
);

console.log(
  'Maximum angular speed:',
  elastic.maximumOmega,
  'rad/s'
);

report(

  'Elastic collision energy',

  elastic.before.energy.toFixed(10),

  elastic.after.energy.toFixed(10),

  exponential(elastic.energyError),

  '1e-8 J',

  elastic.contacts > 0 &&

  elastic.energyError < ENERGY_TOL

);

report(

  'Angular momentum',

  elastic.before.angularMomentum.toFixed(10),

  elastic.after.angularMomentum.toFixed(10),

  exponential(elastic.angularError),

  '1e-8 kg m²/s',

  elastic.contacts > 0 &&

  elastic.angularError < ANGULAR_TOL

);

// ==========================================
// PROJECTILE WORLD
// ==========================================

function projectileWorld() {

  const world = new World({

    integrator: new VelocityVerlet(),

    pairCollisions: false,

    restitution: 1

  });

  world.setConservativeMode(true);

  world.addForce(
    new Gravity(G)
  );

  const speed = 10;

  const angle =
    45 * Math.PI / 180;

  const projectile = world.add(

    new Body({

      shape: 'circle',

      x: 0,

      y: 0,

      vx: speed * Math.cos(angle),

      vy: speed * Math.sin(angle),

      m: 1,

      radius: 0.25

    })

  );

  return {

    world,

    projectile,

    speed,

    angle

  };
}

// ==========================================
// TEST 3
// PROJECTILE RANGE
// ==========================================

heading(
  'TEST 3: PROJECTILE RANGE'
);

{

  const {

    world,

    projectile,

    speed,

    angle

  } = projectileWorld();

  const expectedRange =

    speed ** 2 *

    Math.sin(2 * angle) /

    G;

  let measuredRange = NaN;

  let crossed = false;

  let previousX = projectile.pos.x;
  let previousY = projectile.pos.y;

  const maxSteps = Math.ceil(10 / DT);

  for (let i = 0; i < maxSteps; i++) {

    previousX = projectile.pos.x;
    previousY = projectile.pos.y;

    world.step(DT);

    // Detect the descending crossing
    // of the original launch height.

    if (

      previousY > 0 &&

      projectile.pos.y <= 0 &&

      projectile.vel.y < 0

    ) {

      // Interpolate between timesteps.

      const fraction =

        previousY /

        (previousY - projectile.pos.y);

      measuredRange =

        previousX +

        fraction *

        (projectile.pos.x - previousX);

      crossed = true;

      break;
    }
  }

  const error =

    100 *

    Math.abs(
      measuredRange - expectedRange
    ) /

    expectedRange;

  report(

    'Projectile range',

    `${expectedRange.toFixed(8)} m`,

    `${measuredRange.toFixed(8)} m`,

    `${error.toFixed(8)}%`,

    '0.5%',

    crossed &&

    error < RANGE_TOL

  );
}

// ==========================================
// TEST 4
// TIMESTEP CONVERGENCE
// ==========================================

heading(
  'TEST 4: TIMESTEP CONVERGENCE'
);

const timestepResults = [];

for (const divisor of [

  60,

  120,

  240,

  480

]) {

  const dt = 1 / divisor;

  const {

    world,

    projectile,

    speed,

    angle

  } = projectileWorld();

  const duration = 1;

  const steps = Math.round(
    duration / dt
  );

  for (let i = 0; i < steps; i++) {

    world.step(dt);
  }

  const exactX =

    speed *

    Math.cos(angle) *

    duration;

  const exactY =

    speed *

    Math.sin(angle) *

    duration -

    0.5 * G * duration ** 2;

  const error = Math.hypot(

    projectile.pos.x - exactX,

    projectile.pos.y - exactY

  );

  timestepResults.push({

    DT: `1/${divisor}`,

    Steps: steps,

    ExpectedX: exactX.toFixed(10),

    MeasuredX:
      projectile.pos.x.toFixed(10),

    ExpectedY: exactY.toFixed(10),

    MeasuredY:
      projectile.pos.y.toFixed(10),

    Error: exponential(error),

    errorValue: error

  });
}

console.table(

  timestepResults.map(

    ({ errorValue, ...row }) => row

  )

);

const targetDT = timestepResults.find(

  row => row.DT === '1/240'

);

report(

  'Position at t = 1 s',

  'Analytical trajectory',

  'Velocity Verlet, DT = 1/240',

  exponential(targetDT.errorValue),

  '0.01 m',

  targetDT.errorValue < POSITION_TOL

);

// ==========================================
// TEST 5
// INELASTIC COLLISION
// ==========================================

heading(
  'TEST 5: INELASTIC COLLISION'
);

const inelastic = collisionExperiment({

  restitution: 0.5,

  conservative: false,

  offset: 0.35

});

const energyLost =

  inelastic.before.energy -

  inelastic.after.energy;

const energyLossPercent =

  100 *

  energyLost /

  inelastic.before.energy;

console.log(
  'Contacts resolved:',
  inelastic.contacts
);

console.log(
  'Initial energy:',
  inelastic.before.energy,
  'J'
);

console.log(
  'Final energy:',
  inelastic.after.energy,
  'J'
);

console.log(
  'Energy lost:',
  energyLost,
  'J'
);

console.log(
  'Energy loss:',
  energyLossPercent.toFixed(6),
  '%'
);

report(

  'Inelastic momentum',

  exponential(0),

  exponential(inelastic.momentumError),

  exponential(inelastic.momentumError),

  '1e-9 kg m/s',

  inelastic.contacts > 0 &&

  inelastic.momentumError < MOMENTUM_TOL

);

report(

  'Inelastic energy loss',

  'Final KE < Initial KE',

  `${energyLost.toFixed(8)} J lost`,

  'N/A',

  'Positive energy loss',

  inelastic.contacts > 0 &&

  energyLost > 0

);

// ==========================================
// FINAL VALIDATION SUMMARY
// ==========================================

heading(
  'FINAL VALIDATION SUMMARY'
);

console.table(results);

const passed = results.filter(

  result => result.Result === 'PASS'

).length;

const failed = results.length - passed;

console.log(
  'Total checks:',
  results.length
);

console.log(
  'Passed:',
  passed
);

console.log(
  'Failed:',
  failed
);

console.log(

  'Pass rate:',

  (100 * passed / results.length)
    .toFixed(2) + '%'

);

if (failed === 0) {

  console.log(
    '\nALL VALIDATION CHECKS PASSED'
  );

} else {

  console.log(
    '\nVALIDATION COMPLETE: REVIEW FAILED CHECKS'
  );
}
