export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }

    draw(world) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        const W = canvas.width;
        const H = canvas.height;

        // Clear background
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, 0, W, H);

        // World coordinate bounds
        const bounds = world.viewBounds ?? world.bounds ?? {
            xMin: -12,
            xMax: 12,
            yMin: -8,
            yMax: 8
        };

        const spanX = bounds.xMax - bounds.xMin;
        const spanY = bounds.yMax - bounds.yMin;

        const scale = Math.min(
            (W - 40) / spanX,
            (H - 40) / spanY
        );

        const offsetX = (W - scale * spanX) / 2;
        const offsetY = (H - scale * spanY) / 2;

        // World to screen coordinates
        const sx = x => offsetX + (x - bounds.xMin) * scale;
        const sy = y => H - offsetY - (y - bounds.yMin) * scale;

        // -----------------------------------------
        // GRID AND AXES
        // -----------------------------------------

        ctx.strokeStyle = "#2f2f2f";
        ctx.lineWidth = 1;

        const spacing = spanX > 20 ? 5 : 1;

        for (
            let x = Math.ceil(bounds.xMin / spacing) * spacing;
            x <= bounds.xMax;
            x += spacing
        ) {
            ctx.beginPath();
            ctx.moveTo(sx(x), 0);
            ctx.lineTo(sx(x), H);
            ctx.stroke();
        }

        for (
            let y = Math.ceil(bounds.yMin / spacing) * spacing;
            y <= bounds.yMax;
            y += spacing
        ) {
            ctx.beginPath();
            ctx.moveTo(0, sy(y));
            ctx.lineTo(W, sy(y));
            ctx.stroke();
        }

        // Coordinate axes
        ctx.strokeStyle = "#5a5a5a";
        ctx.lineWidth = 2;

        if (bounds.yMin <= 0 && bounds.yMax >= 0) {
            ctx.beginPath();
            ctx.moveTo(0, sy(0));
            ctx.lineTo(W, sy(0));
            ctx.stroke();
        }

        if (bounds.xMin <= 0 && bounds.xMax >= 0) {
            ctx.beginPath();
            ctx.moveTo(sx(0), 0);
            ctx.lineTo(sx(0), H);
            ctx.stroke();
        }

        // -----------------------------------------
        // WORLD BOUNDARIES
        // -----------------------------------------

        if (world.bounds) {
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 2;

            ctx.strokeRect(
                sx(world.bounds.xMin),
                sy(world.bounds.yMax),
                (world.bounds.xMax - world.bounds.xMin) * scale,
                (world.bounds.yMax - world.bounds.yMin) * scale
            );
        }

        // -----------------------------------------
        // SPRING CONNECTIONS
        // -----------------------------------------

        for (const f of world.forces) {
            if (!f.a || !f.b) continue;

            ctx.strokeStyle = "#a3e635";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(sx(f.a.pos.x), sy(f.a.pos.y));
            ctx.lineTo(sx(f.b.pos.x), sy(f.b.pos.y));
            ctx.stroke();
        }

        // -----------------------------------------
        // DRAW BODIES
        // -----------------------------------------

        for (const b of world.bodies) {

            // Motion trails
            if (b.trail?.length > 1) {
                ctx.beginPath();

                ctx.strokeStyle = b.color + "88";
                ctx.lineWidth = 1.5;

                b.trail.forEach((point, i) => {
                    const x = Array.isArray(point) ? point[0] : point.x;
                    const y = Array.isArray(point) ? point[1] : point.y;

                    if (i === 0) {
                        ctx.moveTo(sx(x), sy(y));
                    } else {
                        ctx.lineTo(sx(x), sy(y));
                    }
                });

                ctx.stroke();
            }

            // Body circle
            ctx.beginPath();

            ctx.arc(
                sx(b.pos.x),
                sy(b.pos.y),
                Math.max(2, b.radius * scale),
                0,
                2 * Math.PI
            );

            ctx.fillStyle = b.color;
            ctx.fill();

            // Highlight static bodies
            if (b.isStatic) {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // -----------------------------------------
        // SCALE BAR
        // -----------------------------------------

        const scaleLength = spacing;
        const barLength = scaleLength * scale;

        if (barLength < W - 50) {
            const x = W - barLength - 24;
            const y = 30;

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + barLength, y);

            ctx.moveTo(x, y - 5);
            ctx.lineTo(x, y + 5);

            ctx.moveTo(x + barLength, y - 5);
            ctx.lineTo(x + barLength, y + 5);

            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";

            ctx.fillText(
                `${scaleLength} m`,
                x + barLength / 2,
                y - 10
            );

            ctx.textAlign = "left";
        }
    }
}
