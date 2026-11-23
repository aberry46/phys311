# PHYS 311: Week 12 Progress Log

**Project:** Slingshot Destruction  
**Live Simulation:** https://aberry46.github.io/phys311/labs/lab12/index.html  
**Repository:** https://github.com/aberry46/phys311

---

## Part A: MUST Tier Status

| MUST Feature | Status | Description |
|---|---|---|
| Adjustable drag-and-release slingshot | COMPLETED | Projectile launching with adjustable velocity and direction. |
| Projectile motion under gravity | COMPLETED | Gravity implemented with fixed-timestep numerical integration. |
| Translational and rotational block dynamics | COMPLETED | Rectangular blocks respond to linear and angular collision impulses. |
| Circle-to-rectangle and rectangle-to-rectangle collisions | COMPLETED | Rigid-body collision detection and response implemented. |
| Ground contact and collapsible structure | COMPLETED | Three-block structure collapses under projectile impacts without the previous ground-body errors. |
| Target detection and reset | COMPLETED | Target tracking, destruction detection, and scene rebuilding implemented. |
| GitHub Pages deployment | COMPLETED | Simulation publicly accessible through GitHub Pages. |

All seven MUST features have been implemented; no MUST-tier features were cut or deferred.

The simulation uses Velocity Verlet integration with a fixed timestep of 1/240 s and an accumulator-based animation loop.

**Additional Verification:**
- CPU-throttling test: Pending final browser verification.
- Browser console errors: Pending final live-site check.
- Debug HUD: Implemented using `?debug=1`.
- Conservative test mode: Implemented using `?conservative=1`.

---

## Part B: Instrumentation and Validation

### B1. Debug HUD

The simulation includes a debug HUD displaying:

- Total mechanical energy and percentage drift
- Linear and angular momentum
- Body count and maximum speed
- Contacts resolved per timestep
- Measured FPS and performance diagnostics

The energy drift display changes color when the measured error exceeds the specified 1% tolerance.

### B2. Conservative Test Mode

A conservative testing mode is accessible through the `?conservative=1` URL parameter.

This mode sets restitution to 1, disables friction impulses, and excludes nonconservative driving and dissipative forces. It allows conservation behavior to be examined separately from normal gameplay.

### B3. Numerical Validation

All five experiments outlined in the original proposal were completed, producing seven successful validation checks.

| Test | Expected / Tolerance | Measured Result | Status |
|---|---|---|---|
| 1. Linear momentum conservation | Error < 1e-9 kg m/s | 0 kg m/s | PASS |
| 2. Elastic collision energy | Error < 1e-8 J | 0 J | PASS |
| 2. Angular momentum conservation | Error < 1e-8 kg m²/s | 2.22044605e-16 kg m²/s | PASS |
| 3. Projectile range | Relative error < 0.5% | 0.00001240% | PASS |
| 4. Timestep convergence | Position error < 0.01 m | 3.42409772e-14 m | PASS |
| 5. Inelastic momentum conservation | Error < 1e-9 kg m/s | 4.44089210e-16 kg m/s | PASS |
| 5. Inelastic energy loss | Final KE < Initial KE | 6.33661679 J lost | PASS |

**Overall: 7/7 checks passed (100%).**

For the projectile range experiment, the analytical range was 10.19367992 m, compared with a simulated range of 10.19367865 m.

For the inelastic collision experiment, kinetic energy decreased from 10.5 J to approximately 4.16338 J while conserving linear momentum within the specified tolerance.

These results demonstrate accurate behavior under isolated testing conditions, although the repeated structural contacts provide a separate challenge that needs to be addressed.

---

## Part C: Development Progress

### C1. Scope Decisions

No MUST-tier features were removed or deffered!

I prioritized the fundamental physics implementation, collision reliability, and numerical testing before additional gameplay features.

Improvements to resting-contact stability, expanded structures, and interface polish remain SHOULD-tier priorities.

See `DECISIONS.md` for the documented scope and implementation decisions.

### C2. Bugs Addressed

**Bug 1: Ground-Body Collision Errors**

- **Symptom:** Earlier versions of the collapsible structure produced ground-body errors during impacts.
- **Cause:** Ground-contact handling in the earlier collision implementation required correction. The exact underlying cause has not been independently established.
- **Fix:** Revised collision and ground-contact handling to support the current collapsible structure without the previously observed errors.

**Bug 2: Target Detection and Reset**

- **Symptom:** Target detection and reset behavior were inconsistent in earlier implementations.
- **Cause:** The earlier game-state handling required improvement; the exact underlying cause has not been independently established.
- **Fix:** Improved target detection and scene rebuilding. Reset now restores initial conditions and re-baselines the energy measurements.

### C3. Known Physics Limitation

The largest remaining issue is energy drift during sustained structural contact.

In conservative mode, I observed approximately **3.54% energy drift** during prolonged contact between blocks.

Although isolated collisions satisfy the conservation tests, repeated contact impulses and positional corrections may introduce additional energy errors when several bodies remain in contact.

This behavior is being investigated through timestep comparisons and collision-solver adjustments.

---

## Part D: Week 13 Plan

My three primary SHOULD-tier priorities are:

1. **Resting-Contact Stability:** Improve repeated collision handling and investigate energy drift during sustained contact.
2. **Interface and Gameplay Improvements:** Refine controls, improve scene-specific parameter accessibility, and add clearer gameplay instructions.
3. **Final Validation and Documentation:** Complete numerical diagnostics, convergence testing, and final project documentation.

The main focus will be on improving the existing working simulation rather than introducing substantial new physics features.

---

## Week 12 Summary

The complete MUST tier has been fully implemented and deployed! All seven recorded numerical validation checks passed, demonstrating accurate projectile motion and conservation behavior in isolated collision experiments.

The remaining technical concern is sustained-contact energy drift, which does not affect the successful completion of the isolated validation tests but remains a priority for further improvement.

Overall, the simulation is ready for beta review!