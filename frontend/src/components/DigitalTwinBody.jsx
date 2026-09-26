import { useEffect, useMemo, useRef, useState } from 'react'
import { C, VIEWS, nearestView, projectBody, projectPoint, stepView } from './twinGeometry'

// Holographic, rotatable SVG digital twin. A layered scene (particles → radar →
// light beam → pseudo-3D body → wireframe → hotspots → callouts → platform)
// that visualizes the simulated state it is given. It makes no clinical claims.
// Rotation is local view state: it never touches week, lens, mode or results.

const FLOOR = 672
const r1 = (n) => Math.round(n * 10) / 10
const IDLE_AFTER_MS = 9000 // resume the gentle idle sway after this long without interaction
const IDLE_AMPLITUDE = 16 // degrees: front → slight 3/4 → front
const IDLE_PERIOD_MS = 16000
const DRAG_DEG_PER_PX = 0.45

// Deterministic pseudo-random particle field.
const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const PARTICLES = Array.from({ length: 46 }, (_, i) => ({ x: r1(30 + rand(i) * 540), y: r1(40 + rand(i + 100) * 600), r: r1(0.8 + rand(i + 200) * 1.8), dur: r1(7 + rand(i + 300) * 9), delay: r1(-rand(i + 400) * 16), o: r1(0.25 + rand(i + 500) * 0.5) }))
const LINKS = [[3, [300, 62, 46, 0, 1]], [11, [316, 208, 42, 0.3, 1]], [19, [300, 304, 35, 0, 1]], [27, [186, 426, 8, -0.6, 1]], [35, [414, 426, 8, 0.6, 1]], [41, [350, 356, 20, 0.6, 1]]]

const EDGE = { left: 150, right: 450 }
const FAR = -0.15 // surface normal pointing this far away from the viewer = far side of the body

// Split callouts evenly by projected x (so a turned twin doesn't pile every label on
// one side), then spread each side vertically using each label's real height.
const labelHeight = (c) => (c.spark ? 96 : (c.compare || c.note) ? 70 : 56)
function layoutCallouts(callouts) {
  const byX = [...callouts].sort((a, b) => a.p.x - b.p.x)
  const half = Math.ceil(byX.length / 2)
  const sides = { left: byX.slice(0, half).map((c) => ({ ...c, side: 'left' })), right: byX.slice(half).map((c) => ({ ...c, side: 'right' })) }
  return Object.values(sides).flatMap((items) => {
    let prevBottom = 20
    const placed = [...items].sort((a, b) => a.p.y - b.p.y).map((c) => {
      const h = labelHeight(c)
      const y = Math.max(c.p.y, prevBottom + h / 2 + 8)
      prevBottom = y + h / 2
      return { ...c, y }
    })
    const overflow = prevBottom - 660
    return overflow > 0 ? placed.map((c) => ({ ...c, y: c.y - overflow })) : placed
  })
}

function Sparkline({ spark }) {
  const values = [...spark.original, ...spark.modified]
  const low = Math.min(...values), high = Math.max(...values), span = high - low || 1
  const pts = (s) => s.map((v, i) => `${r1((i / (s.length - 1)) * 64)},${r1(18 - ((v - low) / span) * 16)}`).join(' ')
  return <svg className="twin-spark" viewBox="0 0 64 20" aria-hidden="true"><polyline points={pts(spark.original)} className="spark-original" /><polyline points={pts(spark.modified)} className="spark-modified" /></svg>
}

function Hotspot({ id, p, level, ghost, tone, selected, onSelect, label }) {
  const visible = level > 0 || ghost > 0 || tone === 'info' || tone === 'lab'
  const strength = tone === 'lab' ? 0.55 : level
  const behind = p.facing < FAR
  return <g className={`twin-hot tone-${tone} ${selected ? 'selected' : ''} ${behind ? 'behind' : ''}`} transform={`translate(${p.x},${p.y})`} style={{ opacity: visible ? (behind ? 0.28 : 1) : 0 }}
    role="button" tabIndex={visible ? 0 : -1} aria-label={`${label}${behind ? ' (far side)' : ''}`} onClick={() => onSelect(id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}>
    <circle className="hot-halo" r={14 + strength * 24} style={{ opacity: 0.18 + strength * 0.7 }} />
    <circle className="hot-pulse" r={8 + strength * 10} />
    {ghost != null && <circle className="hot-ghost" r={14 + ghost * 24} />}
    {tone === 'lab' ? <rect className="hot-core" x="-3.5" y="-3.5" width="7" height="7" transform="rotate(45)" /> : <circle className="hot-core" r={2.6 + strength * 3.6} />}
    <circle className="hot-hit" r="16" />
  </g>
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Smoothly animated view angle with drag, step controls and idle sway.
function useTwinRotation() {
  const [angle, setAngle] = useState(0)
  const target = useRef(0)
  const shown = useRef(0)
  const rendered = useRef(0)
  const drag = useRef(null)
  const lastInteract = useRef(null)
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query?.addEventListener?.('change', update)
    return () => query?.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    let raf
    let lastPaint = 0
    if (lastInteract.current == null) lastInteract.current = performance.now() - IDLE_AFTER_MS
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (!drag.current) shown.current += (target.current - shown.current) * (reduced ? 1 : 0.14)
      const since = now - lastInteract.current - IDLE_AFTER_MS
      const idle = !reduced && !drag.current && since > 0 && Math.abs(target.current - shown.current) < 0.2
        ? Math.min(1, since / 2500) * IDLE_AMPLITUDE * Math.sin((since / IDLE_PERIOD_MS) * 2 * Math.PI) : 0
      const out = shown.current + idle
      const settling = Math.abs(target.current - shown.current) > 0.05 || drag.current
      // Full frame rate while turning/dragging; ~25fps is plenty for the slow idle sway.
      if (Math.abs(out - rendered.current) > 0.04 && (settling || now - lastPaint > 40)) { rendered.current = out; lastPaint = now; setAngle(out) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  // Fold any idle offset into the real angle so interaction never jumps.
  const interact = () => { shown.current = rendered.current; target.current = rendered.current; lastInteract.current = performance.now() }
  return {
    angle,
    step: (dir) => { interact(); target.current = stepView(target.current, dir) },
    goTo: (deg) => { interact(); const d = ((deg - rendered.current) % 360 + 540) % 360 - 180; target.current = rendered.current + d },
    dragStart: (x) => { interact(); drag.current = { x, from: rendered.current, moved: false } },
    dragMove: (x) => {
      if (!drag.current) return
      const dx = x - drag.current.x
      if (Math.abs(dx) > 4) drag.current.moved = true
      shown.current = target.current = drag.current.from + dx * DRAG_DEG_PER_PX
      lastInteract.current = performance.now()
    },
    dragEnd: () => { const moved = drag.current?.moved; drag.current = null; lastInteract.current = performance.now(); return moved },
  }
}

export default function DigitalTwinBody({ view, lens, dir = 1, selected, onSelect, mode, animKey }) {
  const rotation = useTwinRotation()
  const suppressClick = useRef(false)
  const angle = rotation.angle
  const body = useMemo(() => projectBody(angle), [angle])
  const ghostA = useMemo(() => projectBody(angle - 7), [angle])
  const ghostB = useMemo(() => projectBody(angle + 7), [angle])
  const t = body.t
  const project = (a) => projectPoint(a, t)
  const callouts = view.callouts.map((c) => ({ ...c, p: project(c.anchor), extraP: (c.extra || []).map(project) }))
  const placed = layoutCallouts(callouts)
  const field = view.field
  const facing = nearestView(angle)
  const sinT = Math.sin(t)
  const allPaths = body.parts.map((part) => <path key={part.id} d={part.d} />)

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    rotation.dragStart(e.clientX)
  }
  const onPointerUp = () => { suppressClick.current = rotation.dragEnd() }

  return <div className="twin-body-wrap"><div className={`twin-viz mode-${mode} lens-${lens}`}>
    <div className="twin-turn" key={lens} style={{ '--dir': dir }}
      onPointerDown={onPointerDown} onPointerMove={(e) => rotation.dragMove(e.clientX)} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onClickCapture={(e) => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); suppressClick.current = false } }}>
      <svg viewBox="0 0 600 720" role="img" aria-label={`Holographic digital twin, ${mode} state, ${lens} view, ${facing.label} angle. Drag to rotate.`}>
        <defs>
          <clipPath id="twin-clip">{allPaths}</clipPath>
          <mask id="twin-mask"><g fill="white">{allPaths}</g></mask>
          <radialGradient id="twin-volume" cx={r1(0.42 - 0.22 * sinT)} cy=".3" r=".75"><stop offset="0" stopColor="#f3e6ff" stopOpacity=".62" /><stop offset=".38" stopColor="#b693ff" stopOpacity=".34" /><stop offset=".78" stopColor="#6c3bef" stopOpacity=".2" /><stop offset="1" stopColor="#30144e" stopOpacity=".3" /></radialGradient>
          <linearGradient id="twin-shade" x1="0" x2="1"><stop offset="0" stopColor="#1e0b2e" stopOpacity=".45" /><stop offset=".35" stopColor="#1e0b2e" stopOpacity="0" /><stop offset=".7" stopColor="#1e0b2e" stopOpacity="0" /><stop offset="1" stopColor="#1e0b2e" stopOpacity=".5" /></linearGradient>
          <linearGradient id="twin-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#b693ff" stopOpacity=".34" /><stop offset=".55" stopColor="#b693ff" stopOpacity=".08" /><stop offset="1" stopColor="#b693ff" stopOpacity="0" /></linearGradient>
          <linearGradient id="twin-band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8d8fa" stopOpacity="0" /><stop offset=".5" stopColor="#f8d8fa" stopOpacity=".55" /><stop offset="1" stopColor="#f8d8fa" stopOpacity="0" /></linearGradient>
          <linearGradient id="twin-shimmer" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <radialGradient id="twin-platform-glow"><stop offset="0" stopColor="#e38bd8" stopOpacity=".55" /><stop offset=".5" stopColor="#8b61e0" stopOpacity=".22" /><stop offset="1" stopColor="#6c3bef" stopOpacity="0" /></radialGradient>
          <radialGradient id="hot-symptom"><stop offset="0" stopColor="#ffd2f4" stopOpacity="1" /><stop offset=".35" stopColor="#f3a6e4" stopOpacity=".6" /><stop offset="1" stopColor="#e38bd8" stopOpacity="0" /></radialGradient>
          <radialGradient id="hot-info"><stop offset="0" stopColor="#f0e6ff" stopOpacity="1" /><stop offset=".35" stopColor="#c9b2ff" stopOpacity=".55" /><stop offset="1" stopColor="#b693ff" stopOpacity="0" /></radialGradient>
          <filter id="twin-blur-lg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18" /></filter>
          <filter id="twin-blur-sm" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>

        {/* BACKGROUND: floating data field, with slight parallax as the twin turns */}
        <g className="twin-particles-wrap" transform={`translate(${r1(-sinT * 18)},0)`}>
          <g className="twin-particles">
            {PARTICLES.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, '--o': p.o }} />)}
          </g>
        </g>
        {LINKS.map(([i, a], k) => { const q = project(a); return <line key={k} x1={r1(PARTICLES[i].x - sinT * 18)} y1={PARTICLES[i].y} x2={q.x} y2={q.y} className="twin-link" style={{ animationDelay: `${k * 1.7}s`, opacity: q.facing < FAR ? 0 : undefined }} /> })}

        {/* BACK LAYER: radar rings */}
        <g className="twin-radar" transform={`translate(${r1(C - sinT * 8)},330)`}>
          <circle r="232" className="radar-faint" />
          <circle r="272" className="radar-dash spin-slow" />
          <circle r="196" className="radar-tick spin-rev" />
          <path d="M-290,0 H-250 M250,0 H290 M0,-300 V-262" className="radar-faint" />
        </g>

        <path d={`M${C - 112},${FLOOR} L${C - 64},30 L${C + 64},30 L${C + 112},${FLOOR} Z`} fill="url(#twin-beam)" className="twin-beam" />

        {/* BOTTOM: holographic platform — turns with the twin and spins slowly on its own */}
        <g className="twin-platform" transform={`translate(${C},${FLOOR})`}>
          <ellipse rx="230" ry="46" fill="url(#twin-platform-glow)" className="platform-glow" />
          <g transform="scale(1,.21)">
            <circle r="205" className="ring ring-outer" vectorEffect="non-scaling-stroke" />
            <g transform={`rotate(${r1(angle)})`}>
              <circle r="172" className="ring ring-dash spin-cw" vectorEffect="non-scaling-stroke" />
              <circle r="138" className="ring ring-dot spin-ccw" vectorEffect="non-scaling-stroke" />
              <path d="M0,-188 V-172 M0,172 V188 M-188,0 H-172 M172,0 H188" className="ring ring-outer" vectorEffect="non-scaling-stroke" />
            </g>
            <circle r="104" className="ring ring-bright" vectorEffect="non-scaling-stroke" />
            <circle r="66" className="ring ring-core" vectorEffect="non-scaling-stroke" />
            <circle r="104" className="ring platform-flash" vectorEffect="non-scaling-stroke" />
          </g>
        </g>

        {/* MIDDLE: the pseudo-3D body */}
        <g className="twin-core">
          <g className="twin-aura" filter="url(#twin-blur-lg)" style={{ opacity: view.aura * 0.85 }}>{allPaths}</g>
          <g className="twin-ghost ghost-a">{ghostA.parts.map((part) => <path key={part.id} d={part.d} />)}</g>
          <g className="twin-ghost ghost-b">{ghostB.parts.map((part) => <path key={part.id} d={part.d} />)}</g>
          <rect width="600" height="720" fill="url(#twin-volume)" mask="url(#twin-mask)" />
          <g clipPath="url(#twin-clip)">
            <rect width="600" height="720" fill="url(#twin-shade)" />
            <g className="twin-rim" filter="url(#twin-blur-sm)">{allPaths}</g>
            <g className="twin-shimmer-move"><rect x="-220" y="0" width="170" height="720" fill="url(#twin-shimmer)" transform="skewX(-18)" /></g>
            <g className="twin-scan-move"><rect x="0" y="-22" width="600" height="44" fill="url(#twin-band)" /><line x1="0" x2="600" y1="0" y2="0" className="scan-line" /></g>
          </g>
          {/* BODY LAYER: contour rings + meridians wrap the form and turn with it */}
          {body.parts.map((part) => <g key={part.id} className="twin-mesh">
            {part.meridians.map((m, i) => <path key={`m${i}`} d={m.d} className={m.facing > 0 ? 'mesh-front' : 'mesh-back'} />)}
            {part.rings.map((r, i) => <g key={i}><path d={r.far} className="mesh-back" /><path d={r.near} className="mesh-front" /></g>)}
          </g>)}
          <g className="twin-edge-glow" filter="url(#twin-blur-sm)">{allPaths}</g>
          <g className="twin-edge">{allPaths}</g>
          <g className="twin-anatomy">
            {body.anatomy.map((a, i) => <path key={i} d={a.d} style={{ opacity: Math.max(0, Math.min(1, a.facing / 18)) }} />)}
            <path d={body.spine.d} className="twin-spine" style={{ opacity: Math.max(0, Math.min(1, body.spine.facing / 18)) }} />
            <circle cx={r1(body.navel.x)} cy={body.navel.y} r="2.2" style={{ opacity: Math.max(0, Math.min(1, body.navel.z / 18)) }} />
          </g>
          <g className="twin-skeleton">
            {body.bones.map(([a, b], i) => <line key={i} x1={body.joints[a].x} y1={body.joints[a].y} x2={body.joints[b].x} y2={body.joints[b].y} />)}
            {body.joints.map((j, i) => <circle key={i} cx={j.x} cy={j.y} r="2.4" />)}
          </g>
        </g>
        <g className="twin-scan-move"><ellipse cx={C} cy="0" rx="150" ry="11" className="scan-plane" /></g>

        {field?.type === 'exposure' && (() => { const q = project([316, 208, 42, 0.3, 1]); return <g className="twin-field" transform={`translate(${q.x},${q.y})`} style={{ opacity: (0.35 + field.level * 0.6) * (q.facing < FAR ? 0.35 : 1) }}>
          {[0, 1, 2].map((i) => <circle key={i} r="70" className="field-wave" style={{ animationDelay: `${i * 0.9}s` }} />)}
        </g> })()}
        {field?.type === 'response' && <g className="twin-field" transform={`translate(${C},250)`} style={{ opacity: 0.3 + field.level * 0.6 }}>
          <circle r={80 + field.level * 90} className="field-halo" />
          <circle r={70 + field.level * 80} className="field-orbit spin-cw" />
          <circle r={50 + field.level * 60} className="field-orbit spin-ccw" />
        </g>}

        {/* BODY LAYER: hotspots stay on their anatomy as the twin rotates */}
        {callouts.flatMap((c) => [c.p, ...c.extraP].map((p, i) =>
          <Hotspot key={`${c.id}-${i}`} id={c.id} p={p} level={c.level} ghost={c.ghost} tone={c.tone} selected={selected === c.id} onSelect={onSelect} label={`${c.label}: ${c.value}`} />))}

        {/* FRONT: leader lines animate in whenever lens, week or twin state changes */}
        <g className="twin-leaders" key={animKey}>
          {placed.map((c, i) => {
            const edge = EDGE[c.side]
            const bend = c.side === 'left' ? edge + 22 : edge - 22
            return <polyline key={c.id} pathLength="1" points={`${c.p.x},${c.p.y} ${bend},${c.y} ${edge},${c.y}`} className={`twin-lead tone-${c.tone} ${selected === c.id ? 'selected' : ''} ${c.p.facing < FAR ? 'behind' : ''}`} style={{ animationDelay: `${i * 60}ms` }} />
          })}
        </g>
      </svg>

      <div className="twin-labels" key={animKey}>
        {placed.map((c, i) => <button type="button" key={c.id} className={`twin-label ${c.side} tone-${c.tone} ${selected === c.id ? 'selected' : ''} ${c.p.facing < FAR ? 'behind' : ''}`} style={{ top: `${(c.y / 720) * 100}%`, animationDelay: `${120 + i * 60}ms` }} onClick={() => onSelect(c.id)} aria-pressed={selected === c.id}>
          <span>{c.label}{c.p.facing < FAR && <i> · far side</i>}</span>
          <strong>{c.value}</strong>
          {(c.compare || c.note) && <small>{c.compare || c.note}</small>}
          {c.spark && <Sparkline spark={c.spark} />}
        </button>)}
      </div>
    </div>
    </div>

    <div className="twin-rotate" role="group" aria-label="Rotate digital twin">
      <button type="button" className="rotate-arrow" onClick={() => rotation.step(-1)} aria-label="Rotate left">←</button>
      <div className="rotate-views">
        <span className="rotate-current">{facing.label}</span>
        <div className="rotate-dots">{VIEWS.map((v) => <button type="button" key={v.id} aria-label={`${v.label} view`} aria-pressed={v.id === facing.id} className={v.id === facing.id ? 'active' : ''} onClick={() => rotation.goTo(v.angle)} />)}</div>
      </div>
      <button type="button" className="rotate-arrow" onClick={() => rotation.step(1)} aria-label="Rotate right">→</button>
    </div>
  </div>
}
