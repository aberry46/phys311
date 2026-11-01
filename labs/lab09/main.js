
import { Body } from './engine/body.js';
import { Gravity, NewtonGravity, Spring } from './engine/forces.js';
import { EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';
import { Renderer } from './render/renderer.js';
import { HUD } from './render/hud.js';

const canvas = document.querySelector('#simulation');
const renderer = new Renderer(canvas);
const hud = new HUD(document.querySelector('#hud'));

const sceneSelect = document.querySelector('#scene');
const integratorSelect = document.querySelector('#integrator');
const restitutionInput = document.querySelector('#restitution');
const countInput = document.querySelector('#count');
const countLabel = document.querySelector('#count-label');
const restLabel = document.querySelector('#restitution-label');
const status = document.querySelector('#status');

const DT = 1 / 240;

let world;
let paused = false;
let accumulator = 0;
let previousFrame = null;
let fps = 60;
let physicsMs = 0;
let renderMs = 0;
let didLog60 = false;

const colors = [
  '#f97316',
  '#38bdf8',
  '#a78bfa',
  '#4ade80',
  '#f472b6',
  '#facc15'
];

const integrator = () =>
  integratorSelect.value === 'verlet'
    ? new VelocityVerlet()
    : new EulerCromer();

// PART A: BILLIARDS SCENE

function makeBilliards() {
  const w = new World({
    integrator: integrator(),
    bounds: {
       xMin: -10,
       xMax: 10,
       yMin: -6,
       yMax: 6
    },
    restitution: Number(restitutionInput.value)
    });

  const count = Number(countInput.value);

  for (let i = 0; i < count; i++) {
    const columns = 20;
    const row = Math.floor(i / columns);
    const col = i % columns;
    const rows = Math.ceil(count / columns);

    const x = -9.2 + (col + 0.5) * (18.4 / columns);
    const y = -5.2 + (row + 0.5) * (10.4 / rows);

    const angle = (i * 2.39996) % (2 * Math.PI);
    const speed = 1.8 + (i % 5) * 0.3;

    w.add(new Body({
      x,
      y,
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      m: 1,
      radius: 0.18,
      color: colors[i % colors.length]
    }));
  }

  return w;
}

// PART B1: JITTER GUARD TEST

// Two balls initially overlap by 0.10 m,
// but are already moving away from one another.

function makeJitterTest() {
  const w = new World({
    integrator: integrator(),
    pairCollisions: true,
    restitution: 1.0
  });

  w.viewBounds = {
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 3
  };

  w.add(new Body({
    x: -0.15,
    y: 0,
    vx: -0.5,
    vy: 0,
    m: 1,
    radius: 0.2,
    color: '#38bdf8'
  }));

  w.add(new Body({
    x: 0.15,
    y: 0,
    vx: 0.5,
    vy: 0,
    m: 1,
    radius: 0.2,
    color: '#f97316'
  }));

  return w;
}

// PART C2: GRAVITATIONAL N-BODY SCENE

function makeOrbits() {
  const w = new World({
    integrator: integrator(),
    pairCollisions: false
  });

  w.viewBounds = {
    xMin: -11,
    xMax: 11,
    yMin: -7,
    yMax: 7
  };

  w.addForce(new NewtonGravity(1, 0.15));

  w.add(new Body({
    m: 150,
    radius: 0.45,
    color: '#facc15'
  }));

  for (let i = 0; i < 4; i++) {
    const r = i < 2 ? 3.5 : 5.5;

    const theta =
      (i % 2) * Math.PI +
      (i >= 2 ? Math.PI / 2 : 0);

    const speed = Math.sqrt(150 / r);

    w.add(new Body({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      vx: -speed * Math.sin(theta),
      vy: speed * Math.cos(theta),
      m: 0.15,
      radius: 0.16,
      color: colors[i]
    }));
  }

  return w;
}

// PART C3: SPRING NETWORK SCENE

function makeSprings() {
  const w = new World({
    integrator: integrator(),
    pairCollisions: false
  });

  w.viewBounds = {
    xMin: -9,
    xMax: 9,
    yMin: -6,
    yMax: 6
  };

  const left = w.add(new Body({
    x: -6,
    y: 0,
    radius: 0.22,
    isStatic: true,
    color: '#94a3b8'
  }));

  const a = w.add(new Body({
    x: -2.4,
    y: 0.5,
    m: 1,
    radius: 0.28,
    color: '#38bdf8'
  }));

  const b = w.add(new Body({
    x: 1.5,
    y: -0.4,
    m: 1,
    radius: 0.28,
    color: '#f97316'
  }));

  const right = w.add(new Body({
    x: 6,
    y: 0,
    radius: 0.22,
    isStatic: true,
    color: '#94a3b8'
  }));

  w.addForce(new Spring(left, a, 8, 3));
  w.addForce(new Spring(a, b, 8, 3));
  w.addForce(new Spring(b, right, 8, 3));

  return w;
}

// RESET AND SCENE SELECTION

function reset() {
  const scene = sceneSelect.value;

  if (scene === 'orbits') {
    world = makeOrbits();
  } else if (scene === 'springs') {
    world = makeSprings();
  } else if (scene === 'jitter') {
    world = makeJitterTest();
  } else {
    world = makeBilliards();
  }

  accumulator = 0;
  previousFrame = null;
  didLog60 = false;

  hud.reset(world);

  // Run exactly one physics step for jitter testing.
  if (scene === 'jitter') {
    world.jitterGuard =
      document.querySelector('#guard').checked;

    const before = world.bodies.map(b => b.vel.x);

    world.step(DT);

    const after = world.bodies.map(b => b.vel.x);

    paused = true;

    document.querySelector('#pause').textContent = 'Resume';

    const guarded = world.jitterGuard;

    const reversed =
      after[0] > 0 && after[1] < 0;

    const outcome = guarded
      ? 'Guard ON: separating velocities preserved'
      : reversed
        ? 'Guard OFF: incorrect impulse reversed velocities'
        : 'Guard OFF: no reversal detected';

    const details =
      `JITTER GUARD TEST\n` +
      `${outcome}\n` +
      `Left ball: ${before[0].toFixed(2)} -> ${after[0].toFixed(2)} m/s\n` +
      `Right ball: ${before[1].toFixed(2)} -> ${after[1].toFixed(2)} m/s\n` +
      `Paused after one physics step.`;

    status.style.whiteSpace = 'pre-wrap';
    status.textContent = details;

    console.table({
      guard: guarded,
      leftBefore: before[0],
      leftAfter: after[0],
      rightBefore: before[1],
      rightAfter: after[1],
      outcome
    });

  } else {
    paused = false;
    document.querySelector('#pause').textContent = 'Pause';
    status.textContent = 'Scene ready';
  }
}

// ANIMATION LOOP

function frame(timestamp) {
  if (previousFrame === null) {
    previousFrame = timestamp;
  }

  const frameSeconds = Math.min(
    (timestamp - previousFrame) / 1000,
    0.05
  );

  previousFrame = timestamp;

  if (frameSeconds > 0) {
    fps = 0.9 * fps + 0.1 / frameSeconds;
  }

  const physicsStart = performance.now();

  if (!paused) {
    accumulator += frameSeconds;

    let steps = 0;

    while (accumulator >= DT && steps < 20) {
      world.jitterGuard =
        document.querySelector('#guard').checked;

      world.step(DT);

      accumulator -= DT;
      steps++;

      // Record orbital trails
      if (
        sceneSelect.value === 'orbits' &&
        steps % 4 === 0
      ) {
        for (const b of world.bodies) {
          b.trail.push([b.pos.x, b.pos.y]);

          if (b.trail.length > 240) {
            b.trail.shift();
          }
        }
      }

      // Automatically log 60-second results
      if (!didLog60 && world.time >= 60) {
        didLog60 = true;

        const result = {
          scene: sceneSelect.value,
          t: world.time,
          energy: world.totalEnergy(),
          momentum: world.totalMomentum(),
          initialEnergy: hud.initialEnergy
        };

        console.log('60-second physics result:', result);

        status.textContent =
          '60-second results logged to Console';
      }
    }

    if (steps === 20) {
      accumulator = 0;
    }
  }

  physicsMs = performance.now() - physicsStart;

  const renderStart = performance.now();

  renderer.draw(world);

  renderMs = performance.now() - renderStart;

  hud.update(world, fps, physicsMs, renderMs);

  requestAnimationFrame(frame);
}

// USER CONTROLS

sceneSelect.addEventListener('change', reset);

integratorSelect.addEventListener('change', reset);

countInput.addEventListener('input', () => {
  countLabel.textContent = countInput.value;
  reset();
});

restitutionInput.addEventListener('input', () => {
  restLabel.textContent =
    Number(restitutionInput.value).toFixed(2);

  world.restitution = Number(restitutionInput.value);
});

document.querySelector('#reset')
  .addEventListener('click', reset);

document.querySelector('#guard')
  .addEventListener('change', () => {
    if (sceneSelect.value === 'jitter') {
      reset();
    }
  });

document.querySelector('#pause')
  .addEventListener('click', event => {
    paused = !paused;

    event.target.textContent =
      paused ? 'Resume' : 'Pause';
  });

document.querySelector('#report')
  .addEventListener('click', () => {
    const result = {
      scene: sceneSelect.value,
      time: world.time,
      bodies: world.bodies.length,
      energy: world.totalEnergy(),
      initialEnergy: hud.initialEnergy,
      momentum: world.totalMomentum(),
      fps,
      physicsMs,
      renderMs
    };

    console.table(result);

    status.textContent =
      'Measurements logged to Console (F12)';
  });

// START SIMULATION

countLabel.textContent = countInput.value;

restLabel.textContent =
  Number(restitutionInput.value).toFixed(2);

reset();

requestAnimationFrame(frame);
