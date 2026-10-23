import numpy as np
from .integrators import EulerCromer

class World:
    """Owns bodies, forces, constraints, the integrator, and the clock."""

    def __init__(self, integrator=None, forces=None, bodies=None, constraints=None):
        self.bodies      = list(bodies or [])
        self.forces      = list(forces or [])
        self.constraints = list(constraints or [])
        self.integrator  = integrator or EulerCromer()
        self.t           = 0.0
        self._primed     = False            # Verlet acceleration cache valid?
        self.recorders   = {}
        self.history     = {}

    # --- scene construction ---
    def add(self, body):
        self.bodies.append(body); self._primed = False; return body

    def add_force(self, force):
        self.forces.append(force); self._primed = False; return force

    def add_constraint(self, c):
        self.constraints.append(c); return c

    # --- stages 1 + 2 ---
    def compute_forces(self):
        for b in self.bodies:
            b.clear()
        for f in self.forces:
            f.apply(self)                   # polymorphism: never asks "which force?"

    # --- the loop ---
    def step(self, dt):
        self.integrator.step(self, dt)      # stages 1-3
        for c in self.constraints:          # stage 4
            c.resolve(self)
        self.t += dt                        # stage 5

    # --- diagnostics ---
    def kinetic_energy(self):
        return sum(b.ke() for b in self.bodies)
    def potential_energy(self):
        return sum(f.potential_energy(self) for f in self.forces)
    def total_energy(self):
        return self.kinetic_energy() + self.potential_energy()
    def momentum(self):
        return sum((b.p() for b in self.bodies), np.zeros(2))
    def angular_momentum(self, origin=(0, 0)):
        return sum(b.L_about(origin) for b in self.bodies)

    # --- recording ---
    def record(self, name, fn):
        """Register a quantity to capture. fn(world) -> number or array."""
        self.recorders[name] = fn
        self.history[name]   = []

    def capture(self):
        for k, fn in self.recorders.items():
            self.history[k].append(fn(self))

    def run(self, dt, t_end, capture_every=1):
        self.capture()
        for i in range(int(round(t_end / dt))):
            self.step(dt)
            if (i + 1) % capture_every == 0:
                self.capture()
        return {k: np.array(v) for k, v in self.history.items()}
