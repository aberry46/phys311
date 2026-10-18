import numpy as np

def resolve_pair(a, b, e=1.0):
    """Impulse + positional correction for two overlapping disks."""
    d    = b.r - a.r
    dist = np.linalg.norm(d)
    if dist == 0 or dist > a.radius + b.radius:
        return False                      # no contact

    n     = d / dist                      # unit line of centres
    v_rel = b.v - a.v
    vn    = v_rel.dot(n)
    if vn > 0:
        return False                      # already separating -- CRITICAL

    im_a, im_b = a.inv_m, b.inv_m
    if im_a + im_b == 0:
        return False                      # two fixed bodies

    J = -(1 + e) * vn / (im_a + im_b)     # scalar impulse
    a.v -= J * im_a * n
    b.v += J * im_b * n

    overlap = a.radius + b.radius - dist  # de-penetrate, split by inverse mass
    a.r -= n * overlap * (im_a / (im_a + im_b))
    b.r += n * overlap * (im_b / (im_a + im_b))
    return True


class CircleCollisions:
    """Narrow phase over all pairs. O(N^2) -- fine to ~200 bodies."""
    def __init__(self, e=1.0):
        self.e = e
        self.count = 0
    def resolve(self, world):
        bs = world.bodies
        for i in range(len(bs)):
            for j in range(i + 1, len(bs)):
                if bs[i].radius > 0 and bs[j].radius > 0:
                    if resolve_pair(bs[i], bs[j], self.e):
                        self.count += 1


class BoxWalls:
    """Axis-aligned container. NOTE: walls are EXTERNAL -- they break momentum."""
    def __init__(self, xmin, xmax, ymin, ymax, e=1.0):
        self.bounds = (xmin, xmax, ymin, ymax)
        self.e = e
        self.count = 0
    def resolve(self, world):
        xmin, xmax, ymin, ymax = self.bounds
        for b in world.bodies:
            if b.fixed:
                continue
            R = b.radius
            if b.r[0] - R < xmin:
                b.r[0] = xmin + R; b.v[0] = -self.e * b.v[0]; self.count += 1
            if b.r[0] + R > xmax:
                b.r[0] = xmax - R; b.v[0] = -self.e * b.v[0]; self.count += 1
            if b.r[1] - R < ymin:
                b.r[1] = ymin + R; b.v[1] = -self.e * b.v[1]; self.count += 1
            if b.r[1] + R > ymax:
                b.r[1] = ymax - R; b.v[1] = -self.e * b.v[1]; self.count += 1
