const NUM_DASHES = 40;
const CX = 50, CY = 50;
const RADIUS = 34;
const DASH_W = 3.6, DASH_H = 9.5;

export function LMAgroEmblem({ size = 48, color = "#5bae30" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7acc3a" />
          <stop offset="100%" stopColor="#3d8a18" />
        </linearGradient>
      </defs>

      {Array.from({ length: NUM_DASHES }, (_, i) => {
        const angle = (i * 360) / NUM_DASHES;
        return (
          <rect
            key={i}
            x={CX - DASH_W / 2}
            y={CY - RADIUS - DASH_H}
            width={DASH_W}
            height={DASH_H}
            rx={DASH_W / 2}
            fill="url(#dashGrad)"
            transform={`rotate(${angle} ${CX} ${CY})`}
          />
        );
      })}

      {/* Letter L */}
      <path
        d="M 43,33 L 43,63 L 61,63 L 61,57.5 L 48.5,57.5 L 48.5,33 Z"
        fill="#4a9420"
      />
    </svg>
  );
}

export function LMAgroLogoFull() {
  return (
    <div style={{ textAlign: "center" }}>
      <LMAgroEmblem size={130} />
      <div style={{
        fontWeight: 900, letterSpacing: "0.18em", fontSize: 30, marginTop: 6,
        color: "#3a6b14",
        textShadow: "1px 1px 0 #8fbe50, -1px -1px 0 #8fbe50",
      }}>
        L.M. AGRO
      </div>
      <div style={{
        fontSize: 12, letterSpacing: "0.22em", color: "#20a8a0",
        marginTop: 4, fontWeight: 600,
      }}>
        AGRICULTURA &amp; GESTÃO
      </div>
    </div>
  );
}

export function LMAgroSidebarLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LMAgroEmblem size={40} />
      <div>
        <div style={{
          fontWeight: 900, letterSpacing: "0.14em", color: "#fff",
          fontSize: 14, lineHeight: 1.15,
        }}>
          L.M. AGRO
        </div>
        <div style={{
          fontSize: 8, letterSpacing: "0.16em", color: "#67e8f9",
          marginTop: 2, lineHeight: 1, fontWeight: 600,
        }}>
          AGRICULTURA &amp; GESTÃO
        </div>
      </div>
    </div>
  );
}
