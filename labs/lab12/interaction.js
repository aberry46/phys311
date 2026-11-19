
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

    b.force.x += b.m * (this.k * dx - this.c * b.vel.x);
    b.force.y += b.m * (this.k * dy - this.c * b.vel.y);
  }

  release() {
    this.body = null;
    this.target = null;
  }
}

// ==========================================
// POINTER INTERACTIONS
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

  // ==========================================
  // SLINGSHOT SETTINGS
  // ==========================================

  const MAX_DRAG = 2.5;
  const LAUNCH_SCALE = 7;
  const MAX_LAUNCH_SPEED = MAX_DRAG * LAUNCH_SCALE;
  const GRAVITY = 9.81;

  // ==========================================
  // LIMIT SLINGSHOT PULLBACK
  // ==========================================

  function clampSlingshotDrag(launcher, pointer) {
    let dx = pointer.x - launcher.x;
    let dy = pointer.y - launcher.y;

    // Only allow pulling backward
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

  // ==========================================
  // RESET INTERACTION
  // ==========================================

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
  }

  function attachToWorld(world) {
    resetInteraction();
    world.addForce(spring);
  }

  // ==========================================
  // FIND BODY UNDER CURSOR
  // ==========================================

  function bodyAt(world, pos) {
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      const b = world.bodies[i];

      if (b.isStatic) continue;

      const dx = b.pos.x - pos.x;
      const dy = b.pos.y - pos.y;

      const radius = Math.max(b.radius, 0.25);

      if (dx * dx + dy * dy <= radius * radius) {
        return b;
      }
    }

    return null;
  }

  // ==========================================
  // CALCULATE LAUNCH VELOCITY
  // ==========================================

  function launchVelocity(start, end) {
    let vx = (start.x - end.x) * LAUNCH_SCALE;
    let vy = (start.y - end.y) * LAUNCH_SCALE;

    const speed = Math.hypot(vx, vy);

    if (speed > MAX_LAUNCH_SPEED) {
      const factor = MAX_LAUNCH_SPEED / speed;

      vx *= factor;
      vy *= factor;
    }

    return { vx, vy };
  }

  // ==========================================
  // POINTER DOWN
  // ==========================================

  canvas.addEventListener('pointerdown', event => {
    if (!renderer.camera) return;
    if (pointerId !== null) return;

    const scene = getScene();
    const world = getWorld();

    const pos = eventToWorld(
      event,
      canvas,
      renderer.camera
    );

    // ----------------------------------------
    // SLINGSHOT MODE
    // ----------------------------------------

    if (scene === 'slingshot') {
      const launcher = world.launcher;

      if (!launcher) return;

      const distance = Math.hypot(
        pos.x - launcher.x,
        pos.y - launcher.y
      );

      // Must click near the launcher
      if (distance > 0.75) return;

      event.preventDefault();

      spring.release();

      aimStart = { ...launcher };
      aimEnd = clampSlingshotDrag(launcher, pos);

      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);

      return;
    }

    // ----------------------------------------
    // BILLIARDS MODE
    // ----------------------------------------

    if (scene !== 'billiards') return;

    const body = bodyAt(world, pos);

    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);

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
  });

  // ==========================================
  // POINTER MOVE
  // ==========================================

  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    if (!renderer.camera) return;

    const pos = eventToWorld(
      event,
      canvas,
      renderer.camera
    );

    // Move grabbed body
    if (spring.body) {
      spring.target = pos;
    }

    // Update aiming
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
  });

  // ==========================================
  // POINTER UP
  // ==========================================

  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== pointerId) return;

    // Use final release position when available
    if (renderer.camera && aimStart) {
      const pos = eventToWorld(
        event,
        canvas,
        renderer.camera
      );

      if (getScene() === 'slingshot') {
        aimEnd = clampSlingshotDrag(aimStart, pos);
      } else {
        aimEnd = pos;
      }
    }

    // ----------------------------------------
    // SLINGSHOT LAUNCH
    // ----------------------------------------

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

      const speed = Math.hypot(v.vx, v.vy);

      if (speed > 0.5) {
        world.add(new Body({
          shape: 'circle',

          x: world.launcher.x,
          y: world.launcher.y,

          vx: v.vx,
          vy: v.vy,

          m: 1,
          radius: 0.25,

          color: '#38bdf8'
        }));

        onLaunch();
      }

      resetInteraction();
      return;
    }

    // ----------------------------------------
    // BILLIARDS LAUNCH
    // ----------------------------------------

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

      if (Math.hypot(v.vx, v.vy) > 0.1) {
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
  });

  // ==========================================
  // POINTER CANCEL
  // ==========================================

  canvas.addEventListener(
    'pointercancel',
    resetInteraction
  );

  // ==========================================
  // DRAW INTERACTION OVERLAYS
  // ==========================================

  function drawOverlay() {
    if (!renderer.camera) return;

    const ctx = canvas.getContext('2d');
    const camera = renderer.camera;

    const sx = x => camera.toScreenX(x);
    const sy = y => camera.toScreenY(y);

    const scene = getScene();
    const world = getWorld();

    // ========================================
    // DRAW SLINGSHOT
    // ========================================

    if (scene === 'slingshot' && world.launcher) {
      const launcher = world.launcher;

      const x = sx(launcher.x);
      const y = sy(launcher.y);

      ctx.save();

      ctx.strokeStyle = '#a67546';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';

      // Wooden frame
      ctx.beginPath();

      ctx.moveTo(x, y + 35);
      ctx.lineTo(x, y);

      ctx.lineTo(x - 13, y - 20);

      ctx.moveTo(x, y);
      ctx.lineTo(x + 13, y - 20);

      ctx.stroke();

      // --------------------------------------
      // SHOW MAXIMUM PULLBACK AREA
      // --------------------------------------

      if (aimStart && aimEnd) {
        const radius =
          Math.abs(sx(launcher.x + MAX_DRAG) - x);

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

        // Elastic bands connected to projectile
        const px = sx(aimEnd.x);
        const py = sy(aimEnd.y);

        ctx.strokeStyle = '#c99a66';
        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(x - 13, y - 20);
        ctx.lineTo(px, py);

        ctx.lineTo(x + 13, y - 20);

        ctx.stroke();

        // Pulled-back projectile
        ctx.fillStyle = '#38bdf8';

        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.fill();

        // Power percentage
        const dragDistance = Math.hypot(
          aimStart.x - aimEnd.x,
          aimStart.y - aimEnd.y
        );

        const power =
          100 * dragDistance / MAX_DRAG;

        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';

        ctx.fillText(
          `Power: ${power.toFixed(0)}%`,
          x - 30,
          y - 45
        );

      } else {
        // Elastic band in resting position
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
      }

      ctx.restore();
    }

    // ========================================
    // DRAW MOUSE SPRING
    // ========================================

    if (spring.body && spring.target) {
      ctx.save();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);

      ctx.beginPath();

      ctx.moveTo(
        sx(spring.body.pos.x),
        sy(spring.body.pos.y)
      );

      ctx.lineTo(
        sx(spring.target.x),
        sy(spring.target.y)
      );

      ctx.stroke();
      ctx.restore();
    }

    // ========================================
    // DRAW TRAJECTORY PREVIEW
    // ========================================

    if (aimStart && aimEnd) {
      const v = launchVelocity(
        aimStart,
        aimEnd
      );

      const isSlingshot = scene === 'slingshot';
      const previewDt = 0.05;

      ctx.save();

      // Draw launch direction for billiards
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

      // Trajectory dots
      ctx.fillStyle = '#ffffff';

      for (let i = 1; i <= 40; i++) {
        const t = i * previewDt;

        const x =
          aimStart.x + v.vx * t;

        let y =
          aimStart.y + v.vy * t;

        // Gravity affects slingshot trajectory
        if (isSlingshot) {
          y -= 0.5 * GRAVITY * t * t;

          // Stop preview below the ground
          if (
            Number.isFinite(world.groundY) &&
            y < world.groundY + 0.25
          ) {
            break;
          }
        }

        // Stop if outside visible horizontal bounds
        const bounds = world.viewBounds ?? world.bounds;

        if (
          bounds &&
          (x < bounds.xMin || x > bounds.xMax)
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
  }

  // ==========================================
  // PUBLIC INTERACTION METHODS
  // ==========================================

  return {
    attachToWorld,
    drawOverlay,
    resetInteraction
  };
}
