import numpy as np

class Force:
    """Interface. Subclass and override apply()."""
    def apply(self, world):
        raise NotImplementedError
    def potential_energy(self, world):
        return 0.0          # non-conservative by default


class Gravity(Force):
    """Uniform gravitational field (Labs 1-2)."""
    def __init__(self, g=9.81):
        self.gmag = g
        self.g    = np.array([0.0, -g])
    def apply(self, world):
        for b in world.bodies:
            if not b.fixed:
                b.add_force(b.m * self.g)
    def potential_energy(self, world):
        return sum(b.m * self.gmag * b.r[1] for b in world.bodies if not b.fixed)


class Drag(Force):
    """Linear or quadratic drag (Lab 1 Part C). Non-conservative."""
    def __init__(self, k=0.1, quadratic=True):
        self.k = k
        self.quadratic = quadratic
    def apply(self, world):
        for b in world.bodies:
            if b.fixed:
                continue
            speed = np.linalg.norm(b.v)
            if speed == 0:
                continue
            b.add_force(-self.k * speed * b.v if self.quadratic else -self.k * b.v)


class Spring(Force):
    """Hooke's law between two bodies (Lab 3)."""
    def __init__(self, i, j, k=1.0, L0=0.0):
        self.i, self.j, self.k, self.L0 = i, j, k, L0
    def apply(self, world):
        a, b = world.bodies[self.i], world.bodies[self.j]
        d = b.r - a.r
        L = np.linalg.norm(d)
        if L == 0:
            return
        F = self.k * (L - self.L0) * (d / L)
        a.add_force( F)                 # Newton's third law,
        b.add_force(-F)                 # enforced structurally
    def potential_energy(self, world):
        a, b = world.bodies[self.i], world.bodies[self.j]
        L = np.linalg.norm(b.r - a.r)
        return 0.5 * self.k * (L - self.L0)**2


class NewtonGravity(Force):
    """Universal gravitation, all pairs (Lab 5). O(N^2)."""
    def __init__(self, G=1.0, soft=0.0):
        self.G, self.soft = G, soft
    def apply(self, world):
        bs = world.bodies
        for i in range(len(bs)):
            for j in range(i + 1, len(bs)):
                a, b = bs[i], bs[j]
                d  = b.r - a.r
                r2 = d.dot(d) + self.soft**2
                r  = np.sqrt(r2)
                if r == 0:
                    continue
                F = self.G * a.m * b.m / r2 * (d / r)
                a.add_force( F)
                b.add_force(-F)
    def potential_energy(self, world):
        bs, U = world.bodies, 0.0
        for i in range(len(bs)):
            for j in range(i + 1, len(bs)):
                r = np.linalg.norm(bs[j].r - bs[i].r)
                if r > 0:
                    U -= self.G * bs[i].m * bs[j].m / r
        return U


class PivotGravityTorque(Force):
    """Physical pendulum (Lab 6):  tau = -m g d sin(theta)."""
    def __init__(self, idx, m, g, d):
        self.idx, self.m, self.g, self.d = idx, m, g, d
    def apply(self, world):
        b = world.bodies[self.idx]
        b.tau += -self.m * self.g * self.d * np.sin(b.theta)
    def potential_energy(self, world):
        b = world.bodies[self.idx]
        return self.m * self.g * self.d * (1 - np.cos(b.theta))


class Wind(Force):
    """Constant force on every non-fixed body. Non-conservative."""
    def __init__(self, F=(1.0, 0.0)):
        self.F = np.array(F, dtype=float)
    def apply(self, world):
        for b in world.bodies:
            if not b.fixed:
                b.add_force(self.F)
