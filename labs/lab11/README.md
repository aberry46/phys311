# PHYS 311: Lab 10 - Interactive Physics Simulation

## Overview

An interactive 2D physics sandbox developed in JavaScript. Users can explore collisions, gravitational interactions, spring forces, and numerical integration through four simulation scenes.

## Physics Implemented

- Euler, Euler-Cromer, and Velocity Verlet integration
- Elastic and inelastic collisions
- Newtonian gravitational interactions
- Hooke's law and spring oscillations
- Energy and momentum diagnostics
- Fixed timestep of 1/240 seconds

## Controls

| Control | Function |
|---|---|
| Space | Pause / Resume |
| Period (.) | Single physics step |
| R | Reset simulation |
| + / - | Adjust simulation speed |
| Integrator dropdown | Select numerical method |
| Restitution slider | Adjust collision elasticity |
| Gravity slider | Adjust gravitational strength |
| Spring slider | Adjust spring stiffness |
| Ball count slider | Change number of bodies |
| Drag existing ball | Apply a spring force |
| Drag from empty space | Slingshot launch |
| Visualization checkboxes | Toggle trails, velocity vectors, and energy graph |

Dragging and slingshot launching are available in the Billiards scene.

## Validation

The Billiards simulation was tested for 60 seconds using Velocity Verlet integration and a restitution coefficient of 1.00.

- Initial energy: 59.400000 J
- Final energy: 59.400000 J
- Relative energy difference: 0.000000% at reported precision

Robustness tests included maximum slider settings, rapid body manipulation, repeated resets, and window resizing. No failures were observed during these tests.

## Known Limitations

- The simulation operates in two dimensions.
- Rotational motion is not modeled.
- Slingshot trajectory previews do not account for collisions.
- Body dragging and launching require mouse or touch input.
- At sufficiently high velocities, discrete collision detection may miss contacts.

## Documentation

See [Lab 10 Report](lab10_report.md) for implementation details, physics analysis, and testing results.