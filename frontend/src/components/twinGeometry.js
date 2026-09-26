// Pseudo-3D geometry for the digital twin, rendered as SVG.
//
// The body is a set of tubes (head, torso, arms, legs). Each tube is a list of
// elliptical cross-sections [y, x0, z0, rx, rz]: lateral centre x0 and depth
// centre z0 (relative to the centreline, +z faces the viewer at 0°), and the
// half-width rx / half-depth rz. Rotating about the vertical axis and projecting
// each section gives the silhouette, contour rings and surface lines for any
// viewing angle. At 0° the silhouette matches the original front outline.

export const C = 300
const r1 = (n) => Math.round(n * 10) / 10
const RING_TILT = 0.16 // slight top-down camera: rings read as flattened ellipses

const HEAD = [[20, 0, 2, 5, 6], [26, 0, 3, 20, 25], [48, 0, 3, 33, 39], [72, 0, 5, 35, 41], [96, 0, 7, 31, 35], [112, 0, 6, 23, 26], [124, 0, 4, 15, 16]]
const TORSO = [[122, 0, 2, 15, 15], [138, 0, 2, 19, 18], [148, 0, 2, 44, 27], [160, 0, 4, 60, 33], [176, 0, 8, 64, 36], [205, 0, 9, 60, 36], [240, 0, 6, 56, 33], [290, 0, 5, 51, 31], [332, 0, -3, 60, 34], [362, 0, -6, 64, 37], [380, 0, -4, 56, 33]]
const LEG = [[360, 31, -4, 31, 34], [410, 38, -1, 30, 33], [480, 37, 1, 22, 24], [525, 38, -3, 22, 27], [580, 35, -1, 17, 20], [622, 33, 0, 11, 13], [642, 37, 10, 15, 22], [660, 39, 20, 17, 30]]
const ARM = [[150, 70, 0, 9, 11], [160, 78, 0, 15, 16], [200, 80, 0, 15, 15], [245, 87, 0, 13, 14], [292, 93, 1, 13, 13], [340, 100, 2, 12, 12], [380, 106, 3, 10, 9], [398, 110, 4, 12, 7], [424, 113, 4, 13, 7], [448, 112, 4, 8, 6], [457, 111, 4, 3, 3]]
const mirror = (sections) => sections.map(([y, x, z, rx, rz]) => [y, -x, z, rx, rz])

export const PARTS = [
  { id: 'head', sections: HEAD, meridians: true },
  { id: 'torso', sections: TORSO, meridians: true },
  { id: 'legL', sections: mirror(LEG), meridians: true },
  { id: 'legR', sections: LEG, meridians: true },
  { id: 'armL', sections: mirror(ARM) },
  { id: 'armR', sections: ARM },
]

// Named viewing angles (degrees). +90° turns the participant's right side (screen-left at 0°) to the viewer.
export const VIEWS = [
  { id: 'front', label: 'Front', angle: 0 },
  { id: 'q-right', label: '3/4 right', angle: 45 },
  { id: 'right', label: 'Right side', angle: 90 },
  { id: 'back', label: 'Back', angle: 180 },
  { id: 'left', label: 'Left side', angle: 270 },
  { id: 'q-left', label: '3/4 left', angle: 315 },
]

export const norm = (deg) => ((deg % 360) + 360) % 360
const angDist = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d) }
export const nearestView = (deg) => VIEWS.reduce((best, v) => (angDist(v.angle, deg) < angDist(best.angle, deg) ? v : best), VIEWS[0])

// Next/previous named view from the current angle, as a continuous target angle.
export function stepView(deg, dir) {
  const i = VIEWS.indexOf(nearestView(deg))
  const next = VIEWS[(i + dir + VIEWS.length) % VIEWS.length].angle
  const delta = dir > 0 ? norm(next - deg) || 360 : -(norm(deg - next) || 360)
  return deg + delta
}

function rot(x, z, t) { return { X: x * Math.cos(t) + z * Math.sin(t), Z: -x * Math.sin(t) + z * Math.cos(t) } }

// Project a surface point [absX, y, z, nx, nz] (the lens anchor format) for angle θ.
// `facing` is the rotated normal's depth: < 0 means the surface points away from the viewer.
export function projectPoint([ax, y, z, nx = 0, nz = 1], t) {
  const { X, Z } = rot(ax - C, z, t)
  const n = rot(nx, nz, t)
  return { x: r1(C + X), y, z: Z, facing: n.Z / Math.hypot(nx, nz) }
}

function smoothClosed(pts) {
  const n = pts.length
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]]
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])},${r1(p2[1])}`
  }
  return `${d}Z`
}

// Linearly interpolate extra sections so contour rings are evenly spaced.
function densify(sections, step) {
  const out = []
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1]
    const n = Math.max(1, Math.round((b[0] - a[0]) / step))
    for (let k = 0; k < n; k++) out.push(a.map((v, j) => v + ((b[j] - v) * k) / n))
  }
  out.push(sections.at(-1))
  return out
}
const DENSE = Object.fromEntries(PARTS.map((p) => [p.id, densify(p.sections, 17)]))

function projectSection([y, x0, z0, rx, rz], t) {
  const c = rot(x0, z0, t)
  const e = Math.hypot(rx * Math.cos(t), rz * Math.sin(t))
  const depth = Math.hypot(rx * Math.sin(t), rz * Math.cos(t))
  return { y, x: C + c.X, z: c.Z, e, depth }
}

function surface([y, x0, z0, rx, rz], phi, t) {
  const p = rot(x0 + rx * Math.cos(phi), z0 + rz * Math.sin(phi), t)
  return { x: C + p.X, y, z: p.Z }
}

const FRONT = Math.PI / 2 // φ pointing at +z (the participant's front)

// Torso section at height y (interpolated) — used for anatomical surface lines.
function torsoAt(y) {
  const s = TORSO
  for (let i = 0; i < s.length - 1; i++) if (y >= s[i][0] && y <= s[i + 1][0]) { const k = (y - s[i][0]) / (s[i + 1][0] - s[i][0]); return s[i].map((v, j) => v + (s[i + 1][j] - v) * k) }
  return s.at(-1)
}
function arc(y, from, to, droop, t) {
  return Array.from({ length: 9 }, (_, i) => { const phi = from + ((to - from) * i) / 8; const p = surface(torsoAt(y + droop * Math.sin((Math.PI * i) / 8)), phi, t); return p })
}

export function projectBody(angleDeg) {
  const t = (angleDeg * Math.PI) / 180
  const parts = PARTS.map((part) => {
    const sec = part.sections.map((s) => projectSection(s, t))
    const outline = [...sec.map((s) => [s.x - s.e, s.y]), ...[...sec].reverse().map((s) => [s.x + s.e, s.y])]
    const rings = DENSE[part.id].slice(1, -1).map((s) => projectSection(s, t)).map((s) => ({
      near: `M${r1(s.x - s.e)},${r1(s.y)} A${r1(s.e)},${r1(s.depth * RING_TILT)} 0 0 0 ${r1(s.x + s.e)},${r1(s.y)}`,
      far: `M${r1(s.x - s.e)},${r1(s.y)} A${r1(s.e)},${r1(s.depth * RING_TILT)} 0 0 1 ${r1(s.x + s.e)},${r1(s.y)}`,
    }))
    const meridians = part.meridians ? Array.from({ length: 8 }, (_, k) => {
      const phi = (k * Math.PI) / 4
      const pts = DENSE[part.id].map((s) => surface(s, phi, t))
      return { d: pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p.x)},${r1(p.y)}`).join(' '), facing: pts.reduce((a, p) => a + p.z, 0) / pts.length }
    }) : []
    const depth = sec.reduce((a, s) => a + s.z, 0) / sec.length
    return { id: part.id, d: smoothClosed(outline), rings, meridians, depth }
  }).sort((a, b) => a.depth - b.depth)

  // Orientation cues on the torso surface: sternum/ribs/clavicles/navel (front), spine (back).
  const line = (pts) => ({ d: pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p.x)},${r1(p.y)}`).join(' '), facing: pts.reduce((a, p) => a + p.z, 0) / pts.length })
  const anatomy = [
    line(arc(150, FRONT - 1.1, FRONT + 1.1, 5, t)),
    ...[172, 192, 212].map((y) => line(arc(y, FRONT - 0.95, FRONT + 0.95, 12, t))),
    line(arc(342, FRONT - 1.0, FRONT + 1.0, 14, t)),
    line([150, 170, 200, 230, 250].map((y) => surface(torsoAt(y), FRONT, t))),
  ]
  const spine = line([130, 160, 200, 240, 280, 320, 350].map((y) => surface(torsoAt(y), -FRONT, t)))
  const navel = surface(torsoAt(300), FRONT, t)

  const J = (part, y) => { const s = PARTS.find((p) => p.id === part).sections.find((q) => q[0] === y); const c = rot(s[1], s[2], t); return { x: r1(C + c.X), y, z: c.Z } }
  const joints = [J('torso', 122), J('torso', 205), J('torso', 362), J('armL', 160), J('armR', 160), J('armL', 292), J('armR', 292), J('armL', 380), J('armR', 380), J('legL', 360), J('legR', 360), J('legL', 480), J('legR', 480), J('legL', 622), J('legR', 622)]
  const bones = [[0, 1], [1, 2], [0, 3], [0, 4], [3, 5], [4, 6], [5, 7], [6, 8], [2, 9], [2, 10], [9, 11], [10, 12], [11, 13], [12, 14]]

  return { parts, anatomy, spine, navel, joints, bones, t }
}
