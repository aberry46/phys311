# Slingshot Destruction

**PHYS 311 Final Project | Interactive Rigid-Body Physics**

**Live simulation:** https://aberry46.github.io/phys311/labs/lab12/index.html  
**Source:** https://github.com/aberry46/phys311/tree/main/labs/lab12

## Overview

Slingshot Destruction is an interactive, Angry Birds-style 2D physics simulation. Launch projectiles into a collapsible wooden structure to hit two targets. The simulation emphasizes projectile motion, rigid-body rotation, torque, impulse-based collisions, restitution, friction, and numerical conservation diagnostics. It extends the reusable JavaScript engine from earlier PHYS 311 labs.

## Controls

| Action | Input |
| --- | --- |
| Aim and launch | Drag backward from the slingshot and release; touch is also supported |
| Change launch angle | W / S |
| Change launch power | A / D |
| Launch with keyboard | Enter |
| Cancel aim | Esc |
| Pause or resume | Space or Pause button |
| Single physics step while paused | Period (`.`) or Step button |
| Reset | R or Reset button |
| Change simulation speed | `+` / `-` or speed slider |
| Physics diagnostics | Detailed Debug HUD checkbox or `?debug=1` |
| Elastic/frictionless comparison | Conservative Test Mode checkbox or `?conservative=1` |

The UI also offers Billiards, Jitter Guard Test, N-Body Gravity, and Spring Network scenes from earlier labs. Controls unrelated to the selected scene are disabled.

## Physics Implementation

- Fixed simulation timestep: **DT = 1/240 s**.
- Integrators: Velocity Verlet (default), Euler-Cromer, and Euler.
- Circle-circle, circle-rectangle, and rectangle-rectangle collisions.
- Rotational impulse response for rectangular bodies, including moment of inertia and angular momentum.
- Gravity, ground contact, target sensors, and collapsible structures.
- Normal gameplay uses restitution and friction; mechanical energy may dissipate.
- Conservative test mode uses restitution 1 and disables collision friction and nonconservative forces. Numerical drift from discrete collision/position correction remains possible.
- Four contact-resolution iterations in the slingshot scene.
- Projectile cleanup removes escaped projectiles and limits retained launched projectiles to 20.
- Fixed-step catch-up is capped under slow frames, with discarded wall-clock time displayed in the HUD.

## Run Locally

Serve the `labs/lab12` directory with VS Code Live Server, then open `index.html`. JavaScript modules require an HTTP server; opening the file directly may not work in all browsers.

Run the numerical tests in a terminal from `labs/lab12`:

```bash
node validation.js
node contact-diagnostics.js
```

`validation.js` runs the original five validation experiments and seven checks. `contact-diagnostics.js` runs a separate 10-second, three-block resting-contact matrix over timestep, iteration count, and conservative/normal modes.

## Numerical Validation

**Latest supplied validation output: 7/7 checks passed.**

| Check | Result |
| --- | --- |
| Elastic linear momentum | 0 kg m/s error |
| Elastic energy | 0 J error |
| Angular momentum | 2.22044605 × 10^-16 kg m²/s error |
| Projectile range (10 m/s at 45°) | Expected 10.19367992 m; measured 10.19367865 m |
| Position at t = 1 s, DT = 1/240 | 3.42409772 × 10^-14 m error |
| Inelastic linear momentum | 4.44089210 × 10^-16 kg m/s error |
| Inelastic collision energy loss | 6.33661679 J |

### Resting-contact stabilization

In the conservative three-block, 10-second experiment at **DT = 1/240 s** and **four contact iterations**, energy drift decreased from **10.40275% to 0.64152%** after adjusting conservative-mode position corrections. Collision-phase potential energy added decreased from **13.011494 J to 0.802396 J**. Maximum measured ground penetration increased from about **0.359 mm to 0.500 mm**. This demonstrates improved contact behavior for that test, not perfect conservation or a general convergence guarantee.

## Debugging and Browser Performance

The optional HUD reports simulation time, bodies, FPS, momentum, energy components, angular momentum, impulses resolved per step, maximum speeds, and frame computation times. It distinguishes **mechanical energy change** in dissipative normal mode from **energy drift** in conservative mode.

Browser checks demonstrated launches, block rotation, target detection, and rendering under **4× and 6× CPU slowdown**. One long-session test showed **254.51 s** of simulation time, **61,082 steps**, **30 shots**, **2/2 targets hit**, and **25 total bodies**. At 4× throttling, the performance warning reported **1.117 s of discarded wall-clock time**. Displayed 60 FPS is a sampled HUD reading rather than proof of uninterrupted 60 FPS.

## Known Limitations

- The discrete contact solver permits small interpenetrations. Conservative energy drift is reduced, not eliminated, and is sensitive to timestep and contact conditions.
- Normal gameplay is intentionally dissipative; a negative mechanical-energy change is not necessarily a numerical error.
- The energy baseline resets when the scene is reset or the tracked system changes through projectile launch/removal; displayed percentages should be interpreted relative to that baseline.
- Frame catch-up caps can slow simulation pacing under CPU throttling.
- The projectile cap can remove an older projectile that is still moving.
- Browser Content Security Policy warnings involving `eval` were observed, but their origin was not established.

## Project Files

- `main.js`: Scene setup, controls, animation loop, and performance instrumentation
- `interaction.js`: Pointer/touch and keyboard launching
- `engine/`: Bodies, forces, integrators, collision solver, and World
- `render/`: Canvas rendering, HUD, and energy chart
- `validation.js`: Original numerical validation
- `contact-diagnostics.js`: Resting-contact tests and solver comparisons
- `PROGRESS.md`: Week 12 implementation status and measured results
- `DECISIONS.md`: Planned / Did / Why engineering decisions