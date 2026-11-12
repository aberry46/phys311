export class EnergyChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.history = [];
    this.maxPoints = 600;
  }

  reset() {
    this.history = [];
  }

  record(world) {
    const energy = world.totalEnergy();

    if (!Number.isFinite(energy)) return;

    this.history.push({
      t: world.time,
      energy
    });

    if (this.history.length > this.maxPoints) {
      this.history.shift();
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, W, H);

    if (this.history.length < 2) return;

    const energies = this.history.map(p => p.energy);
    const times = this.history.map(p => p.t);

    let minE = Math.min(...energies);
    let maxE = Math.max(...energies);

    if (Math.abs(maxE - minE) < 1e-9) {
      minE -= 1;
      maxE += 1;
    }

    const minT = times[0];
    const maxT = times[times.length - 1];
    const spanT = Math.max(maxT - minT, 1e-9);

    const margin = 35;
    const width = W - 2 * margin;
    const height = H - 2 * margin;

    const sx = t =>
      margin + ((t - minT) / spanT) * width;

    const sy = E =>
      H - margin - ((E - minE) / (maxE - minE)) * height;

    // Graph axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, H - margin);
    ctx.lineTo(W - margin, H - margin);
    ctx.stroke();

    // Energy curve
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;

    ctx.beginPath();

    this.history.forEach((point, i) => {
      const x = sx(point.t);
      const y = sy(point.energy);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';

    ctx.fillText(
      `Max: ${maxE.toFixed(2)} J`,
      margin + 5,
      18
    );

    ctx.fillText(
      `Min: ${minE.toFixed(2)} J`,
      margin + 170,
      18
    );

    ctx.fillText(
      `Time: ${maxT.toFixed(2)} s`,
      W - 160,
      18
    );
  }
}
