import numpy as np

class Body:
    """A rigid disk: linear state + optional rotational state."""

    def __init__(self, m=1.0, r=(0.0, 0.0), v=(0.0, 0.0), radius=0.0,
                 I=None, theta=0.0, omega=0.0, fixed=False, name=""):
        self.m      = float(m)
        self.r      = np.array(r, dtype=float)     # position  (m)
        self.v      = np.array(v, dtype=float)     # velocity  (m/s)
        self.radius = float(radius)                # for contact tests
        self.I      = I                            # moment of inertia; None = point mass
        self.theta  = float(theta)                 # orientation (rad)
        self.omega  = float(omega)                 # angular velocity (rad/s)
        self.fixed  = bool(fixed)                  # immovable?
        self.name   = name

        self.f   = np.zeros(2)   # force accumulator  -- cleared every step
        self.tau = 0.0           # torque accumulator -- cleared every step

    # --- inverse mass makes "fixed" arithmetic, not conditional ---
    @property
    def inv_m(self):
        return 0.0 if self.fixed else 1.0 / self.m

    @property
    def inv_I(self):
        if self.fixed or self.I is None or self.I == 0:
            return 0.0
        return 1.0 / self.I

    def clear(self):
        self.f[:] = 0.0
        self.tau  = 0.0

    def add_force(self, F):
        self.f += np.asarray(F, dtype=float)

    # --- diagnostics ---
    def ke(self):
        k = 0.5 * self.m * self.v.dot(self.v)
        if self.I:
            k += 0.5 * self.I * self.omega**2
        return k

    def p(self):
        return self.m * self.v

    def L_about(self, origin=(0.0, 0.0)):
        d  = self.r - np.asarray(origin, dtype=float)
        Lz = self.m * (d[0]*self.v[1] - d[1]*self.v[0])     # orbital
        if self.I:
            Lz += self.I * self.omega                        # spin
        return Lz

    def __repr__(self):
        return f"Body({self.name or 'body'}, m={self.m}, r={self.r}, v={self.v})"
