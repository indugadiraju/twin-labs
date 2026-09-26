import { useEffect, useId, useState } from 'react'

export default function TwinFlow({ active = false, compact = false, week = 1 }) {
  const id = useId().replace(/:/g, '')
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  const morph = (values, duration) => !reducedMotion && <animate attributeName="d" values={values} dur={duration} repeatCount="indefinite" />
  return <div className={`twin-flow twin-flow-week-${week} ${compact ? 'twin-flow-compact' : ''} ${active ? 'twin-flow-active' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 760 660" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <radialGradient id={`${id}-aura`}><stop stopColor="#f0b5ed" stopOpacity=".68"/><stop offset=".58" stopColor="#9a77e7" stopOpacity=".24"/><stop offset="1" stopColor="#7549b5" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-veil`} x1=".1" y1=".1" x2=".9" y2="1"><stop stopColor="#f7cafa" stopOpacity=".68"/><stop offset=".4" stopColor="#c8a1f4" stopOpacity=".42"/><stop offset="1" stopColor="#5233b2" stopOpacity=".05"/></linearGradient>
        <linearGradient id={`${id}-fold`} x1="0" y1=".2" x2="1" y2=".8"><stop stopColor="#aa9fff" stopOpacity=".12"/><stop offset=".45" stopColor="#8d68e1" stopOpacity=".58"/><stop offset="1" stopColor="#f5addd" stopOpacity=".35"/></linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4ff" stopOpacity=".02"/><stop offset=".5" stopColor="#ffe2fc" stopOpacity=".7"/><stop offset="1" stopColor="#b9a5ff" stopOpacity=".08"/></linearGradient>
        <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="28"/></filter>
        <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="6"/></filter>
      </defs>
      <g className="flow-atmosphere" filter={`url(#${id}-blur)`}><ellipse cx="390" cy="350" rx="270" ry="235" fill={`url(#${id}-aura)`}/><ellipse cx="525" cy="270" rx="170" ry="155" fill="#e9a2e0" opacity=".25"/><ellipse cx="245" cy="510" rx="175" ry="90" fill="#6664dd" opacity=".3"/></g>
      <g className="flow-layer flow-layer-back"><path fill={`url(#${id}-fold)`} d="M-42 510 C88 300 190 468 330 302 C460 144 563 144 810 240 C645 204 580 315 444 448 C320 576 174 403 -42 610 Z">{morph('M-42 510 C88 300 190 468 330 302 C460 144 563 144 810 240 C645 204 580 315 444 448 C320 576 174 403 -42 610 Z;M-42 470 C110 355 190 426 345 260 C504 120 600 180 810 190 C645 240 565 310 414 415 C285 530 148 430 -42 570 Z;M-42 510 C88 300 190 468 330 302 C460 144 563 144 810 240 C645 204 580 315 444 448 C320 576 174 403 -42 610 Z','22s')}</path></g>
      <g className="flow-layer flow-layer-mid"><path fill={`url(#${id}-veil)`} d="M-34 485 C95 295 222 438 351 282 C482 116 603 170 810 130 C607 285 605 315 433 442 C300 542 112 438 -34 595 Z">{morph('M-34 485 C95 295 222 438 351 282 C482 116 603 170 810 130 C607 285 605 315 433 442 C300 542 112 438 -34 595 Z;M-34 450 C112 342 206 421 365 270 C515 137 628 155 810 163 C625 251 571 350 449 413 C285 508 139 468 -34 572 Z;M-34 485 C95 295 222 438 351 282 C482 116 603 170 810 130 C607 285 605 315 433 442 C300 542 112 438 -34 595 Z','17s')}</path></g>
      <g className="flow-layer flow-layer-front"><path fill={`url(#${id}-fold)`} d="M-55 568 C103 430 193 554 376 376 C531 231 647 277 813 294 C643 302 555 436 438 502 C300 590 161 500 -55 640 Z">{morph('M-55 568 C103 430 193 554 376 376 C531 231 647 277 813 294 C643 302 555 436 438 502 C300 590 161 500 -55 640 Z;M-55 530 C125 400 240 555 390 395 C523 254 660 245 813 335 C650 310 567 414 430 525 C275 618 133 496 -55 625 Z;M-55 568 C103 430 193 554 376 376 C531 231 647 277 813 294 C643 302 555 436 438 502 C300 590 161 500 -55 640 Z','25s')}</path></g>
      <g className="flow-luminous" filter={`url(#${id}-soft)`}><path d="M30 462 C154 318 265 446 382 295 S604 169 729 155" fill="none" stroke={`url(#${id}-edge)`} strokeWidth="10" strokeLinecap="round"/><path d="M5 522 C159 389 272 516 422 360 S604 253 751 264" fill="none" stroke="#f5d1ff" strokeWidth="5" opacity=".48" strokeLinecap="round"/></g>
      <g className="flow-seed"><ellipse cx="434" cy="331" rx="58" ry="43" fill="#f4d8ff" opacity=".3" filter={`url(#${id}-blur)`}/><circle cx="442" cy="329" r="5" fill="#fff2ff" opacity=".82"/></g>
      <circle className="flow-pulse" cx="442" cy="329" r="30" fill="none" stroke="#ffe5ff" strokeWidth="2" />
    </svg>
  </div>
}
