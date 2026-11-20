const NEAR = 0.35;
const DISTANCE = 7.5;

export function orbitCamera(target, yaw, pitch, width, height, distance=DISTANCE, centerY=.55) {
  const radians = Math.PI / 180;
  const ca = Math.cos(yaw * radians), sa = Math.sin(yaw * radians);
  const cp = Math.cos(pitch * radians), sp = Math.sin(pitch * radians);
  const focal = height * 0.87;

  function toCamera([x,y,z]) {
    const dx = x - target[0], up = y - target[1], dz = z - target[2];
    const forward = dx * sa + dz * ca;
    return [dx * ca - dz * sa, up * cp + forward * sp, distance + forward * cp - up * sp];
  }
  function toScreen([right,up,depth]) {
    const scale = focal / depth;
    return [width * 0.5 + right * scale, height * centerY - up * scale, scale, depth];
  }
  function project(world) {
    const point = toCamera(world);
    return point[2] >= NEAR ? toScreen(point) : null;
  }
  function polygon(vertices) {
    const points = vertices.map(toCamera);
    const clipped = [];
    for (let i = 0; i < points.length; i++) {
      const start = points[(i + points.length - 1) % points.length], end = points[i];
      const startVisible = start[2] >= NEAR, endVisible = end[2] >= NEAR;
      if (startVisible !== endVisible) {
        const fraction = (NEAR - start[2]) / (end[2] - start[2]);
        clipped.push([
          start[0] + fraction * (end[0] - start[0]),
          start[1] + fraction * (end[1] - start[1]),
          NEAR
        ]);
      }
      if (endVisible) clipped.push(end);
    }
    return clipped.map(toScreen);
  }
  return {project,polygon};
}
