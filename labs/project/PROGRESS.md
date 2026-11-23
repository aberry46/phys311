# PHYS 311 | Week 12 Progress Log

**Project:** Slingshot Destruction  
**Live URL:** https://aberry46.github.io/phys311/labs/lab12/index.html  
**Source:** https://github.com/aberry46/phys311/tree/main/labs/lab12  
**Implementation location:** `labs/lab12/`

## Part A: MUST-Tier Status

| MUST feature | Status | Evidence |
| --- | --- | --- |
| Adjustable slingshot projectile launch | Complete | Pointer drag/release and keyboard aiming (W/S, A/D, Enter) |
| Projectile motion under gravity | Complete | Analytical range test passed |
| Translational and rotational block motion | Complete | Rotating rectangular bodies and angular momentum test |
| Circle-to-rectangle and rectangle-to-rectangle collisions | Complete | Impulse solver and isolated collision validation |
| Ground contact and collapsible structure | Complete, with limitations | Blocks rest and collapse; contact stabilization tested quantitatively |
| Target detection and reliable scene reset | Complete | Both targets destroyed during browser testing; reset recreates world and energy baseline |
| Running browser interface and GitHub Pages deployment | Existing live page verified previously; updated local build needs push | Source is in `labs/lab12/`; verify the new version after deployment |

The simulation uses a fixed physics timestep of **1/240 s** and **four collision-resolution iterations** in the slingshot scene. A frame-time cap and maximum catch-up step count prevent unbounded work under throttling. This protects numerical step size but can cause simulated time to fall behind wall-clock time.

No core MUST feature was intentionally cut. Optional expansions such as additional structures and advanced contact solving were deferred.

## Part B: Diagnostics and Numerical Validation

### Original proposal tests

Five experiments produce **seven checks, all passing** in the latest supplied terminal output.

| Check | Measured result | Outcome |
| --- | --- | --- |
| Elastic linear momentum | 0 kg m/s error | PASS |
| Elastic collision energy | 0 J error | PASS |
| Angular momentum | 2.22044605 × 10^-16 kg m²/s error | PASS |
| Projectile range at 10 m/s and 45° | 10.19367865 m vs. 10.19367992 m expected; 0.00001240% error | PASS |
| Projectile position at t = 1 s, DT = 1/240 | 3.42409772 × 10^-14 m error | PASS |
| Inelastic linear momentum | 4.44089210 × 10^-16 kg m/s error | PASS |
| Inelastic energy loss | 6.33661679 J lost | PASS |

These checks are isolated experiments. They do not establish perfect energy conservation during sustained multi-body contact.

### Resting-contact investigation

A 10-second, three-block diagnostic compared timesteps 1/120, 1/240, and 1/480 s, with 1, 4, and 8 contact iterations in both normal and conservative modes. Instrumentation separated changes in kinetic and potential energy during collision resolution.

At **DT = 1/240 s and four iterations**:

| Measurement | Before change | After change |
| --- | ---: | ---: |
| Conservative final energy drift | +10.40275% | +0.64152% |
| Collision-phase potential energy added | +13.011494 J | +0.802396 J |
| Maximum angular speed | 6.04380 rad/s | 0.65047 rad/s |
| Maximum ground penetration | 0.0003586 m | 0.0005000 m |

The conservative drift decreased by approximately **93.8%** relative to the tested baseline. In the initial solver, collision impulses changed kinetic energy by approximately zero in conservative mode, while position corrections added potential energy. Conservative-only correction tolerances reduced repeated upward adjustments of resting blocks. The tradeoff is greater permitted penetration, approximately 0.5 mm in the tested configuration. Drift remains timestep-sensitive, especially at DT = 1/120 s.

Normal-mode mechanical energy can decrease through restitution and friction and should not be interpreted as a conservative-energy error. The HUD now labels it **mechanical energy change**; conservative mode displays **energy drift** and its tolerance.

### Browser, performance, and usability checks

- The scene-specific controls are disabled when not relevant to the selected scene.
- The UI exposes **Conservative Test Mode** and **Detailed Debug HUD** checkboxes, with equivalent URL parameters `?conservative=1` and `?debug=1`.
- Keyboard launching is available through W/S (angle), A/D (power), and Enter (launch), alongside pointer and touch input.
- Browser screenshots demonstrated projectile launches, rotating/falling blocks, target hits, and the interface under **4× and 6× CPU slowdown**.
- The new performance notice reported **1.117 s of discarded wall-clock time** in a throttled session. The fixed physics timestep was retained; real-time pacing is not guaranteed under heavy load.
- A long-session browser run reached **254.51 s**, **61,082 physics steps**, **30 shots**, **2/2 targets destroyed**, and **25 total bodies**. The body count matches the five original scene bodies plus the **20 active-projectile cap**.
- The detailed HUD displayed energy decomposition, momentum, angular momentum, contact impulse counts, computation times, and discarded real time. Its displayed **60 FPS** is a sampled measurement, not proof that every frame was sustained at 60 FPS.
- Chrome reported Content Security Policy restrictions involving `eval`; their source was not confirmed to be the simulation, so no source-code cause is claimed.

## Part C: Bugs, Decisions, and Remaining Work

### Bug 1: Resting-contact energy injection (physics)

**Symptom:** Conservative-mode stacked-block tests accumulated large positive mechanical energy drift despite nominally elastic impulses.  
**Diagnosis:** Collision-phase measurements isolated the increase to gravitational potential energy introduced by positional corrections; the measured conservative kinetic-energy change during collision resolution was approximately zero.  
**Fix:** Added conservative-only ground and rectangle-rectangle correction tolerances and reduced the game's contact iterations to four. Retesting reduced drift from 10.40275% to 0.64152% for the standard 10-second configuration, while all seven isolated validation checks continued to pass.

### Bug 2: Misleading energy and throttling diagnostics (interface/measurement)

**Symptom:** The HUD displayed large negative "energy drift" during dissipative normal gameplay, and the former frame cap did not visibly quantify discarded real time.  
**Diagnosis:** A conservative tolerance was being applied to a deliberately inelastic scene; long frames were capped without a user-facing accumulated time-loss value.  
**Fix:** Separated normal-mode mechanical energy change from conservative-mode drift, added detailed performance metrics and a visible discarded-time warning, and reset the measurement baseline consistently when appropriate.

### Scope decisions

See `DECISIONS.md` for each **Planned / Did / Why** decision. The main tradeoff is a small conservative-mode penetration tolerance in exchange for much lower correction-induced energy drift. New physics features and multiple levels were deferred in favor of stability and evidence.

### Three Week 13 SHOULD priorities

1. Validate gameplay and contact stability across additional launch angles, block arrangements, longer runs, and devices.
2. Refine UI polish and communicate conservative-mode limitations clearly, including normal-mode energy dissipation and dropped real time.
3. Package final screenshots, test output, final report, and reproducible instructions; check the deployed GitHub Pages version after pushing.
