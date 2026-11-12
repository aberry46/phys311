# PHYS 311 Final Project Proposal

**Project:** Slingshot Destruction: A 2D Physics Simulation

**Repository:** https://github.com/aberry46/phys311
**Live Link:** https://aberry46.github.io/phys311/labs/lab11/

## 1. Title & Pitch

Slingshot Destruction is an interactive 2D physics game where players launch projectiles into wooden block structures, using realistic collisions, momentum transfer, and rotational motion to knock down targets.

## 2. The Physics

The simulation models projectile motion, gravity, collisions, and rotational dynamics. Projectiles and blocks experience gravitational acceleration, while collision impulses transfer linear and angular momentum. Friction and restitution determine how energy is dissipated during impacts.

### Forces and Equations

- **Gravity:** F_g = mg, acting downward.
- **Projectile motion:** x = x_0 + v_x t and y = y_0 + v_y t - 1/2 gt².
- **Linear momentum:** p = mv.
- **Collision impulse:** J = Δp.
- **Rotational dynamics:** τ = r × F and ΔL = r × J.
- **Moment of inertia:** I = (1/12)m(w² + h²) for rectangular blocks.
- **Rotational kinetic energy:** KE_rot = (1/2)Iω².
- **Restitution:** Determines the relative separation velocity after impact.
- **Friction:** F_f ≤ μN, opposing relative sliding at contact surfaces.

### New Physics Feature

The primary addition to the Lab 10 engine is rotational rigid-body collision response for rectangular blocks. Off-center impacts produce both translational and rotational motion, allowing structures to topple and collapse.

### Numerical Integration

The simulation uses Velocity Verlet with a fixed timestep of DT = 1/240 s. This method provides second-order accuracy for smooth motion and is already implemented in the existing physics engine. Collision impulses are applied separately after integration.

### Units and Scale

The simulation uses SI units: meters (m), seconds (s), kilograms (kg), and newtons (N). Gravity is 9.81 m/s², projectile launch speeds range from 0 to 17.5 m/s, and structures are approximately 2–4 m tall.

## 3. Three-Tier Scope

### MUST - Week 12
- Functional drag-and-release slingshot with adjustable launch velocity.
- Projectile motion under gravity.
- Rectangular blocks with translational and rotational motion.
- Circle-to-rectangle and rectangle-to-rectangle collision detection.
- Basic ground contact and a small collapsible structure.
- Target detection and reset functionality.
- Working simulation deployed to GitHub Pages.

### SHOULD - Week 13
- Improved friction and resting-contact stability for stacked blocks.
- Multiple target structures and a limited projectile count.
- Live energy, momentum, and angular momentum diagnostics.
- Numerical validation of collision behavior and timestep convergence.
- Improved user interface and gameplay instructions.

### COULD - Optional Features
- Different projectile masses and block materials.
- Structural damage and breakable blocks.
- Multiple levels with increasing difficulty.
- Slow-motion collision replay.
- Scoring based on remaining projectiles and targets destroyed.

## 4. Validation Plan

### Test 1: Linear Momentum Conservation
Two rectangular blocks collide with restitution e = 1 and no external forces.

- **Quantity:** Total linear momentum before and after collision.
- **Expected:** Momentum remains constant.
- **Tolerance:** |Δp| < 1 × 10⁻⁹ kg·m/s.
- **Preliminary result:** Both momentum errors were 0 in the isolated collision test.

### Test 2: Energy and Angular Momentum Conservation
An elastic collision occurs between two rectangular blocks with no external forces.

- **Quantity:** Total kinetic energy and angular momentum about the origin.
- **Expected:** Both quantities remain constant.
- **Tolerance:** |ΔE| < 1 × 10⁻⁸ J and |ΔL| < 1 × 10⁻⁸ kg·m²/s.
- **Preliminary result:** Energy error was 1.78 × 10⁻¹⁵ J and angular momentum error was 0.

### Test 3: Projectile Motion
Launch a projectile at 10 m/s and 45° with gravity enabled and collisions disabled.

- **Quantity:** Horizontal range when the projectile returns to its launch height.
- **Expected:** R = v₀²sin(2θ)/g = 10.194 m.
- **Tolerance:** Relative range error < 0.5% using DT = 1/240 s.

### Test 4: Timestep Convergence
Repeat a gravity-only projectile simulation with DT = 1/60, 1/120, 1/240, and 1/480 s.

- **Quantity:** Projectile position at t = 1 s.
- **Expected:** Results converge toward the analytical trajectory as DT decreases.
- **Tolerance:** Position error < 0.01 m at DT = 1/240 s.

### Test 5: Inelastic Collision
Repeat the isolated block collision with restitution e = 0.5.

- **Quantity:** Total linear momentum and kinetic energy.
- **Expected:** Linear momentum is conserved while kinetic energy decreases.
- **Tolerance:** |Δp| < 1 × 10⁻⁹ kg·m/s, with final kinetic energy less than initial kinetic energy.

These tests will be performed without ground contact or external forces when testing collision conservation. The full game includes gravity, friction, and inelastic impacts, so mechanical energy is not expected to remain constant.

## 5. Biggest Risk + Fallback

The biggest risk is maintaining stable collisions between stacked rectangular blocks, since repeated contacts can cause jitter, excessive rotation, or blocks passing through each other. My fallback is to use smaller structures with separated blocks resting directly on the ground, allowing the game to retain projectile motion, rotational collisions, and target destruction without relying on complex stacking.

The initial prototype successfully demonstrated momentum and energy conservation during isolated collisions, but stable resting contact remains a challenge. I will prioritize collision reliability before expanding the structures.

## 6. Timeline

| Week | Deliverable |
|------|-------------|
| **11** | Complete the project proposal, develop the rotational collision prototype, and document preliminary numerical results and limitations. |
| **12** | Complete the MUST features, including the slingshot, rotating blocks, ground contact, target detection, and a functional structure. Deploy the game to GitHub Pages. |
| **13** | Improve contact stability and friction, complete numerical validation tests, refine the interface, and document results in `VALIDATION.md` and `README.md`. |
| **14** | Finalize the simulation, address peer feedback, complete the project presentation, and submit the final deliverables. |

## 7. Audience

This simulation is designed for introductory physics students and casual players, demonstrating how projectile motion, momentum transfer, torque, and rotational dynamics interact to determine how structures respond to collisions.
