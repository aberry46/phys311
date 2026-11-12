import { Body } from './engine/body.js';
import { Gravity, NewtonGravity, Spring } from './engine/forces.js';
import { Euler, EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';
import { Renderer } from './render/renderer.js';
import { HUD } from './render/hud.js';
import { setupPointerInput } from './input.js';
import { setupInteractions } from './interaction.js';
import { EnergyChart } from './render/energy-chart.js';

// ==========================================
// INITIALIZATION
// ==========================================

const canvas = document.querySelector('#simulation');
const renderer = new Renderer(canvas);
const hud = new HUD(document.querySelector('#hud'));

const pointer = setupPointerInput(canvas, {
  toWorldX: px => renderer.camera?.toWorldX(px) ?? 0,
  toWorldY: py => renderer.camera?.toWorldY(py) ?? 0
});

const sceneSelect = document.querySelector('#scene');
const integratorSelect = document.querySelector('#integrator');
const restitutionInput = document.querySelector('#restitution');
const countInput = document.querySelector('#count');
const countLabel = document.querySelector('#count-label');
const restLabel = document.querySelector('#restitution-label');

const speedInput = document.querySelector('#speed');
const speedLabel = document.querySelector('#speed-label');

const gravityInput = document.querySelector('#gravity');
const gravityLabel = document.querySelector('#gravity-label');

const stiffnessInput = document.querySelector('#stiffness');
const stiffnessLabel = document.querySelector('#stiffness-label');

const status = document.querySelector('#status');
const pauseButton = document.querySelector('#pause');

const showTrails = document.querySelector('#show-trails');
const showVelocity = document.querySelector('#show-velocity');
const showEnergy = document.querySelector('#show-energy');
const energyPanel = document.querySelector('#energy-panel');

const energyChart = new EnergyChart(
  document.querySelector('#energy-chart')
);

const DT = 1 / 240;

let world;
let paused = false;
let accumulator = 0;
let previousFrame = null;

let fps = 60;
let physicsMs = 0;
let renderMs = 0;

let didLog60 = false;
let speed = 1;
let physicsStepCount = 0;

const colors = [
  '#f97316',
  '#38bdf8',
  '#a78bfa',
  '#4ade80',
  '#f472b6',
  '#facc15'
];

// ==========================================
// VISUALIZATION SETTINGS
// ==========================================

function updateVisualSettings() {
  renderer.showTrails = showTrails.checked;
  renderer.showVelocity = showVelocity.checked;

  energyPanel.hidden = !showEnergy.checked;

  if (showEnergy.checked) {
    energyChart.draw();
  }
}

showTrails.addEventListener('change', updateVisualSettings);
showVelocity.addEventListener('change', updateVisualSettings);
showEnergy.addEventListener('change', updateVisualSettings);

updateVisualSettings();

// ==========================================
// INTEGRATOR SELECTION
// ==========================================

function integrator() {
  if (integratorSelect.value === 'verlet') {
    return new VelocityVerlet();
  }

  if (integratorSelect.value === 'cromer') {
    return new EulerCromer();
  }

  return new Euler();
}

// ==========================================
// SCENE: SLINGSHOT DESTRUCTION
// ==========================================

function makeSlingshot() {
  const w = new World({
    integrator: integrator(),
    restitution: Math.min(
      parseFloat(restitutionInput.value),
      0.35
    ),
    pairCollisions: true
  });

  // Simulation viewing area
  w.viewBounds = {
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6
  };

  // Ground position
  w.groundY = -4.5;

  // Earth gravity
  w.addForce(new Gravity(9.81));

  // Slingshot position
  w.launcher = {
    x: -7,
    y: -3.3
  };

  // First wooden block
  w.add(new Body({
    shape: 'rectangle',
    x: 3,
    y: -3.5,
    width: 1,
    height: 2,
    m: 3,
    color: '#c68c53'
  }));

  // Second wooden block
  w.add(new Body({
    shape: 'rectangle',
    x: 5,
    y: -3.5,
    width: 1,
    height: 2,
    m: 3,
    color: '#d7a36c'
  }));

  // Target, resting at ground level
  w.add(new Body({
    shape: 'circle',
    x: 7,
    y: -4.15,
    radius: 0.35,
    m: 1,
    isStatic: true,
    isTarget: true,
    color: '#ef4444'
  }));

  return w;
}

// ==========================================
// SCENE A: BILLIARDS
// ==========================================

function makeBilliards() {
  const w = new World({
    integrator: integrator(),
    bounds: {
      xMin: -10,
      xMax: 10,
      yMin: -6,
      yMax: 6
    },
    restitution: parseFloat(restitutionInput.value)
  });

  const count = parseFloat(countInput.value);

  for (let i = 0; i < count; i++) {
    const columns = 20;
    const row = Math.floor(i / columns);
    const col = i % columns;
    const rows = Math.ceil(count / columns);

    const x = -9.2 + (col + 0.5) * (18.4 / columns);
    const y = -5.2 + (row + 0.5) * (10.4 / rows);

    const angle = (i * 2.39996) % (2 * Math.PI);
    const v = 1.8 + (i % 5) * 0.3;

    w.add(new Body({
      x,
      y,
      vx: v * Math.cos(angle),
      vy: v * Math.sin(angle),
      m: 1,
      radius: 0.18,
      color: colors[i % colors.length]
    }));
  }

  return w;
}

// ==========================================
// SCENE B: JITTER GUARD
// ==========================================

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

// ==========================================
// SCENE C: N-BODY GRAVITY
// ==========================================

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

  w.addForce(new NewtonGravity(
    parseFloat(gravityInput.value),
    0.15
  ));

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

    const v = Math.sqrt(150 / r);

    w.add(new Body({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      vx: -v * Math.sin(theta),
      vy: v * Math.cos(theta),
      m: 0.15,
      radius: 0.16,
      color: colors[i]
    }));
  }

  return w;
}

// ==========================================
// SCENE D: SPRING NETWORK
// ==========================================

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

  const k = parseFloat(stiffnessInput.value);

  w.addForce(new Spring(left, a, k, 3));
  w.addForce(new Spring(a, b, k, 3));
  w.addForce(new Spring(b, right, k, 3));

  return w;
}

// ==========================================
// DIRECT MANIPULATION
// ==========================================

const interactions = setupInteractions(
  canvas,
  renderer,
  () => world,
  () => sceneSelect.value,
  () => {
    // New bodies add energy to the simulation.
    hud.reset(world);

    // Restart the graph at the new energy baseline.
    energyChart.reset();
    energyChart.record(world);

    status.textContent = 'New body launched';
  }
);

// ==========================================
// RECORD PHYSICS DATA
// ==========================================

function recordPhysicsData() {
  physicsStepCount++;

  // Record motion trails every four physics steps.
  if (physicsStepCount % 4 === 0) {
    for (const b of world.bodies) {
      if (!b.trail) {
        b.trail = [];
      }

      b.trail.push([b.pos.x, b.pos.y]);

      if (b.trail.length > 120) {
        b.trail.shift();
      }
    }
  }

  // Record energy every four physics steps.
  if (physicsStepCount % 4 === 0) {
    energyChart.record(world);
  }

  // Log a quantitative result after 60 seconds.
  
  if (!didLog60 && world.time >= 60) {
    didLog60 = true;

    const initialEnergy = hud.initialEnergy;
    const finalEnergy = world.totalEnergy();

    const energyError =
      initialEnergy !== 0
        ? 100 * Math.abs(finalEnergy - initialEnergy) /
          Math.abs(initialEnergy)
        : 0;

    const result = {
      scene: sceneSelect.value,
      time: world.time.toFixed(4),
      integrator: integratorSelect.value,
      restitution: world.restitution,
      initialEnergy: initialEnergy.toFixed(6),
      finalEnergy: finalEnergy.toFixed(6),
      energyErrorPercent: energyError.toFixed(6),
      finalMomentum: world.totalMomentum()
    };

    console.table(result);

    status.textContent =
      `60-second validation: Energy difference = ` +
      `${energyError.toFixed(6)}%`;
  }
}
// ==========================================
// RESET
// ==========================================

function reset() {
  const scene = sceneSelect.value;

  if (scene === 'slingshot') {
  world = makeSlingshot();
  } else if (scene === 'blocktest') {
  world = makeRotatingBlockTest();
  } else if (scene === 'orbits') {
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
  physicsStepCount = 0;

  // Attach the interaction force.
  interactions.attachToWorld(world);

  // Reset diagnostics.
  hud.reset(world);

  // Reset energy chart.
  energyChart.reset();
  energyChart.record(world);

  // Jitter guard test.
  if (scene === 'jitter') {
    world.jitterGuard =
      document.querySelector('#guard').checked;

    const before = world.bodies.map(b => b.vel.x);

    world.step(DT);
    recordPhysicsData();
    energyChart.record(world);

    const after = world.bodies.map(b => b.vel.x);

    paused = true;
    pauseButton.textContent = 'Resume';

    const guarded = world.jitterGuard;
    const reversed = after[0] > 0 && after[1] < 0;

    const outcome = guarded
      ? 'Guard ON: separating velocities preserved'
      : reversed
        ? 'Guard OFF: incorrect impulse reversed velocities'
        : 'Guard OFF: no reversal detected';

    status.style.whiteSpace = 'pre-wrap';

    status.textContent =
      `JITTER GUARD TEST\n${outcome}\n` +
      `Left ball: ${before[0].toFixed(2)} -> ${after[0].toFixed(2)} m/s\n` +
      `Right ball: ${before[1].toFixed(2)} -> ${after[1].toFixed(2)} m/s\n` +
      'Paused after one physics step.';

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
    pauseButton.textContent = 'Pause';
    status.style.whiteSpace = '';
    status.textContent = 'Scene ready';
  }
}

// ==========================================
// PAUSE AND SINGLE STEP
// ==========================================

function togglePause() {
  paused = !paused;

  if (paused) {
    accumulator = 0;
  }

  pauseButton.textContent =
    paused ? 'Resume' : 'Pause';
}

function singleStep() {
  if (!paused) return;

  world.jitterGuard =
    document.querySelector('#guard').checked;

  // Advance exactly one fixed timestep.
  world.step(DT);

  recordPhysicsData();

  // Always record the new energy for a manual step.
  energyChart.record(world);

  accumulator = 0;

  status.textContent =
    `Single step: t = ${world.time.toFixed(6)} s`;
}

// ==========================================
// SPEED CONTROL
// ==========================================

function setSpeed(value) {
  speed = Math.max(
    0.25,
    Math.min(2, value)
  );

  speedInput.value = speed;
  speedLabel.textContent = `${speed.toFixed(2)}×`;
}

// ==========================================
// ANIMATION LOOP
// ==========================================

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
    // Change simulation speed without changing DT.
    accumulator += frameSeconds * speed;

    let steps = 0;

    while (accumulator >= DT && steps < 30) {
      world.jitterGuard =
        document.querySelector('#guard').checked;

      world.step(DT);

      accumulator -= DT;
      steps++;

      // Update trails, energy, and diagnostics.
      recordPhysicsData();
    }

    // Prevent excessive backlog.
    if (steps === 30) {
      accumulator = 0;
    }
  }

  physicsMs = performance.now() - physicsStart;

  const renderStart = performance.now();

  // Draw the main simulation.
  renderer.draw(world);

  // Draw interaction guides.
  interactions.drawOverlay();

  // ========================================
  // POINTER CROSSHAIR AND COORDINATES
  // ========================================

  if (pointer.active && renderer.camera) {
    const ctx = canvas.getContext('2d');

    const px = renderer.camera.toScreenX(pointer.x);
    const py = renderer.camera.toScreenY(pointer.y);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(px - 10, py);
    ctx.lineTo(px + 10, py);
    ctx.moveTo(px, py - 10);
    ctx.lineTo(px, py + 10);
    ctx.stroke();

    const coordinates =
      `Cursor: (${pointer.x.toFixed(2)}, ` +
      `${pointer.y.toFixed(2)}) m`;

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    ctx.fillText(
      coordinates,
      15,
      canvas.height - 15
    );
  }

  // ========================================
  // ENERGY GRAPH
  // ========================================

  if (showEnergy.checked) {
    energyChart.draw();
  }

  renderMs = performance.now() - renderStart;

  // Update diagnostics.
  hud.update(world, fps, physicsMs, renderMs);

  requestAnimationFrame(frame);
}

// ==========================================
// LIVE PHYSICS SLIDERS
// ==========================================

gravityInput.addEventListener('input', () => {
  const G = Math.max(
    0.1,
    Math.min(2, parseFloat(gravityInput.value))
  );

  gravityInput.value = G;
  gravityLabel.textContent = G.toFixed(2);

  for (const force of world.forces) {
    if (force instanceof NewtonGravity) {
      force.G = G;
    }
  }

  hud.reset(world);
  energyChart.reset();
  energyChart.record(world);
});

stiffnessInput.addEventListener('input', () => {
  const k = Math.max(
    1,
    Math.min(40, parseFloat(stiffnessInput.value))
  );

  stiffnessInput.value = k;
  stiffnessLabel.textContent = `${k} N/m`;

  for (const force of world.forces) {
    if (force instanceof Spring) {
      force.k = k;
    }
  }

  hud.reset(world);
  energyChart.reset();
  energyChart.record(world);
});

// ==========================================
// HTML CONTROLS
// ==========================================

sceneSelect.addEventListener('change', reset);
integratorSelect.addEventListener('change', reset);

countInput.addEventListener('input', () => {
  countLabel.textContent = countInput.value;
  reset();
});

restitutionInput.addEventListener('input', () => {
  const restitution = parseFloat(restitutionInput.value);

  restLabel.textContent = restitution.toFixed(2);
  world.restitution = restitution;
});

speedInput.addEventListener('input', () => {
  setSpeed(parseFloat(speedInput.value));
});

document.querySelector('#reset')
  .addEventListener('click', reset);

pauseButton.addEventListener('click', togglePause);

document.querySelector('#step')
  .addEventListener('click', singleStep);

document.querySelector('#guard')
  .addEventListener('change', () => {
    if (sceneSelect.value === 'jitter') {
      reset();
    }
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

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

window.addEventListener('keydown', event => {
  const tag = event.target.tagName;

  // Preserve normal form and button behavior.
  if (
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA' ||
    tag === 'BUTTON' ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  ) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
  }

  if (event.code === 'Period') {
    event.preventDefault();
    singleStep();
  }

  if (event.code === 'KeyR') {
    event.preventDefault();
    reset();
  }

  if (
    event.key === '+' ||
    event.key === '='
  ) {
    event.preventDefault();
    setSpeed(speed + 0.25);
  }

  if (event.key === '-') {
    event.preventDefault();
    setSpeed(speed - 0.25);
  }
});

// ==========================================
// LAB 10 B3: RESPONSIVE CANVAS RESIZING
// ==========================================

function resizeCanvas() {
  const dpr = Math.min(
    window.devicePixelRatio || 1,
    3
  );

  // Resize the main simulation canvas.
  const simulationWidth = Math.max(
    1,
    Math.round(canvas.clientWidth * dpr)
  );

  const simulationHeight = Math.max(
    1,
    Math.round(canvas.clientHeight * dpr)
  );

  if (
    canvas.width !== simulationWidth ||
    canvas.height !== simulationHeight
  ) {
    canvas.width = simulationWidth;
    canvas.height = simulationHeight;
  }

  // Resize the energy graph.
  const graphCanvas = energyChart.canvas;

  const graphWidth = Math.max(
    1,
    Math.round(graphCanvas.clientWidth * dpr)
  );

  const graphHeight = Math.max(
    1,
    Math.round(graphCanvas.clientHeight * dpr)
  );

  if (
    graphCanvas.width !== graphWidth ||
    graphCanvas.height !== graphHeight
  ) {
    graphCanvas.width = graphWidth;
    graphCanvas.height = graphHeight;
  }

  // Redraw using the updated dimensions.
  if (world) {
    renderer.draw(world);
    energyChart.draw();
  }
}

window.addEventListener('resize', resizeCanvas);

// ==========================================
// START SIMULATION
// ==========================================

countLabel.textContent = countInput.value;

restLabel.textContent =
  parseFloat(restitutionInput.value).toFixed(2);

gravityLabel.textContent =
  parseFloat(gravityInput.value).toFixed(2);

stiffnessLabel.textContent =
  `${parseFloat(stiffnessInput.value)} N/m`;


setSpeed(1);
reset();

// Respect the user's reduced-motion preference.
if (
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
) {
  paused = true;
  pauseButton.textContent = 'Resume';
}

// Initialize high-resolution canvas dimensions.
resizeCanvas();

// Start the rendering loop.
requestAnimationFrame(frame);

