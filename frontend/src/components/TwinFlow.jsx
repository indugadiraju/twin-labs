export default function TwinFlow({ active = false, compact = false }) {
  return <div className={`twin-flow ${compact ? 'twin-flow-compact' : ''} ${active ? 'twin-flow-active' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 720 620" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id="ribbon-one" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f4bce8" stopOpacity=".8"/><stop offset=".48" stopColor="#a87cf2" stopOpacity=".66"/><stop offset="1" stopColor="#4535ac" stopOpacity=".1"/></linearGradient>
        <linearGradient id="ribbon-two" x1="1" y1="0" x2="0" y2="1"><stop stopColor="#c9a4ff" stopOpacity=".82"/><stop offset=".5" stopColor="#6d5adc" stopOpacity=".38"/><stop offset="1" stopColor="#e9a5dc" stopOpacity=".2"/></linearGradient>
        <filter id="flow-blur"><feGaussianBlur stdDeviation="25" /></filter>
      </defs>
      <g className="flow-aura" filter="url(#flow-blur)"><ellipse cx="400" cy="320" rx="238" ry="178" fill="#af7bea" opacity=".33"/><ellipse cx="530" cy="270" rx="150" ry="195" fill="#eea3d7" opacity=".24"/></g>
      <g className="flow-ribbons">
        <path d="M-85 455 C90 285 172 454 312 340 S530 88 815 164" fill="none" stroke="url(#ribbon-one)" strokeWidth="96" strokeLinecap="round" opacity=".5"/>
        <path d="M-80 512 C95 342 192 519 353 377 S568 137 822 235" fill="none" stroke="url(#ribbon-two)" strokeWidth="76" strokeLinecap="round" opacity=".55"/>
        <path d="M-90 410 C116 248 222 400 353 288 S554 65 816 115" fill="none" stroke="#f4c8ed" strokeWidth="3" strokeLinecap="round" opacity=".43"/>
        <path d="M-90 559 C100 387 229 538 389 411 S596 201 818 294" fill="none" stroke="#bda7ff" strokeWidth="2" strokeLinecap="round" opacity=".4"/>
      </g>
      <circle className="flow-pulse" cx="400" cy="315" r="78" fill="none" stroke="#f4c9f5" strokeWidth="2" />
    </svg>
  </div>
}
