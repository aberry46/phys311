
//
// PHYS 311 - Slingshot Destruction
// Physics Diagnostics HUD
//

export class HUD {

  constructor(element) {

    this.element = element;

    this.initialEnergy = null;

    this.energyTolerance = 1.0;

    // Enable debug mode using ?debug=1
    const params = new URLSearchParams(
      window.location.search
    );

    this.debug = params.get('debug') === '1';
  }

  // ========================================
  // RESET ENERGY BASELINE
  // ========================================

  reset(world) {

    this.initialEnergy = world.totalEnergy();
  }

  // ========================================
  // DEBUG MODE CONTROL
  // ========================================

  setDebug(enabled) {

    this.debug = Boolean(enabled);
  }

  // ========================================
  // ENERGY DRIFT
  // ========================================

  energyDrift(energy) {

    if (
      this.initialEnergy === null ||
      Math.abs(this.initialEnergy) < 1e-12
    ) {
      return null;
    }

    return (

      100 *

      (energy - this.initialEnergy) /

      Math.abs(this.initialEnergy)

    );
  }

  // ========================================
  // UPDATE HUD
  // ========================================

  update(world, fps, physicsMs, renderMs) {

    if (this.initialEnergy === null) {

      this.reset(world);
    }

    const data = world.diagnostics();

    const E = data.energy;
    const p = data.momentum;

    const drift = this.energyDrift(E);

    const driftText = drift === null

      ? 'N/A'

      : `${drift.toFixed(4)}%`;

    const driftExceeded =

      drift !== null &&

      Math.abs(drift) > this.energyTolerance;

    const targets = world.targetStatus();

    // ======================================
    // STANDARD GAMEPLAY HUD
    // ======================================

    const lines = [

      'SIMULATION STATUS',

      '------------------------------',

      `Time: ${data.time.toFixed(2)} s`,

      `Bodies: ${data.bodyCount}`,

      `FPS: ${fps.toFixed(0)}`,

      `Energy: ${E.toFixed(5)} J`,

      `Momentum: ${p.magnitude.toFixed(5)} kg m/s`

    ];

    // ======================================
    // TARGET INFORMATION
    // ======================================

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

    // ======================================
    // PHYSICS TEST MODE
    // ======================================

    lines.push(

      '',

      `Mode: ${
        data.conservativeMode
          ? 'CONSERVATIVE'
          : 'NORMAL'
      }`

    );

    // ======================================
    // DETAILED DEBUG DIAGNOSTICS
    // ======================================

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

        `Initial energy: ${this.initialEnergy.toFixed(5)} J`,

        `Total energy: ${E.toFixed(5)} J`,

        `Translational KE: ${data.translationalEnergy.toFixed(5)} J`,

        `Rotational KE: ${data.rotationalEnergy.toFixed(5)} J`,

        `Potential energy: ${data.potentialEnergy.toFixed(5)} J`,

        '',

        'MOMENTUM',

        '------------------------------',

        `px: ${p.x.toFixed(5)} kg m/s`,

        `py: ${p.y.toFixed(5)} kg m/s`,

        `|p|: ${p.magnitude.toFixed(5)} kg m/s`,

        `Angular momentum: ${data.angularMomentum.toFixed(5)} kg m²/s`,

        '',

        'COLLISION DIAGNOSTICS',

        '------------------------------',

        `Contacts this step: ${data.contactsThisStep}`,

        `Total contacts: ${data.totalContacts}`,

        `Peak contacts: ${data.peakContacts}`,

        `Restitution: ${
          data.conservativeMode
            ? '1.00'
            : data.restitution.toFixed(2)
        }`,

        '',

        'BODY DIAGNOSTICS',

        '------------------------------',

        `Total bodies: ${data.bodyCount}`,

        `Dynamic bodies: ${data.dynamicBodies}`,

        `Max speed: ${data.maxSpeed.toFixed(4)} m/s`,

        `Max angular speed: ${data.maxAngularSpeed.toFixed(4)} rad/s`,

        '',

        'PERFORMANCE',

        '------------------------------',

        `FPS: ${fps.toFixed(0)}`,

        `Physics: ${physicsMs.toFixed(3)} ms`,

        `Rendering: ${renderMs.toFixed(3)} ms`

      );

    } else {

      lines.push(

        '',

        'Add ?debug=1 to the URL',

        'for detailed diagnostics.'

      );
    }

    // ======================================
    // DISPLAY HUD
    // ======================================

    const documentRef =
      this.element.ownerDocument;

    const content =
      documentRef.createDocumentFragment();

    content.appendChild(

      documentRef.createTextNode(

        lines.join('\n') + '\n'

      )

    );

    // ======================================
    // COLOR-CODED ENERGY DRIFT
    // ======================================

    const driftLine =
      documentRef.createElement('span');

    driftLine.textContent =

      `\nEnergy drift: ${driftText}\n` +

      `Tolerance: ±${this.energyTolerance.toFixed(2)}%`;

    driftLine.style.color = driftExceeded

      ? '#f87171'

      : '#4ade80';

    content.appendChild(driftLine);

    this.element.style.color = '#d1fae5';

    this.element.replaceChildren(content);
  }
}
