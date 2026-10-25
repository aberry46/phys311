import { Vec2 } from './engine/vec2.js';
import { Body } from './engine/body.js';
import { Gravity, Spring } from './engine/forces.js';
import { Euler, EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';
import { Camera } from './render/camera.js';
import { draw } from './render/renderer.js';

const G = 9.81;
const MAX_FRAME = 0.25;

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");
const logEl = document.getElementById("log");

let dtDenom = 240;
let DT = 1 / dtDenom;
let world, hud, paused = false;
let accumulator = 0;
let lastTime = performance.now() / 1000;
let fpsEMA = 60;

function makeIntegrator(name) {
  if (name === "euler")        return new Euler();
  if (name === "euler-cromer") return new EulerCromer();
  return new VelocityVerlet();
}

function buildProjectile(integratorName, v0 = 20, angleDeg = 50) {
  const w = new World(makeIntegrator(integratorName));
  const th = angleDeg * Math.PI / 180;
  w.add(new Body({
    mass: 1, radius: 0.35, color: "#ff8200",
    pos: new Vec2(0, 0),
    vel: new Vec2(v0 * Math.cos(th), v0 * Math.sin(th))
  }));
  w.addForce(new Gravity(G));
  w.primeAccelerations();
  w.meta = { kind: "projectile", camera: new Camera(13, 60, 470), yRef: 0 };
  return w;
}

function buildSpring(integratorName) {
  const w = new World(makeIntegrator(integratorName));
  const b = w.add(new Body({
    mass: 1, radius: 0.09, color: "#4ec9b0",
    pos: new Vec2(1, 0), vel: new Vec2(0, 0)
  }));
  w.addForce(new Spring(b, new Vec2(0, 0), 1.0, 0));
  w.primeAccelerations();
  w.meta = { kind: "spring", camera: new Camera(180, 450, 260), anchor: new Vec2(0, 0) };
  return w;
}

function buildScene(sceneName, integratorName) {
  return sceneName === "spring" ? buildSpring(integratorName)
                                : buildProjectile(integratorName);
}

function resetSim() {
  showPartA = false;
  const sceneName = document.getElementById("scene").value;
  const method    = document.getElementById("integrator").value;
  dtDenom = parseInt(document.getElementById("dt").value, 10);
  DT = 1 / dtDenom;

  world = buildScene(sceneName, method);
  hud = { E0: world.totalEnergy(), fps: 60, lastSteps: 0,
          method: method, dtDenom: dtDenom };
  accumulator = 0;
  lastTime = performance.now() / 1000;
}

function frame(nowMs) {
  const now = nowMs / 1000;
  let frameTime = now - lastTime;
  lastTime = now;

  if (frameTime > 0) {
    fpsEMA = 0.9 * fpsEMA + 0.1 * (1 / frameTime);
  }

  // Apply the same frame-time clamp in both modes.
  frameTime = Math.max(0, Math.min(frameTime, MAX_FRAME));

  const mode = document.getElementById("timestepMode").value;
  hud.mode = mode;
  hud.fps = fpsEMA;
  hud.maxEnergyError = hud.maxEnergyError ?? 0;
  hud.lastDt = hud.lastDt ?? 0;

  let n = 0;

  function advance(dt) {
    world.step(dt);
    n++;
    hud.lastDt = dt;

    const b = world.bodies[0];
    b.trail.push(b.pos.clone());

    if (b.trail.length > 200) {
      b.trail.shift();
    }

    const relativeError = hud.E0 === 0
      ? 0
      : Math.abs((world.totalEnergy() - hud.E0) / hud.E0);

    hud.maxEnergyError = Math.max(
      hud.maxEnergyError,
      relativeError
    );

    if (world.meta.kind === "projectile" && b.pos.y < 0) {
      paused = true;
      document.getElementById("pause").textContent = "Resume";
    }
  }

  if (!paused && !showPartA) {
    if (mode === "fixed") {
      accumulator += frameTime;

      while (accumulator >= DT) {
        advance(DT);
        accumulator -= DT;

        if (paused) break;
      }
    } else {
      // One physics step using the measured frame duration.
      accumulator = 0;

      if (frameTime > 0) {
        advance(frameTime);
      }
    }
  }

  hud.lastSteps = n;

  if (showPartA) {
    drawPartA();
  } else {
    draw(ctx, canvas, world, hud);
  }

  requestAnimationFrame(frame);
}

// Logging Helpers & Validation Suite
function clearLog() { logEl.textContent = ""; }
function say(s, cls) {
  console.log(s);

  const span = document.createElement("span");
  if (cls) span.className = cls;

  span.textContent = s + "\n";
  logEl.appendChild(span);
  logEl.scrollTop = logEl.scrollHeight;
}

function vec2SelfTest() {
  const a = new Vec2(3, 4), b = new Vec2(1, -2);
  say("=== Vec2 self-test (Lab 8 Part A) ===", "dim");
  const checks = [
    ["a.add(b)",       `(${a.add(b).x}, ${a.add(b).y})`,            "(4, 2)"],
    ["a.sub(b)",       `(${a.sub(b).x}, ${a.sub(b).y})`,            "(2, 6)"],
    ["a.mul(2)",       `(${a.mul(2).x}, ${a.mul(2).y})`,            "(6, 8)"],
    ["a.dot(b)",       a.dot(b).toFixed(10),                        "-5.0000000000"],
    ["a.length()",     a.length().toFixed(10),                      "5.0000000000"],
    ["a.lengthSq()",   a.lengthSq().toFixed(10),                    "25.0000000000"],
    ["a.normalized()", `(${a.normalized().x.toFixed(10)}, ${a.normalized().y.toFixed(10)})`,
                       "(0.6000000000, 0.8000000000)"],
    ["|normalized|",   a.normalized().length().toFixed(15),         "1.000000000000000"]
  ];
  let allPass = true;
  for (const [name, got, want] of checks) {
    const pass = got === want;
    if (!pass) allPass = false;
    say((pass ? "  PASS  " : "  FAIL  ") + name.padEnd(16) + "= " + got.padEnd(30) +
        (pass ? "" : " expected " + want), pass ? "ok" : "bad");
  }
  say(allPass ? "  -> all tested Vec2 operations match the expected values."
              : "  -> MISMATCH: fix Vec2 before trusting anything downstream.",
      allPass ? "ok" : "bad");
  say("");
}

function runHeadless(sceneName, method, dt, tEnd) {
   // Keep validation button, only checking 25 m/s, 45 deg reference.
  const w = sceneName === "projectile"
    ? buildProjectile(method, 25, 45)
    : buildSpring(method);
  const E0 = w.totalEnergy();
  let Emin = E0, Emax = E0;
  while (w.time < tEnd - 1e-12) {
    w.step(dt);
    const E = w.totalEnergy();
    if (E < Emin) Emin = E;
    if (E > Emax) Emax = E;
  }
  const b = w.bodies[0];
  return { x: b.pos.x, y: b.pos.y, vx: b.vel.x, vy: b.vel.y,
           t: w.time, n: w.steps, E0: E0, E: w.totalEnergy(),
           worst: Math.max(Math.abs(Emax - E0), Math.abs(Emin - E0)) / E0 };
}

function row(label, got, ref, tol) {
  const err = Math.abs(got - ref);
  const pass = err <= tol;
  say("  " + (pass ? "PASS" : "FAIL") + "  " + label.padEnd(22) +
      got.toFixed(12).padStart(18) + ref.toFixed(12).padStart(20) +
      ("  err " + err.toExponential(2)), pass ? "ok" : "bad");
  return pass;
}

function validate() {
  clearLog();
  vec2SelfTest();

  const DTv = 1 / 240;
  let allPass = true;

  say("=== Projectile: v0=25 m/s @ 45 deg, DT=1/240, t_end=2.0 s ===", "dim");
  say("        quantity                        JavaScript       Python (ref)");

  const REF = {
    "euler-cromer": { x: 35.355339059327, y: 15.694464059327,
                      vy: -1.942330470336, dE: -1.283148e-3 },
    "verlet":       { x: 35.355339059327, y: 15.735339059327,
                      vy: -1.942330470336, dE: 2.364686e-15 }
  };

  for (const m of ["euler-cromer", "verlet"]) {
    const r = runHeadless("projectile", m, DTv, 2.0);
    say("  -- " + m + "  (" + r.n + " steps) --", "dim");
    if (r.n !== 480) {
      say("  FAIL  step count = " + r.n + ", expected 480 " +
          "-> your loop condition is wrong; nothing else will match.", "bad");
      allPass = false;
    }
    allPass = row("x (m)",  r.x,  REF[m].x,  1e-9) && allPass;
    allPass = row("y (m)",  r.y,  REF[m].y,  1e-9) && allPass;
    allPass = row("vy (m/s)", r.vy, REF[m].vy, 1e-9) && allPass;
    const dE = (r.E - r.E0) / r.E0;
    say("        dE/E0" + " ".padEnd(17) +
        (dE >= 0 ? "+" : "") + dE.toExponential(6).padStart(17) +
        ("  ref " + REF[m].dE.toExponential(6)), "dim");
  }

  say("");
  say("=== Euler-Cromer error vs. the Week 2 §5.5 closed form ===", "dim");
  const ec = runHeadless("projectile", "euler-cromer", DTv, 2.0);
  const yExact = 25 * Math.sin(45 * Math.PI / 180) * 2 - 0.5 * G * 4;
  const dyMeas = ec.y - yExact;
  const dyPred = -0.5 * G * 2.0 * DTv;
  say("  measured  y_EC - y_exact  = " + dyMeas.toFixed(15) + " m");
  say("  predicted -0.5*g*t*dt     = " + dyPred.toFixed(15) + " m");
  say("  difference                = " + Math.abs(dyMeas - dyPred).toExponential(2) + " m",
      Math.abs(dyMeas - dyPred) < 1e-11 ? "ok" : "bad");

  say("");
  say("=== Spring oscillator: m=k=1, x0=1, v0=0, 10 periods, DT=1/240 ===", "dim");
  const T10 = 10 * 2 * Math.PI;
  const refWorst = { "euler": 2.992709e-1, "euler-cromer": 2.087683e-3,
                     "verlet": 4.340278e-6 };
  const refX = { "euler": 1.139854950642, "euler-cromer": 0.999995657522,
                 "verlet": 0.999998836099 };
  say("  method        x(10T)            max|dE|/E0      Python ref");
  for (const m of ["euler", "euler-cromer", "verlet"]) {
    const r = runHeadless("spring", m, DTv, T10);
    const okx = Math.abs(r.x - refX[m]) < 1e-9;
    if (!okx) allPass = false;
    say("  " + (okx ? "PASS" : "FAIL") + "  " + m.padEnd(14) +
        r.x.toFixed(12).padStart(16) + r.worst.toExponential(3).padStart(16) +
        refWorst[m].toExponential(3).padStart(16), okx ? "ok" : "bad");
  }

  say("");
  say("=== Fixed-timestep accumulator: frame-rate independence ===", "dim");
  function accRun(frames, clamp) {
    let acc = 0, t = 0, steps = 0, worst = 0;
    for (let ft of frames) {
      if (ft > clamp) ft = clamp;
      acc += ft;
      let k = 0;
      while (acc >= DTv) { t += DTv; steps++; k++; acc -= DTv; }
      if (k > worst) worst = k;
    }
    return { t, steps, worst };
  }
  const smooth = new Array(600).fill(1 / 60);
  const hi     = new Array(1440).fill(1 / 144);
  const jitter = [];
  for (let i = 0; i < 300; i++) jitter.push(1 / 40, 1 / 120);

  say("  pattern         frames   steps        sim_t(s)   worst steps/frame");
  for (const [name, f] of [["smooth 60 Hz", smooth], ["144 Hz", hi],
                           ["jittery", jitter]]) {
    const r = accRun(f, MAX_FRAME);
    const ok = r.steps === 2400 && Math.abs(r.t - 10) < 1e-9;
    if (!ok) allPass = false;
    say("  " + (ok ? "PASS" : "FAIL") + "  " + name.padEnd(14) +
        String(f.length).padStart(7) + String(r.steps).padStart(8) +
        r.t.toFixed(10).padStart(16) + String(r.worst).padStart(16),
        ok ? "ok" : "bad");
  }

  const stall = new Array(300).fill(1 / 60);
  stall.push(2.0);
  for (let i = 0; i < 299; i++) stall.push(1 / 60);
  const c1 = accRun(stall, MAX_FRAME), c2 = accRun(stall, 1e9);
  say("");
  say("=== Why the frame-time clamp matters (one 2 s tab-switch) ===", "dim");
  say("  clamped at 0.25 s : worst frame = " + c1.worst + " steps, " +
      "sim_t = " + c1.t.toFixed(4) + " s", "ok");
  say("  NO clamp          : worst frame = " + c2.worst + " steps, " +
      "sim_t = " + c2.t.toFixed(4) + " s", "bad");

  say("");
  say(allPass
      ? "######  ALL CHECKS PASSED -- this port agrees with Python to 1e-9+  ######"
      : "######  SOME CHECKS FAILED -- see the FAIL rows above  ######",
      allPass ? "ok" : "bad");
}

// UI Event Listeners
document.getElementById("pause").addEventListener("click", (e) => {
  paused = !paused;
  e.target.textContent = paused ? "Resume" : "Pause";
  lastTime = performance.now() / 1000;
});

document.getElementById("reset").addEventListener("click", () => {
  resetSim();
  paused = false;
  document.getElementById("pause").textContent = "Pause";
});

for (const id of ["integrator", "scene", "dt", "timestepMode"]) {
  document.getElementById(id).addEventListener("change", () => {
    resetSim();
    paused = false;
    document.getElementById("pause").textContent = "Pause";
  });
}

document.getElementById("validate").addEventListener("click", validate);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); document.getElementById("pause").click(); }
  if (e.key === "r" || e.key === "R") document.getElementById("reset").click();
});

// Part A: static coordinate-system demonstration
let showPartA = false;

function drawPartA() {
  // 60 pixels represents 1 meter.
  // The physics origin is near the bottom-left of the canvas.
  const cam = new Camera(60, 60, canvas.height - 60);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px monospace";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  const originX = cam.toScreenX(0);
  const originY = cam.toScreenY(0);

  // Horizontal axis: ground at y = 0.
  ctx.strokeStyle = "#28a745";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(canvas.width - 20, originY);
  ctx.stroke();

  // Vertical axis: positive y points upward.
  ctx.strokeStyle = "#cccccc";
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX, 20);
  ctx.stroke();

  // Tick marks and numeric labels every 1 meter along x.
  ctx.fillStyle = "#eeeeee";
  for (let x = 0; cam.toScreenX(x) <= canvas.width - 30; x++) {
    const px = cam.toScreenX(x);

    ctx.beginPath();
    ctx.moveTo(px, originY - 5);
    ctx.lineTo(px, originY + 5);
    ctx.stroke();

    ctx.fillText(String(x), px, originY + 20);
  }

  // Tick marks and numeric labels every 1 meter along y.
  ctx.textAlign = "right";
  for (let y = 1; cam.toScreenY(y) >= 30; y++) {
    const py = cam.toScreenY(y);

    ctx.beginPath();
    ctx.moveTo(originX - 5, py);
    ctx.lineTo(originX + 5, py);
    ctx.stroke();

    ctx.fillText(String(y), originX - 10, py + 4);
  }

  // Required circle: center (2, 3) m, radius 0.3 m.
  const center = new Vec2(2, 3);
  const px = cam.toScreenX(center.x);
  const py = cam.toScreenY(center.y);

  ctx.fillStyle = "#ff8200";
  ctx.beginPath();
  ctx.arc(px, py, cam.toScreenLen(0.3), 0, 2 * Math.PI);
  ctx.fill();

  // Scene labels.
  ctx.textAlign = "left";
  ctx.fillStyle = "#eeeeee";
  ctx.fillText("(2, 3) m; radius = 0.3 m", px + 25, py);
  ctx.fillText("y (m)", originX + 10, 25);
  ctx.fillText("x (m)", canvas.width - 55, originY + 40);
  ctx.fillText("Scale: 60 pixels per meter", 300, 30);
}

document.getElementById("partA").addEventListener("click", () => {
  showPartA = true;
  paused = true;
  document.getElementById("pause").textContent = "Resume";

  console.log("Part A coordinate check:");
  console.log("Scale: 60 pixels/m");
  console.log("Circle center: 120 pixels right of the origin");
  console.log("Circle center: 180 pixels above the ground");
  console.log("Circle radius: 18 pixels");
});

// Reset returns to the animated simulation.
document.getElementById("reset").addEventListener("click", () => {
  showPartA = false;
});

// C1: comparison against our Lab 7 Python engine.
function runC1() {
  const dt = 1 / 120;
  const steps = 240;

  // Explicitly use the assignment's launch conditions.
  const testWorld = buildProjectile("verlet", 20, 50);

  // No rendering, frame timing, or ground-stop condition.
  for (let i = 0; i < steps; i++) {
    testWorld.step(dt);
  }

  const body = testWorld.bodies[0];

  const results = {
    x: body.pos.x,
    y: body.pos.y,
    vx: body.vel.x,
    vy: body.vel.y,
    E_total: testWorld.totalEnergy()
  };

  console.log("C1: JAVASCRIPT RESULTS");
  console.log("Steps:", steps);
  console.log("Simulated time:", steps * dt, "s");

  for (const [quantity, value] of Object.entries(results)) {
    console.log(quantity + " = " + value.toPrecision(17));
  }

  return results;
}

// Allow the test to be called from the browser Console.
window.runC1 = runC1;

document.getElementById("lag").addEventListener("click", () => {
  if (paused || showPartA) return;

  // Deliberately block the browser briefly for the C2 experiment.
  const start = performance.now();

  while (performance.now() - start < 250) {
    // Intentional busy-wait.
  }
});

// Start application
resetSim();
vec2SelfTest();
requestAnimationFrame(frame);
