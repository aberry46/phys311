// Lab 10 - Pointer Input and Coordinate Conversion

export function eventToWorld(event, canvas, camera) {
  const rect = canvas.getBoundingClientRect();

  // Convert browser coordinates to canvas pixels
  const px = (event.clientX - rect.left) *
             (canvas.width / rect.width);

  const py = (event.clientY - rect.top) *
             (canvas.height / rect.height);

  // Convert canvas pixels to physics coordinates
  return {
    x: camera.toWorldX(px),
    y: camera.toWorldY(py)
  };
}

export function setupPointerInput(canvas, camera) {
  const pointer = {
    x: 0,
    y: 0,
    active: false
  };

  canvas.addEventListener("pointermove", (event) => {
    const pos = eventToWorld(event, canvas, camera);

    pointer.x = pos.x;
    pointer.y = pos.y;
    pointer.active = true;
  });

  canvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  return pointer;
}
