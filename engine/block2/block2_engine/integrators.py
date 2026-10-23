class Euler:
    """Explicit Euler. Included so you can watch it fail."""
    name = "Euler"
    def step(self, world, dt):
        world.compute_forces()
        for b in world.bodies:
            if b.fixed:
                continue
            a, alpha = b.f * b.inv_m, b.tau * b.inv_I
            b.r     += b.v * dt          # uses OLD velocity
            b.v     += a * dt
            b.theta += b.omega * dt
            b.omega += alpha * dt


class EulerCromer:
    """Symplectic Euler. One line different -- velocity updates first."""
    name = "Euler-Cromer"
    def step(self, world, dt):
        world.compute_forces()
        for b in world.bodies:
            if b.fixed:
                continue
            b.v     += (b.f * b.inv_m) * dt
            b.r     += b.v * dt          # uses NEW velocity
            b.omega += (b.tau * b.inv_I) * dt
            b.theta += b.omega * dt


class VelocityVerlet:
    """Second-order symplectic. The workhorse for orbits and oscillators."""
    name = "Velocity Verlet"
    def step(self, world, dt):
        bs = world.bodies

        if not world._primed:                       # one-time acceleration prime
            world.compute_forces()
            for b in bs:
                b._a  = b.f * b.inv_m
                b._al = b.tau * b.inv_I
            world._primed = True

        for b in bs:                                # drift with half-step accel
            if b.fixed:
                continue
            b.r     += b.v * dt + 0.5 * b._a  * dt*dt
            b.theta += b.omega * dt + 0.5 * b._al * dt*dt

        world.compute_forces()                      # forces at the NEW positions

        for b in bs:                                # kick with averaged accel
            if b.fixed:
                continue
            a_new, al_new = b.f * b.inv_m, b.tau * b.inv_I
            b.v     += 0.5 * (b._a  + a_new ) * dt
            b.omega += 0.5 * (b._al + al_new) * dt
            b._a, b._al = a_new, al_new
