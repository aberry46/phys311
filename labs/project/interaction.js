
import { Body } from './engine/body.js';
import { eventToWorld } from './input.js';

// ==========================================
// MOUSE-CONTROLLED DAMPED SPRING
// ==========================================

export class MouseSpring {

  constructor() {
    this.body = null;
    this.target = null;

    this.k = 180;
    this.c = 20;
  }

  apply(world) {

    if (!this.body || !this.target) return;
    if (!world.bodies.includes(this.body)) return;
    if (this.body.isStatic) return;

    const b = this.body;

    const dx = this.target.x - b.pos.x;
    const dy = this.target.y - b.pos.y;

    b.force.x +=
      b.m * (this.k * dx - this.c * b.vel.x);

    b.force.y +=
      b.m * (this.k * dy - this.c * b.vel.y);
  }

  release() {

    this.body = null;
    this.target = null;
  }
}

// ==========================================
// INTERACTION SYSTEM
// ==========================================

export function setupInteractions(
  canvas,
  renderer,
  getWorld,
  getScene,
  onLaunch
) {

  const spring = new MouseSpring();

  let aimStart = null;
  let aimEnd = null;
  let pointerId = null;

  let keyboardAiming = false;

  // ========================================
  // LAUNCH CONFIGURATION
  // ========================================

  const MAX_DRAG = 2.5;
  const LAUNCH_SCALE = 7;

  const MAX_LAUNCH_SPEED =
    MAX_DRAG * LAUNCH_SCALE;

  const PROJECTILE_RADIUS = 0.25;
  const PROJECTILE_MASS = 1;

  const GRAVITY = 9.81;

  let launchAngle = 35;
  let launchPower = 0.8;

  // ========================================
  // LIMIT PULLBACK
  // ========================================

  function clampSlingshotDrag(
    launcher,
    pointer
  ) {

    let dx = pointer.x - launcher.x;
    let dy = pointer.y - launcher.y;

    dx = Math.min(0, dx);

    const distance = Math.hypot(dx, dy);

    if (distance > MAX_DRAG) {

      const factor = MAX_DRAG / distance;

      dx *= factor;
      dy *= factor;
    }

    return {
      x: launcher.x + dx,
      y: launcher.y + dy
    };
  }

  // ========================================
  // RESET INTERACTION
  // ========================================

  function resetInteraction() {

    spring.release();

    if (
      pointerId !== null &&
      canvas.hasPointerCapture(pointerId)
    ) {
      canvas.releasePointerCapture(pointerId);
    }

    aimStart = null;
    aimEnd = null;
    pointerId = null;

    keyboardAiming = false;
  }

  function attachToWorld(world) {

    resetInteraction();

    launchAngle = 35;
    launchPower = 0.8;

    world.addForce(spring);
  }

  // ========================================
  // BODY SELECTION
  // ========================================

  function bodyAt(world, pos) {

    for (
      let i = world.bodies.length - 1;
      i >= 0;
      i--
    ) {

      const b = world.bodies[i];

      if (b.isStatic) continue;

      const dx = pos.x - b.pos.x;
      const dy = pos.y - b.pos.y;

      if (b.shape === 'rectangle') {

        const c = Math.cos(b.angle);
        const s = Math.sin(b.angle);

        const localX = c * dx + s * dy;
        const localY = -s * dx + c * dy;

        if (
          Math.abs(localX) <= b.width / 2 &&
          Math.abs(localY) <= b.height / 2
        ) {
          return b;
        }

      } else {

        const radius = Math.max(
          b.radius,
          0.25
        );

        if (
          dx * dx + dy * dy <=
          radius * radius
        ) {
          return b;
        }
      }
    }

    return null;
  }

  // ========================================
  // COMPUTE LAUNCH VELOCITY
  // ========================================

  function launchVelocity(start, end) {

    let vx =
      (start.x - end.x) * LAUNCH_SCALE;

    let vy =
      (start.y - end.y) * LAUNCH_SCALE;

    const speed = Math.hypot(vx, vy);

    if (speed > MAX_LAUNCH_SPEED) {

      const factor =
        MAX_LAUNCH_SPEED / speed;

      vx *= factor;
      vy *= factor;
    }

    return { vx, vy };
  }

  // ========================================
  // LAUNCH PROJECTILE
  // ========================================

  function launchProjectile(world, vx, vy) {

    if (!world.launcher) return false;

    const speed = Math.hypot(vx, vy);

    if (speed < 0.5) return false;

    if (speed > MAX_LAUNCH_SPEED) {

      const factor =
        MAX_LAUNCH_SPEED / speed;

      vx *= factor;
      vy *= factor;
    }

    world.add(new Body({

      shape: 'circle',

      x: world.launcher.x,
      y: world.launcher.y,

      vx,
      vy,

      m: PROJECTILE_MASS,

      radius: PROJECTILE_RADIUS,

      color: '#38bdf8'

    }));

    onLaunch();

    return true;
  }

  // ========================================
  // KEYBOARD AIMING
  // ========================================

  function updateKeyboardAim() {

    const world = getWorld();

    if (!world?.launcher) return;

    const angle =
      launchAngle * Math.PI / 180;

    const distance =
      launchPower * MAX_DRAG;

    aimStart = {
      ...world.launcher
    };

    aimEnd = {

      x: aimStart.x -
        distance * Math.cos(angle),

      y: aimStart.y -
        distance * Math.sin(angle)
    };

    keyboardAiming = true;
  }

  // ========================================
  // KEYBOARD INPUT
  // ========================================

  window.addEventListener(
    'keydown',

    event => {

      if (getScene() !== 'slingshot') {
        return;
      }

      const tag = event.target.tagName;

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

      if (pointerId !== null) return;

      const world = getWorld();

      if (!world?.launcher) return;

      switch (event.code) {

        // Increase launch angle
        case 'KeyW':

          event.preventDefault();

          launchAngle = Math.min(
            85,
            launchAngle + 2
          );

          updateKeyboardAim();

          break;

        // Decrease launch angle
        case 'KeyS':

          event.preventDefault();

          launchAngle = Math.max(
            0,
            launchAngle - 2
          );

          updateKeyboardAim();

          break;

        // Decrease launch power
        case 'KeyA':

          event.preventDefault();

          launchPower = Math.max(
            0.05,
            launchPower - 0.05
          );

          updateKeyboardAim();

          break;

        // Increase launch power
        case 'KeyD':

          event.preventDefault();

          launchPower = Math.min(
            1,
            launchPower + 0.05
          );

          updateKeyboardAim();

          break;

        // Launch
        case 'Enter':

          event.preventDefault();

          if (event.repeat) return;

          updateKeyboardAim();

          const velocity = launchVelocity(
            aimStart,
            aimEnd
          );

          launchProjectile(
            world,
            velocity.vx,
            velocity.vy
          );

          resetInteraction();

          break;

        // Cancel aiming
        case 'Escape':

          event.preventDefault();

          resetInteraction();

          break;
      }
    }
  );

  // ========================================
  // POINTER DOWN
  // ========================================

  canvas.addEventListener(
    'pointerdown',

    event => {

      if (!renderer.camera) return;
      if (pointerId !== null) return;

      const scene = getScene();
      const world = getWorld();

      const pos = eventToWorld(
        event,
        canvas,
        renderer.camera
      );

      keyboardAiming = false;

      // ------------------------------------
      // SLINGSHOT
      // ------------------------------------

      if (scene === 'slingshot') {

        const launcher = world.launcher;

        if (!launcher) return;

        const distance = Math.hypot(
          pos.x - launcher.x,
          pos.y - launcher.y
        );

        if (distance > 0.75) return;

        event.preventDefault();

        spring.release();

        aimStart = { ...launcher };

        aimEnd = clampSlingshotDrag(
          launcher,
          pos
        );

        pointerId = event.pointerId;

        canvas.setPointerCapture(
          pointerId
        );

        return;
      }

      // ------------------------------------
      // BILLIARDS
      // ------------------------------------

      if (scene !== 'billiards') return;

      const body = bodyAt(world, pos);

      pointerId = event.pointerId;

      canvas.setPointerCapture(
        pointerId
      );

      if (body) {

        spring.body = body;
        spring.target = pos;

        aimStart = null;
        aimEnd = null;

      } else {

        spring.release();

        aimStart = pos;
        aimEnd = pos;
      }
    }
  );

  // ========================================
  // POINTER MOVE
  // ========================================

  canvas.addEventListener(
    'pointermove',

    event => {

      if (
        event.pointerId !== pointerId
      ) return;

      if (!renderer.camera) return;

      const pos = eventToWorld(
        event,
        canvas,
        renderer.camera
      );

      if (spring.body) {
        spring.target = pos;
      }

      if (aimStart) {

        if (getScene() === 'slingshot') {

          aimEnd = clampSlingshotDrag(
            aimStart,
            pos
          );

        } else {

          aimEnd = pos;
        }
      }
    }
  );

  // ========================================
  // POINTER RELEASE
  // ========================================

  canvas.addEventListener(
    'pointerup',

    event => {

      if (
        event.pointerId !== pointerId
      ) return;

      if (
        renderer.camera &&
        aimStart
      ) {

        const pos = eventToWorld(
          event,
          canvas,
          renderer.camera
        );

        if (getScene() === 'slingshot') {

          aimEnd = clampSlingshotDrag(
            aimStart,
            pos
          );

        } else {

          aimEnd = pos;
        }
      }

      // ------------------------------------
      // SLINGSHOT LAUNCH
      // ------------------------------------

      if (
        getScene() === 'slingshot' &&
        aimStart &&
        aimEnd
      ) {

        const world = getWorld();

        const v = launchVelocity(
          aimStart,
          aimEnd
        );

        launchProjectile(
          world,
          v.vx,
          v.vy
        );

        resetInteraction();

        return;
      }

      // ------------------------------------
      // BILLIARDS LAUNCH
      // ------------------------------------

      if (
        getScene() === 'billiards' &&
        aimStart &&
        aimEnd
      ) {

        const world = getWorld();

        const v = launchVelocity(
          aimStart,
          aimEnd
        );

        if (
          Math.hypot(v.vx, v.vy) > 0.1
        ) {

          const bounds = world.bounds;
          const radius = 0.2;

          const x = Math.max(
            bounds.xMin + radius,

            Math.min(
              bounds.xMax - radius,
              aimStart.x
            )
          );

          const y = Math.max(
            bounds.yMin + radius,

            Math.min(
              bounds.yMax - radius,
              aimStart.y
            )
          );

          world.add(new Body({

            x,
            y,

            vx: v.vx,
            vy: v.vy,

            m: 1,
            radius,

            color: '#ffffff'
          }));

          onLaunch();
        }
      }

      resetInteraction();
    }
  );

  // ========================================
  // CANCEL POINTER INTERACTION
  // ========================================

  canvas.addEventListener(
    'pointercancel',

    resetInteraction
  );

  // ========================================
  // DRAW SLINGSHOT AND AIMING INFORMATION
  // ========================================

  function drawSlingshot(
    ctx,
    camera,
    world
  ) {

    const launcher = world.launcher;

    if (!launcher) return;

    const sx = x => camera.toScreenX(x);
    const sy = y => camera.toScreenY(y);

    const x = sx(launcher.x);
    const y = sy(launcher.y);

    ctx.save();

    // Wooden frame
    ctx.strokeStyle = '#a67546';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';

    ctx.beginPath();

    ctx.moveTo(x, y + 35);
    ctx.lineTo(x, y);
    ctx.lineTo(x - 13, y - 20);

    ctx.moveTo(x, y);
    ctx.lineTo(x + 13, y - 20);

    ctx.stroke();

    // ======================================
    // ACTIVE AIMING
    // ======================================

    if (aimStart && aimEnd) {

      const radius = Math.abs(
        sx(launcher.x + MAX_DRAG) - x
      );

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;

      ctx.setLineDash([5, 5]);

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius,
        0,
        2 * Math.PI
      );

      ctx.stroke();

      ctx.setLineDash([]);

      const px = sx(aimEnd.x);
      const py = sy(aimEnd.y);

      // Elastic bands
      ctx.strokeStyle = '#c99a66';
      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.moveTo(x - 13, y - 20);
      ctx.lineTo(px, py);
      ctx.lineTo(x + 13, y - 20);

      ctx.stroke();

      // Projectile
      ctx.fillStyle = '#38bdf8';

      ctx.beginPath();
      ctx.arc(px, py, 10, 0, 2 * Math.PI);
      ctx.fill();

      // ====================================
      // LAUNCH INFORMATION
      // ====================================

      const v = launchVelocity(
        aimStart,
        aimEnd
      );

      const speed = Math.hypot(
        v.vx,
        v.vy
      );

      const angle =
        Math.atan2(v.vy, v.vx) *
        180 / Math.PI;

      const power =
        100 * speed / MAX_LAUNCH_SPEED;

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';

      ctx.fillText(
        `Power: ${power.toFixed(0)}%`,
        x - 35,
        y - 80
      );

      ctx.fillText(
        `Speed: ${speed.toFixed(2)} m/s`,
        x - 35,
        y - 63
      );

      ctx.fillText(
        `Angle: ${angle.toFixed(1)}°`,
        x - 35,
        y - 46
      );

      if (keyboardAiming) {

        ctx.fillStyle = '#facc15';

        ctx.fillText(
          'ENTER to launch',
          x - 35,
          y - 97
        );
      }

    } else {

      // Resting elastic bands
      ctx.strokeStyle = '#c99a66';
      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.moveTo(x - 13, y - 20);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 13, y - 20);

      ctx.stroke();

      // Loaded projectile
      ctx.fillStyle = '#38bdf8';

      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fill();

      // Keyboard instructions
      ctx.fillStyle = '#cbd5e1';

      ctx.font = '12px monospace';
      ctx.textAlign = 'left';

      ctx.fillText(
        'Drag to aim or use WASD',
        x - 35,
        y - 45
      );

      ctx.fillText(
        'ENTER to launch',
        x - 35,
        y - 60
      );
    }

    ctx.restore();
  }

  // ========================================
  // DRAW TRAJECTORY PREVIEW
  // ========================================

  function drawTrajectory(
    ctx,
    camera,
    world
  ) {

    if (!aimStart || !aimEnd) return;

    const sx = x => camera.toScreenX(x);
    const sy = y => camera.toScreenY(y);

    const v = launchVelocity(
      aimStart,
      aimEnd
    );

    const isSlingshot =
      getScene() === 'slingshot';

    const previewDt = 0.05;

    ctx.save();

    // Billiards aiming line
    if (!isSlingshot) {

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.moveTo(
        sx(aimStart.x),
        sy(aimStart.y)
      );

      ctx.lineTo(
        sx(aimEnd.x),
        sy(aimEnd.y)
      );

      ctx.stroke();
    }

    // Projectile trajectory
    ctx.fillStyle = '#ffffff';

    for (let i = 1; i <= 60; i++) {

      const t = i * previewDt;

      const x =
        aimStart.x + v.vx * t;

      let y =
        aimStart.y + v.vy * t;

      if (isSlingshot) {

        y -= 0.5 * GRAVITY * t * t;

        if (
          Number.isFinite(world.groundY) &&
          y < world.groundY +
            PROJECTILE_RADIUS
        ) {
          break;
        }
      }

      const bounds =
        world.viewBounds ?? world.bounds;

      if (
        bounds &&
        (
          x < bounds.xMin ||
          x > bounds.xMax ||
          y < bounds.yMin ||
          y > bounds.yMax
        )
      ) {
        break;
      }

      ctx.beginPath();

      ctx.arc(
        sx(x),
        sy(y),
        2,
        0,
        2 * Math.PI
      );

      ctx.fill();
    }

    ctx.restore();
  }

  // ========================================
  // DRAW ALL INTERACTION OVERLAYS
  // ========================================

  function drawOverlay() {

    if (!renderer.camera) return;

    const ctx = canvas.getContext('2d');
    const camera = renderer.camera;

    const world = getWorld();
    const scene = getScene();

    if (scene === 'slingshot') {

      drawSlingshot(
        ctx,
        camera,
        world
      );
    }

    // Mouse-controlled spring
    if (spring.body && spring.target) {

      ctx.save();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.setLineDash([6, 5]);

      ctx.beginPath();

      ctx.moveTo(
        camera.toScreenX(
          spring.body.pos.x
        ),

        camera.toScreenY(
          spring.body.pos.y
        )
      );

      ctx.lineTo(
        camera.toScreenX(
          spring.target.x
        ),

        camera.toScreenY(
          spring.target.y
        )
      );

      ctx.stroke();

      ctx.restore();
    }

    drawTrajectory(
      ctx,
      camera,
      world
    );
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  return {

    attachToWorld,
    drawOverlay,
    resetInteraction
  };
}
