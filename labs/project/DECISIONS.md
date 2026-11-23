# PHYS 311 | Slingshot Destruction Decision Log

**Week 12 Build Sprint**  
**Source Directory:** `labs/lab12/`

## Decision 1: Keep the existing modular physics engine

**Planned:** Build the final project on the reusable body, world, force, integrator, collision, and rendering modules from earlier labs.  
**Did:** Extended the existing engine with rotating rectangular rigid bodies, ground interactions, target sensors, and a slingshot-specific scene.  
**Why:** Reusing tested components kept the MUST tier achievable and made individual physics experiments possible.

## Decision 2: Use four collision iterations in gameplay

**Planned:** Use multiple contact-resolution passes to prevent unstable stacking.  
**Did:** Compared 1, 4, and 8 iterations at several timesteps, then selected four iterations at DT = 1/240 s for the slingshot scene.  
**Why:** Four iterations gave a reasonable compromise between penetration, solver work, and energy drift. In the baseline normal-mode 10-second test, the four-iteration final drift was 0.27851% versus 0.43965% at eight iterations, with somewhat greater penetration.

## Decision 3: Adjust conservative contact correction rather than rewriting impulses

**Planned:** Diagnose the source of sustained-contact energy drift before changing the collision equations.  
**Did:** Instrumented kinetic and potential energy across the collision phase. Added conservative-only ground slop of 0.0005 m and rectangle-rectangle correction settings of 0.002 m slop and 0.25 correction fraction. Normal-mode corrections were left unchanged.  
**Why:** Measurements showed that position corrections, not measured collision impulse kinetic-energy changes, were producing positive drift in the conservative stacked-block test. At DT = 1/240 s with four iterations, conservative drift fell from 10.40275% to 0.64152%. The accepted tradeoff was approximately 0.5 mm maximum ground penetration in that test.

## Decision 4: Separate gameplay energy loss from conservation error

**Planned:** Provide an energy HUD that helps users interpret conservation.  
**Did:** Labeled normal-mode values as mechanical energy change and reserved energy drift/tolerance highlighting for conservative mode. Added a detailed breakdown of translational kinetic, rotational kinetic, and potential energy, plus collision diagnostics.  
**Why:** Inelastic collisions and friction intentionally dissipate energy; labeling that decrease as a numerical conservation failure would be misleading.

## Decision 5: Preserve a fixed timestep during CPU throttling

**Planned:** Keep numerical integration independent of variable browser frame durations.  
**Did:** Retained a fixed 1/240 s physics step, limited the wall-clock catch-up budget to 50 ms and 30 physics steps per rendered frame, and exposed cumulative discarded real time in the HUD and warning banner.  
**Why:** Capping catch-up prevents overload and preserves fixed-step integration. It may slow simulation time relative to real time on throttled hardware, so the limitation must be visible rather than hidden.

## Decision 6: Cap long-session projectile accumulation

**Planned:** Permit repeated shots without performance degradation from unlimited abandoned bodies.  
**Did:** Tagged launched projectiles, removed escaped ones, and capped retained projectiles at 20, removing the oldest when needed. A browser session showed 30 shots and 25 total bodies, consistent with 20 projectiles plus five initial scene bodies.  
**Why:** Pairwise collision work grows as body count increases. A cap supports longer interactive sessions while preserving the initial structure and target sensors.

## Decision 7: Prioritize verification over additional game features

**Planned:** Complete core gameplay and then consider extra structures, levels, and presentation polish.  
**Did:** Finished the existing MUST features, numerical validation, diagnostic controls, keyboard launch alternative, and performance checks. Deferred new levels and advanced solver redesign.  
**Why:** The original seven checks remain passing, but conservative stacked-contact drift is not zero and longer-duration edge cases still exist. Reliable, documented behavior is preferable to adding unverified complexity before the deadline.

## Known Tradeoffs

- Conservative stacked-contact drift is approximately 0.64152% over the tested 10-second, three-block case at DT = 1/240 s and four iterations; this is not a guarantee across all scenes.
- Small penetration tolerances are intentional and can become inadequate under different masses, geometries, or timesteps.
- A 20-projectile cap may remove a projectile that is still in motion if the user fires many shots.
- Heavy CPU throttling can cause the simulation to run slower than real time; the warning reports discarded time.