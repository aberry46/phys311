import { Body } from './engine/body.js';
import { eventToWorld } from './input.js';

// Mouse-controlled damped spring
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

// Connect pointer events to the physics simulation
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

  const MAX_LAUNCH_SPEED = 12;
  const LAUNCH_SCALE = 2;

  function resetInteraction() {
    spring.release();
    aimStart = null;
    aimEnd = null;
    pointerId = null;
  }

  function attachToWorld(world) {
    resetInteraction();
    world.addForce(spring);
  }

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

  canvas.addEventListener('pointerdown', event => {
    if (!renderer.camera) return;
    if (getScene() !== 'billiards') return;

    const world = getWorld();
    const pos = eventToWorld(event, canvas, renderer.camera);

    const body = bodyAt(world, pos);

    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);

    if (body) {
      // Grab an existing body using a force.
      spring.body = body;
      spring.target = pos;
      aimStart = null;
      aimEnd = null;
    } else {
      // Begin a slingshot launch.
      spring.release();
      aimStart = pos;
      aimEnd = pos;
    }
  });

  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    if (!renderer.camera) return;

    const pos = eventToWorld(event, canvas, renderer.camera);

    if (spring.body) {
      spring.target = pos;
    }

    if (aimStart) {
      aimEnd = pos;
    }
  });

  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== pointerId) return;

    if (aimStart && aimEnd && getScene() === 'billiards') {
      const world = getWorld();
      const v = launchVelocity(aimStart, aimEnd);

      if (Math.hypot(v.vx, v.vy) > 0.1) {
        const bounds = world.bounds;
        const radius = 0.2;

        const x = Math.max(
          bounds.xMin + radius,
          Math.min(bounds.xMax - radius, aimStart.x)
        );

        const y = Math.max(
          bounds.yMin + radius,
          Math.min(bounds.yMax - radius, aimStart.y)
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

  canvas.addEventListener('pointercancel', resetInteraction);

  // Draw manipulation guides on top of the simulation.
  function drawOverlay() {
    if (!renderer.camera) return;

    const ctx = canvas.getContext('2d');
    const camera = renderer.camera;

    const sx = x => camera.toScreenX(x);
    const sy = y => camera.toScreenY(y);

    // Visualize the spring connecting the ball to the cursor.
    if (spring.body && spring.target) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);

      ctx.beginPath();
      ctx.moveTo(sx(spring.body.pos.x), sy(spring.body.pos.y));
      ctx.lineTo(sx(spring.target.x), sy(spring.target.y));
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Draw the slingshot and predicted path.
    if (aimStart && aimEnd) {
      const v = launchVelocity(aimStart, aimEnd);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(sx(aimStart.x), sy(aimStart.y));
      ctx.lineTo(sx(aimEnd.x), sy(aimEnd.y));
      ctx.stroke();

      // Predict initial free-flight trajectory.
      // Billiards has no gravity, so motion is initially linear.
      const previewDt = 0.05;

      ctx.fillStyle = '#ffffff';

      for (let i = 1; i <= 30; i++) {
        const t = i * previewDt;

        const x = aimStart.x + v.vx * t;
        const y = aimStart.y + v.vy * t;

        ctx.beginPath();
        ctx.arc(sx(x), sy(y), 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  return {
    attachToWorld,
    drawOverlay,
    resetInteraction
  };
}
