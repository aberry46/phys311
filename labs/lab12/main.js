import { Body } from './engine/body.js';
import {
  Gravity,
  NewtonGravity,
  Spring
} from './engine/forces.js';
import {
  Euler,
  EulerCromer,
  VelocityVerlet
} from './engine/integrators.js';
import { World } from './engine/world.js';
import { Renderer } from './render/renderer.js';
import { HUD } from './render/hud.js';
import { setupPointerInput } from './input.js';
import { setupInteractions } from './interaction.js';
import { EnergyChart } from './render/energy-chart.js';

// ==========================================
// PHYS 311 - SLINGSHOT DESTRUCTION
// SIMULATION CONFIGURATION
// ==========================================

const DT = 1 / 240;
const G = 9.81;
const GROUND_Y = -4.5;
const CONTACT_ITERATIONS = 4;

// Maximum simulated-time budget before catch-up is capped.
const MAX_FRAME_TIME = 0.05;
const MAX_STEPS_PER_FRAME = 30;

// Limit accumulated projectiles in long sessions.
const MAX_ACTIVE_PROJECTILES = 20;

const colors = [
  '#f97316',
  '#38bdf8',
  '#a78bfa',
  '#4ade80',
  '#f472b6',
  '#facc15'
];

// ==========================================
// DOM AND RENDERER
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
const guardInput = document.querySelector('#guard');

const conservativeInput =
  document.querySelector('#conservative');

const debugInput =
  document.querySelector('#debug');

const performanceWarning =
  document.querySelector('#performance-warning');

const urlParams = new URLSearchParams(
  window.location.search
);

conservativeInput.checked =
  urlParams.get('conservative') === '1';

debugInput.checked =
  urlParams.get('debug') === '1';

hud.setDebug(debugInput.checked);

const energyChart = new EnergyChart(
  document.querySelector('#energy-chart')
);

// ==========================================
// SIMULATION STATE
// ==========================================

let world;
let paused = false;
let accumulator = 0;
let previousFrame = null;

let fps = 60;
let physicsMs = 0;
let renderMs = 0;

let speed = 1;
let physicsStepCount = 0;
let didLog60 = false;

let shotsFired = 0;
let previousTargetsHit = 0;

// ==========================================
// PERFORMANCE INSTRUMENTATION
// ==========================================

const performanceData = {
  droppedTime: 0,
  droppedFrames: 0,
  lastFrameMs: 0,
  stepsLastFrame: 0
};

function resetPerformance() {
  performanceData.droppedTime = 0;
  performanceData.droppedFrames = 0;
  performanceData.lastFrameMs = 0;
  performanceData.stepsLastFrame = 0;
}

function showPerformanceWarning() {
  if (!performanceWarning) return;

  if (performanceData.droppedTime <= 0) {
    performanceWarning.hidden = true;
    return;
  }

  performanceWarning.hidden = false;

  performanceWarning.textContent =
    'Performance notice: ' +
    `${performanceData.droppedTime.toFixed(2)} s ` +
    'of real time has been discarded during slow frames. ' +
    'The physics timestep remains fixed, but the ' +
    'simulation may progress slower than real time.';
}

// ==========================================
// SCENE-SPECIFIC CONTROLS
// ==========================================

function updateSceneControls() {
  const scene = sceneSelect.value;

  const controls = {
    count: scene === 'billiards',
    gravity: scene === 'orbits',
    stiffness: scene === 'springs',
    restitution:
      scene === 'slingshot' ||
      scene === 'billiards',
    guard: scene === 'jitter'
  };

  for (const [id, enabled] of Object.entries(controls)) {
    const input = document.getElementById(id);

    const label = document.querySelector(
      `label[for="${id}"]`
    );

    const allowed =
      enabled &&
      !(id === 'restitution' && world?.conservativeMode);

    if (input) {
      input.disabled = !allowed;
    }

    if (label) {
      label.style.opacity = allowed ? '1' : '0.4';
    }
  }
}

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

showTrails.addEventListener(
  'change',
  updateVisualSettings
);

showVelocity.addEventListener(
  'change',
  updateVisualSettings
);

showEnergy.addEventListener(
  'change',
  updateVisualSettings
);

updateVisualSettings();

// ==========================================
// INTEGRATOR SELECTION
// ==========================================

function integrator() {
  switch (integratorSelect.value) {
    case 'verlet':
      return new VelocityVerlet();

    case 'cromer':
      return new EulerCromer();

    default:
      return new Euler();
  }
}

// ==========================================
// BODY CREATION
// ==========================================

function addBlock(
  sceneWorld,
  x,
  y,
  width,
  height,
  mass,
  color = '#c68c53'
) {
  return sceneWorld.add(new Body({
    shape: 'rectangle',
    x,
    y,
    width,
    height,
    m: mass,
    color
  }));
}

function addTarget(
  sceneWorld,
  x,
  y,
  radius = 0.35
) {
  return sceneWorld.add(new Body({
    shape: 'circle',
    x,
    y,
    radius,
    m: 1,
    isStatic: true,
    isTarget: true,
    color: '#ef4444'
  }));
}

// ==========================================
// SCENE 1: SLINGSHOT DESTRUCTION
// ==========================================

function makeSlingshot() {
  const w = new World({
    integrator: integrator(),
    restitution: parseFloat(restitutionInput.value),
    pairCollisions: true,
    contactIterations: CONTACT_ITERATIONS
  });

  w.viewBounds = {
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6
  };

  w.groundY = GROUND_Y;

  w.addForce(new Gravity(G));

  w.launcher = {
    x: -7,
    y: GROUND_Y + 0.6
  };

  // Supporting columns
  addBlock(
    w, 3.0, GROUND_Y + 1,
    0.8, 2.0, 3, '#c68c53'
  );

  addBlock(
    w, 5.0, GROUND_Y + 1,
    0.8, 2.0, 3, '#c68c53'
  );

  // Horizontal beam
  addBlock(
    w, 4.0, GROUND_Y + 2.25,
    3.2, 0.5, 3, '#d7a36c'
  );

  // Targets
  addTarget(w, 4.0, GROUND_Y + 0.35);
  addTarget(w, 7.0, GROUND_Y + 0.35);

  return w;
}

// ==========================================
// SCENE 2: BILLIARDS
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

  const count = parseInt(countInput.value, 10);
  const columns = 20;
  const rows = Math.ceil(count / columns);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;

    const x =
      -9.2 + (col + 0.5) * (18.4 / columns);

    const y =
      -5.2 + (row + 0.5) * (10.4 / rows);

    const angle =
      (i * 2.39996) % (2 * Math.PI);

    const v =
      1.8 + (i % 5) * 0.3;

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
// SCENE 3: JITTER GUARD
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
// SCENE 4: N-BODY GRAVITY
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
// SCENE 5: SPRING NETWORK
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
// ENERGY BASELINE
// ==========================================

function resetMeasurements() {
  hud.reset(world);

  energyChart.reset();
  energyChart.record(world);
}

// ==========================================
// GAME STATUS
// ==========================================

function updateGameStatus() {
  if (sceneSelect.value !== 'slingshot') {
    return;
  }

  const targets = world.targetStatus();

  if (targets.complete) {
    status.textContent =
      `ALL TARGETS DESTROYED! | ` +
      `Shots fired: ${shotsFired} | ` +
      'Press R to restart';

    return;
  }

  status.textContent =
    `Targets: ${targets.hit}/${targets.total} | ` +
    `Shots fired: ${shotsFired} | ` +
    'Drag or use WASD + Enter to launch';
}

// ==========================================
// INTERACTION SYSTEM
// ==========================================

const interactions = setupInteractions(
  canvas,
  renderer,
  () => world,
  () => sceneSelect.value,

  () => {
    // The interaction module adds a projectile
    // before invoking this callback.
    if (sceneSelect.value === 'slingshot') {
      const launched = world.bodies.at(-1);

      if (
        launched &&
        launched.shape === 'circle' &&
        !launched.isStatic
      ) {
        launched.isProjectile = true;
      }

      shotsFired++;

      // Limit the number of retained projectiles.
      cleanupProjectiles();

      updateGameStatus();
    } else {
      status.textContent = 'New body launched';
    }

    resetMeasurements();
  }
);

// ==========================================
// PROJECTILE MANAGEMENT
// ==========================================

function cleanupProjectiles() {
  if (sceneSelect.value !== 'slingshot') {
    return;
  }

  const projectiles = world.bodies.filter(
    body => body.isProjectile === true
  );

  // Remove older projectiles first.
  const excess = Math.max(
    0,
    projectiles.length - MAX_ACTIVE_PROJECTILES
  );

  const oldest = new Set(
    projectiles.slice(0, excess)
  );

  const oldCount = world.bodies.length;

  world.bodies = world.bodies.filter(body => {
    if (oldest.has(body)) {
      return false;
    }

    if (!body.isProjectile) {
      return true;
    }

    return (
      body.pos.x > -25 &&
      body.pos.x < 25 &&
      body.pos.y > -15 &&
      body.pos.y < 40
    );
  });

  if (world.bodies.length !== oldCount) {
    resetMeasurements();
  }
}

// ==========================================
// SLINGSHOT UPDATE
// ==========================================

function updateSlingshot() {
  if (sceneSelect.value !== 'slingshot') {
    return;
  }

  cleanupProjectiles();

  const targets = world.targetStatus();

  if (targets.hit !== previousTargetsHit) {
    previousTargetsHit = targets.hit;

    updateGameStatus();

    console.log(
      `Targets destroyed: ${targets.hit}/${targets.total}`
    );
  }
}

// ==========================================
// PHYSICS DATA RECORDING
// ==========================================

function recordPhysicsData() {
  physicsStepCount++;

  if (physicsStepCount % 4 === 0) {
    if (renderer.showTrails) {
      for (const body of world.bodies) {
        if (!body.trail) {
          body.trail = [];
        }

        body.trail.push([
          body.pos.x,
          body.pos.y
        ]);

        if (body.trail.length > 120) {
          body.trail.shift();
        }
      }
    }

    if (showEnergy.checked) {
      energyChart.record(world);
    }
  }

  updateSlingshot();

  // Quantitative report after 60 s of simulation time.
  if (!didLog60 && world.time >= 60) {
    didLog60 = true;

    const E0 = hud.initialEnergy;
    const E = world.totalEnergy();

    const energyChange =
      Math.abs(E0) > 1e-12
        ? 100 * (E - E0) / Math.abs(E0)
        : null;

    console.table({
      scene: sceneSelect.value,
      time: world.time,
      integrator: integratorSelect.value,
      conservativeMode: world.conservativeMode,
      restitution: world.conservativeMode
        ? 1
        : world.restitution,
      baselineEnergy: E0,
      currentEnergy: E,
      energyChangePercent: energyChange,
      momentum: world.totalMomentum(),
      angularMomentum: world.totalAngularMomentum(),
      droppedRealTimeSeconds:
        performanceData.droppedTime
    });
  }
}

// ==========================================
// RESET
// ==========================================

function reset() {
  const scene = sceneSelect.value;

  if (scene === 'slingshot') {
    world = makeSlingshot();
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

  physicsStepCount = 0;
  didLog60 = false;

  shotsFired = 0;
  previousTargetsHit = 0;

  resetPerformance();

  interactions.attachToWorld(world);

  world.setConservativeMode(
    conservativeInput.checked
  );

  hud.setDebug(debugInput.checked);

  updateSceneControls();
  resetMeasurements();

  paused = false;
  pauseButton.textContent = 'Pause';

  status.style.whiteSpace = '';

  showPerformanceWarning();

  if (scene === 'slingshot') {
    updateGameStatus();
    return;
  }

  if (scene === 'jitter') {
    world.jitterGuard = guardInput.checked;

    const before = world.bodies.map(
      body => body.vel.x
    );

    world.step(DT);
    recordPhysicsData();

    const after = world.bodies.map(
      body => body.vel.x
    );

    paused = true;
    pauseButton.textContent = 'Resume';

    status.style.whiteSpace = 'pre-wrap';

    status.textContent =
      `JITTER GUARD TEST\n` +
      `Left: ${before[0].toFixed(2)} -> ` +
      `${after[0].toFixed(2)} m/s\n` +
      `Right: ${before[1].toFixed(2)} -> ` +
      `${after[1].toFixed(2)} m/s`;

    return;
  }

  status.textContent = 'Scene ready';
}

// ==========================================
// PLAYBACK CONTROLS
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

  world.jitterGuard = guardInput.checked;

  world.step(DT);
  recordPhysicsData();

  if (showEnergy.checked) {
    energyChart.record(world);
  }

  accumulator = 0;

  status.textContent =
    `Single step: t = ${world.time.toFixed(6)} s`;
}

function setSpeed(value) {
  speed = Math.max(
    0.25,
    Math.min(2, value)
  );

  speedInput.value = speed;

  speedLabel.textContent =
    `${speed.toFixed(2)}×`;
}

// ==========================================
// FIXED-TIMESTEP ANIMATION LOOP
// ==========================================

function frame(timestamp) {
  if (previousFrame === null) {
    previousFrame = timestamp;
  }

  const elapsed = Math.max(
    0,
    (timestamp - previousFrame) / 1000
  );

  previousFrame = timestamp;

  performanceData.lastFrameMs = elapsed * 1000;

  // Moving average of actual animation frames.
  if (elapsed > 0) {
    const currentFPS = 1 / elapsed;

    fps = 0.9 * fps + 0.1 * currentFPS;
  }

  // Cap the amount of real time used for catch-up.
  const frameSeconds = Math.min(
    elapsed,
    MAX_FRAME_TIME
  );

  let discardedSeconds = Math.max(
    0,
    elapsed - frameSeconds
  );

  // ========================================
  // PHYSICS UPDATE
  // ========================================

  const physicsStart = performance.now();

  let steps = 0;

  if (!paused) {
    accumulator += frameSeconds * speed;

    while (
      accumulator >= DT &&
      steps < MAX_STEPS_PER_FRAME
    ) {
      world.jitterGuard = guardInput.checked;

      world.step(DT);

      accumulator -= DT;
      steps++;

      recordPhysicsData();
    }

    // Avoid an unlimited backlog of physics steps.
    if (
      steps === MAX_STEPS_PER_FRAME &&
      accumulator >= DT
    ) {
      discardedSeconds += accumulator / speed;
      accumulator = 0;
    }

    if (discardedSeconds > 0) {
      performanceData.droppedFrames++;
      performanceData.droppedTime += discardedSeconds;
    }
  }

  performanceData.stepsLastFrame = steps;

  physicsMs =
    performance.now() - physicsStart;

  // ========================================
  // RENDERING
  // ========================================

  const renderStart = performance.now();

  renderer.draw(world);
  interactions.drawOverlay();

  if (pointer.active && renderer.camera) {
    const ctx = canvas.getContext('2d');

    const px =
      renderer.camera.toScreenX(pointer.x);

    const py =
      renderer.camera.toScreenY(pointer.y);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(px - 10, py);
    ctx.lineTo(px + 10, py);
    ctx.moveTo(px, py - 10);
    ctx.lineTo(px, py + 10);
    ctx.stroke();

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    ctx.fillText(
      `Cursor: (${pointer.x.toFixed(2)}, ` +
      `${pointer.y.toFixed(2)}) m`,
      15,
      canvas.height - 15
    );
  }

  if (showEnergy.checked) {
    energyChart.draw();
  }

  renderMs =
    performance.now() - renderStart;

  hud.update(
    world,
    fps,
    physicsMs,
    renderMs,
    performanceData
  );

  showPerformanceWarning();

  requestAnimationFrame(frame);
}

// ==========================================
// GRAVITY CONTROL
// ==========================================

gravityInput.addEventListener('input', () => {
  const value = parseFloat(
    gravityInput.value
  );

  gravityLabel.textContent =
    value.toFixed(2);

  for (const force of world.forces) {
    if (force instanceof NewtonGravity) {
      force.G = value;
    }
  }

  resetMeasurements();
});

// ==========================================
// SPRING CONTROL
// ==========================================

stiffnessInput.addEventListener('input', () => {
  const k = parseFloat(
    stiffnessInput.value
  );

  stiffnessLabel.textContent =
    `${k} N/m`;

  for (const force of world.forces) {
    if (force instanceof Spring) {
      force.k = k;
    }
  }

  resetMeasurements();
});

// ==========================================
// INTERFACE EVENTS
// ==========================================

sceneSelect.addEventListener(
  'change',
  reset
);

integratorSelect.addEventListener(
  'change',
  reset
);

countInput.addEventListener('input', () => {
  countLabel.textContent = countInput.value;
  reset();
});

restitutionInput.addEventListener('input', () => {
  const e = parseFloat(
    restitutionInput.value
  );

  restLabel.textContent = e.toFixed(2);

  if (!world.conservativeMode) {
    world.restitution = e;
  }
});

speedInput.addEventListener('input', () => {
  setSpeed(parseFloat(speedInput.value));
});

document.querySelector('#reset')
  .addEventListener('click', reset);

pauseButton.addEventListener(
  'click',
  togglePause
);

document.querySelector('#step')
  .addEventListener('click', singleStep);

guardInput.addEventListener('change', () => {
  if (sceneSelect.value === 'jitter') {
    reset();
  }
});

// ==========================================
// CONSERVATIVE MODE
// ==========================================

conservativeInput.addEventListener(
  'change',
  () => {
    // Rebuild the scene to create a clean
    // initial condition for each test mode.
    reset();

    status.textContent =
      conservativeInput.checked
        ? 'Conservative test mode enabled. Scene reset.'
        : 'Normal collision mode restored. Scene reset.';
  }
);

// ==========================================
// DEBUG MODE
// ==========================================

debugInput.addEventListener('change', () => {
  hud.setDebug(debugInput.checked);
});

// ==========================================
// MEASUREMENT REPORT
// ==========================================

document.querySelector('#report')
  .addEventListener('click', () => {
    const momentum = world.totalMomentum();

    const maxSpeed = Math.max(
      0,
      ...world.bodies.map(body =>
        Math.hypot(
          body.vel.x,
          body.vel.y
        )
      )
    );

    console.table({
      scene: sceneSelect.value,
      simulationTime: world.time,
      bodies: world.bodies.length,
      timestep: DT,
      contactIterations: world.contactIterations,
      conservativeMode: world.conservativeMode,
      energy: world.totalEnergy(),
      baselineEnergy: hud.initialEnergy,
      momentumX: momentum.x,
      momentumY: momentum.y,
      momentumMagnitude: momentum.magnitude,
      angularMomentum: world.totalAngularMomentum(),
      maxSpeed,
      shotsFired,
      fps,
      lastFrameMs:
        performanceData.lastFrameMs,
      physicsMs,
      renderMs,
      cappedFrames:
        performanceData.droppedFrames,
      discardedRealTimeSeconds:
        performanceData.droppedTime
    });

    status.textContent =
      'Measurements logged to Console (F12)';
  }
);

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

window.addEventListener('keydown', event => {
  const tag = event.target?.tagName;

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

  if (event.repeat) return;

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
// RESPONSIVE CANVAS
// ==========================================

function resizeCanvas() {
  const dpr = Math.min(
    window.devicePixelRatio || 1,
    3
  );

  canvas.width = Math.max(
    1,
    Math.round(canvas.clientWidth * dpr)
  );

  canvas.height = Math.max(
    1,
    Math.round(canvas.clientHeight * dpr)
  );

  const graphCanvas = energyChart.canvas;

  graphCanvas.width = Math.max(
    1,
    Math.round(graphCanvas.clientWidth * dpr)
  );

  graphCanvas.height = Math.max(
    1,
    Math.round(graphCanvas.clientHeight * dpr)
  );

  if (world) {
    renderer.draw(world);
    energyChart.draw();
  }
}

window.addEventListener(
  'resize',
  resizeCanvas
);

// ==========================================
// START SIMULATION
// ==========================================

countLabel.textContent = countInput.value;

restLabel.textContent =
  parseFloat(restitutionInput.value)
    .toFixed(2);

gravityLabel.textContent =
  parseFloat(gravityInput.value)
    .toFixed(2);

stiffnessLabel.textContent =
  `${parseFloat(stiffnessInput.value)} N/m`;

setSpeed(1);
reset();

if (
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
) {
  paused = true;
  pauseButton.textContent = 'Resume';
}

resizeCanvas();
requestAnimationFrame(frame);