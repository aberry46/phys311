# Spike Findings: Rotational Collisions

## Risk Tested

The primary risk was whether rectangular blocks could respond correctly to off-center impacts while conserving momentum and energy. Repeated ground contact was also tested to identify possible stability issues.

## What I Tested

I created a standalone JavaScript prototype to simulate collisions between a circular projectile and a rectangular block. The prototype tested centered and off-center impacts, elastic and inelastic collisions, and repeated ground contact under gravity. The calculations were performed without the full simulation engine or graphical interface.

## Results

The centered impact produced zero angular velocity, while the off-center impact produced -3.912436 rad/s, showing that the collision impulse correctly generated rotation. Linear momentum errors were at most 1.776 × 10^-15 kg·m/s, and angular momentum and kinetic energy were conserved to numerical precision in the elastic tests.

With restitution reduced to 0.5, the collision lost 26.199348 J of kinetic energy, as expected for an inelastic impact.

The resting-contact test revealed a limitation. Although the block maintained its expected height of 1 m and finished with zero vertical velocity, the solver required 2,390 contact corrections over 2,400 timesteps. Maximum penetration was 0.001241 m.

## Scope Decision

The collision results support keeping rotating rectangular blocks in the MUST tier. However, repeated contact corrections suggest that stable stacked structures may require additional work. I will keep the initial structure small and prioritize contact stability during Week 12. If stacking remains unreliable, I will use separated blocks resting directly on the ground while preserving rotational collisions and target gameplay.