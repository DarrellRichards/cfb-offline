export function FieldBackground() {
  return (
    <div className="heroField" aria-hidden="true">
      <div className="heroFieldGrain" />
      <svg className="heroYardLines" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="fieldFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c3a24" />
            <stop offset="55%" stopColor="#062416" />
            <stop offset="100%" stopColor="#04150d" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#fieldFade)" />
        <g stroke="rgba(236,240,232,0.22)" strokeWidth="2" fill="none">
          <line x1="0" y1="120" x2="1200" y2="120" />
          <line x1="0" y1="220" x2="1200" y2="220" />
          <line x1="0" y1="320" x2="1200" y2="320" />
          <line x1="0" y1="420" x2="1200" y2="420" />
          <line x1="0" y1="520" x2="1200" y2="520" />
          <line x1="0" y1="620" x2="1200" y2="620" />
          <line x1="0" y1="720" x2="1200" y2="720" />
        </g>
        <g stroke="rgba(230,184,77,0.55)" strokeWidth="4" fill="none">
          <line x1="0" y1="420" x2="1200" y2="420" />
        </g>
        <g fill="rgba(236,240,232,0.14)" fontFamily="Bebas Neue, sans-serif" fontSize="42">
          <text x="48" y="210">
            40
          </text>
          <text x="48" y="310">
            30
          </text>
          <text x="48" y="410">
            20
          </text>
          <text x="48" y="510">
            10
          </text>
          <text x="1100" y="210" textAnchor="end">
            40
          </text>
          <text x="1100" y="310" textAnchor="end">
            30
          </text>
          <text x="1100" y="410" textAnchor="end">
            20
          </text>
          <text x="1100" y="510" textAnchor="end">
            10
          </text>
        </g>
      </svg>
      <div className="heroVignette" />
    </div>
  );
}
