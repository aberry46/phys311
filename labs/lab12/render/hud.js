
//
// PHYS 311 - Slingshot Destruction
// Physics Diagnostics HUD
//

export class HUD {
  constructor(element) {
    this.element = element;
    this.initialEnergy = null;
    this.energyTolerance = 1.0;

    const params = new URLSearchParams(
      window.location.search
    );

    this.debug = params.get('debug') === '1';
  }

  // ==========================================
  // ENERGY BASELINE
  // ==========================================

  reset(world) {
    this.initialEnergy = world.totalEnergy();
  }

  setDebug(enabled) {
    this.debug = Boolean(enabled);
  }

  energyDrift(energy) {
    if (
      this.initialEnergy === null ||
      Math.abs(this.initialEnergy) < 1e-12
    ) {
      return null;
    }

    return (
      100 * (energy - this.initialEnergy) /
      Math.abs(this.initialEnergy)
    );
  }

  // ==========================================
  // HUD UPDATE
  // ==========================================

  update(
    world,
    fps,
    physicsMs,
    renderMs,
    performanceData = {}
  ) {
    if (this.initialEnergy === null) {
      this.reset(world);
    }

    const data = world.diagnostics();

    const E = data.energy;
    const p = data.momentum;
    const conservative = data.conservativeMode;

    const drift = this.energyDrift(E);

    const driftText = drift === null
      ? 'N/A'
      : `${drift >= 0 ? '+' : ''}${drift.toFixed(4)}%`;

    const driftExceeded =
      drift !== null &&
      Math.abs(drift) > this.energyTolerance;

    const targets = world.targetStatus();

    const droppedTime =
      performanceData.droppedTime ?? 0;

    const droppedFrames =
      performanceData.droppedFrames ?? 0;

    const lastFrameMs =
      performanceData.lastFrameMs ?? 0;

    const stepsLastFrame =
      performanceData.stepsLastFrame ?? 0;

    // ========================================
    // BASIC HUD
    // ========================================

    const lines = [
      'SIMULATION STATUS',
      '------------------------------',
      `Time: ${data.time.toFixed(2)} s`,
      `Bodies: ${data.bodyCount}`,
      `FPS: ${fps.toFixed(1)}`,
      `Energy: ${E.toFixed(5)} J`,
      `Momentum: ${p.magnitude.toFixed(5)} kg m/s`
    ];

    // ========================================
    // TARGET STATUS
    // ========================================

    if (targets.total > 0) {
      lines.push(
        '',
        'TARGET STATUS',
        '------------------------------',
        `Destroyed: ${targets.hit}/${targets.total}`,
        `Remaining: ${targets.remaining}`
      );

      if (targets.complete) {
        lines.push('ALL TARGETS DESTROYED');
      }
    }

    // ========================================
    // PHYSICS MODE
    // ========================================

    lines.push(
      '',
      `Mode: ${conservative ? 'CONSERVATIVE' : 'NORMAL'}`
    );

    // ========================================
    // ENERGY INTERPRETATION
    // ========================================

    if (conservative) {
      lines.push(
        '',
        'CONSERVATION TEST',
        '------------------------------',
        'Restitution: 1.00',
        'Collision friction: disabled',
        'Mechanical energy should remain',
        'approximately constant.'
      );
    } else {
      lines.push(
        '',
        'NORMAL GAMEPLAY',
        '------------------------------',
        'Inelastic collisions and friction',
        'can dissipate mechanical energy.'
      );
    }

    // ========================================
    // DEBUG DIAGNOSTICS
    // ========================================

    if (this.debug) {
      lines.push(
        '',
        'DEBUG PHYSICS DIAGNOSTICS',
        '------------------------------',
        `DT: ${data.timestep.toFixed(6)} s`,
        `Physics steps: ${data.stepCount}`,
        `Contact iterations: ${data.contactIterations}`,

        '',
        'ENERGY',
        '------------------------------',
        `Baseline: ${this.initialEnergy.toFixed(5)} J`,
        `Total: ${E.toFixed(5)} J`,
        `Translational KE: ${data.translationalEnergy.toFixed(5)} J`,
        `Rotational KE: ${data.rotationalEnergy.toFixed(5)} J`,
        `Potential: ${data.potentialEnergy.toFixed(5)} J`,

        '',
        'MOMENTUM',
        '------------------------------',
        `px: ${p.x.toFixed(5)} kg m/s`,
        `py: ${p.y.toFixed(5)} kg m/s`,
        `|p|: ${p.magnitude.toFixed(5)} kg m/s`,
        `Angular momentum: ${data.angularMomentum.toFixed(5)} kg m²/s`,

        '',
        'COLLISIONS',
        '------------------------------',
        `Impulses this step: ${data.contactsThisStep}`,
        `Total recorded impulses: ${data.totalContacts}`,
        `Peak per step: ${data.peakContacts}`,
        `Restitution: ${conservative
          ? '1.00'
          : data.restitution.toFixed(2)}`,

        '',
        'BODIES',
        '------------------------------',
        `Dynamic bodies: ${data.dynamicBodies}`,
        `Maximum speed: ${data.maxSpeed.toFixed(4)} m/s`,
        `Maximum angular speed: ${data.maxAngularSpeed.toFixed(4)} rad/s`,

        '',
        'PERFORMANCE',
        '------------------------------',
        `FPS: ${fps.toFixed(1)}`,
        `Last frame: ${lastFrameMs.toFixed(2)} ms`,
        `Physics computation: ${physicsMs.toFixed(3)} ms`,
        `Rendering computation: ${renderMs.toFixed(3)} ms`,
        `Physics steps/frame: ${stepsLastFrame}`,
        `Capped frames: ${droppedFrames}`,
        `Discarded real time: ${droppedTime.toFixed(3)} s`
      );

      if (Number.isFinite(world.lastCollisionEnergyChange)) {
        lines.push(
          '',
          'LAST COLLISION STEP',
          '------------------------------',
          `Net energy change: ${world.lastCollisionEnergyChange.toExponential(3)} J`,
          `KE change: ${(world.lastCollisionKineticChange ?? 0).toExponential(3)} J`,
          `PE change: ${(world.lastCollisionPotentialChange ?? 0).toExponential(3)} J`
        );
      }
    } else {
      lines.push(
        '',
        'Enable Detailed Debug HUD',
        'for additional physics measurements.'
      );
    }

    // ========================================
    // SAFE DOM RENDERING
    // ========================================

    const doc = this.element.ownerDocument;
    const fragment = doc.createDocumentFragment();

    const bodyText = doc.createTextNode(
      lines.join('\n') + '\n\n'
    );

    fragment.appendChild(bodyText);

    const energyLine = doc.createElement('span');

    if (conservative) {
      energyLine.textContent =
        `Energy drift: ${driftText}\n` +
        `Tolerance: ±${this.energyTolerance.toFixed(2)}%`;

      energyLine.style.color = driftExceeded
        ? '#f87171'
        : '#4ade80';
    } else {
      energyLine.textContent =
        `Mechanical energy change: ${driftText}\n` +
        `Baseline resets after launches or removals.`;

      energyLine.style.color = '#93c5fd';
    }

    fragment.appendChild(energyLine);

    if (droppedTime > 0 && this.debug) {
      const warning = doc.createElement('span');

      warning.textContent =
        '\n\nSome elapsed time was discarded ' +
        'to prevent unstable catch-up.';

      warning.style.color = '#facc15';
      fragment.appendChild(warning);
    }

    this.element.style.color = '#d1fae5';
    this.element.replaceChildren(fragment);
  }
}
