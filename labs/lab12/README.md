# PHYS 311: Slingshot Destruction

## Overview

Slingshot Destruction is a 2D physics-based game inspired by Angry Birds. Players launch projectiles into wooden block structures to knock down targets. The simulation demonstrates projectile motion, momentum transfer, rotational dynamics, and collision physics.

This project builds on the JavaScript physics engine developed in Labs 9 and 10.

## Physics Concepts

The simulation incorporates:

- Projectile motion under gravity
- Conservation of linear and angular momentum
- Collision impulses and restitution
- Torque and rotational motion
- Moment of inertia for rectangular bodies
- Friction and energy dissipation
- Numerical integration using Velocity Verlet

The primary new feature is rotational collision response for rectangular rigid bodies.

## Current Features

- Drag-and-release slingshot with adjustable launch power
- Rotating rectangular blocks
- Circle-to-circle, circle-to-rectangle, and rectangle-to-rectangle collisions
- Gravity, ground contact, and friction
- Target detection
- Motion trails and physics diagnostics
- Pause, reset, and simulation speed controls

## Running the Simulation

Open `index.html` using VS Code Live Server or access the simulation through GitHub Pages.

Select **Slingshot Destruction**, drag the projectile backward from the launcher, and release to fire.

## Module 11: Risk Prototype

The standalone prototype tests rotational collision behavior and numerical conservation laws.

Files:
- `PROPOSAL.md`: Final project proposal and development plan
- `spike/spike.js`: Numerical collision experiments
- `spike/output.txt`: Recorded test results
- `spike/FINDINGS.md`: Prototype findings and scope decisions

Run the prototype using:

```bash
cd labs/lab11/spike
node spike.js
```

### Numerical Results

| Test | Result |
|------|--------|
| Centered impact | 0 rad/s angular velocity |
| Off-center impact | -3.912436 rad/s |
| Linear momentum error | ≤ 1.776 × 10⁻¹⁵ kg·m/s |
| Angular momentum error | 0 |
| Elastic collision energy error | 0 J |
| Inelastic collision energy loss | 26.199348 J |
| Resting-contact corrections | 2,390 over 2,400 steps |

## Known Limitations

Stacked blocks may experience jitter or instability during repeated collisions. The current solver uses approximate contact resolution and requires further improvements for reliable structural stacking.

The full game also includes inelastic collisions and friction, so mechanical energy is not expected to remain constant.

## Next Steps

During Weeks 12–13, development will focus on:

- Improving resting-contact stability
- Refining collapsible structures
- Expanding gameplay and target objectives
- Completing numerical validation
- Preparing the final project documentation

## Repository

[PHYS 311 GitHub Repository](https://github.com/aberry46/phys311)