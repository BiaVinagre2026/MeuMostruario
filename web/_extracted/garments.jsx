// garments.jsx — Stylized SVG illustrations of clothing pieces
// Editorial, flat-fashion-sketch style. Not figurative bodies — just the garment.

function Garment({ type, color = "#C9A279", accent, size = 240, style = {} }) {
  const fg = accent || "#1A1A1A";
  const shadow = "rgba(0,0,0,0.12)";
  const common = { fill: color, stroke: fg, strokeWidth: 0.8, strokeLinejoin: "round", strokeLinecap: "round" };
  const stitch = { fill: "none", stroke: fg, strokeWidth: 0.4, strokeDasharray: "1.2 1.2", opacity: 0.55 };

  const garments = {
    // Bikini — triangle top + asa-delta bottom
    "biquini-triangle": (
      <g>
        {/* Top */}
        <path d="M50 70 Q70 62 90 70 L85 95 Q70 102 55 95 Z" {...common}/>
        <path d="M65 72 Q70 74 75 72" {...stitch}/>
        <path d="M50 70 Q30 55 25 38" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M90 70 Q110 55 115 38" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M55 95 Q40 100 30 108" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M85 95 Q100 100 110 108" fill="none" stroke={fg} strokeWidth="0.8"/>
        {/* Bottom */}
        <path d="M45 140 Q70 135 95 140 L88 175 Q70 182 52 175 Z" {...common}/>
        <path d="M45 140 Q30 135 20 138" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M95 140 Q110 135 120 138" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M52 175 Q70 172 88 175" {...stitch}/>
      </g>
    ),

    // Bikini — cortininha
    "biquini-cortina": (
      <g>
        <path d="M45 68 Q70 60 95 68 L92 105 Q70 112 48 105 Z" {...common}/>
        <path d="M45 68 L50 55 M55 63 L60 48 M70 62 L70 45 M80 63 L85 48 M95 68 L90 55" fill="none" stroke={fg} strokeWidth="0.6"/>
        <path d="M55 72 Q70 75 85 72" {...stitch}/>
        {/* Bottom brasileirinha */}
        <path d="M48 145 Q70 140 92 145 L85 180 Q70 185 55 180 Z" {...common}/>
        <path d="M48 145 Q40 143 32 146" fill="none" stroke={fg} strokeWidth="0.7"/>
        <path d="M92 145 Q100 143 108 146" fill="none" stroke={fg} strokeWidth="0.7"/>
      </g>
    ),

    // Bikini — hot pants (high-waist)
    "biquini-hotpants": (
      <g>
        <path d="M48 65 Q70 58 92 65 L88 98 Q70 105 52 98 Z" {...common}/>
        <circle cx="60" cy="78" r="1.2" fill={fg}/>
        <circle cx="80" cy="78" r="1.2" fill={fg}/>
        <path d="M48 65 L28 35 M92 65 L112 35" fill="none" stroke={fg} strokeWidth="0.8"/>
        {/* Hot pants */}
        <path d="M42 135 L98 135 L96 185 L82 188 L78 155 L62 155 L58 188 L44 185 Z" {...common}/>
        <path d="M42 135 Q70 130 98 135" {...stitch}/>
      </g>
    ),

    // One-piece maiô
    "maio": (
      <g>
        <path d="M48 58 Q70 48 92 58 L88 95 Q85 115 82 135 L78 170 Q70 180 62 170 L58 135 Q55 115 52 95 Z" {...common}/>
        <path d="M48 58 Q35 40 30 25" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M92 58 Q105 40 110 25" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M60 62 Q70 70 80 62" {...stitch}/>
        <path d="M55 110 Q70 115 85 110" {...stitch}/>
      </g>
    ),

    // Sports top (cardio)
    "fit-top": (
      <g>
        <path d="M40 55 L100 55 L98 115 L42 115 Z" {...common}/>
        <path d="M40 55 L30 40 M100 55 L110 40" fill="none" stroke={fg} strokeWidth="0.8"/>
        {/* X-back straps */}
        <path d="M55 55 L80 42 M85 55 L60 42" fill="none" stroke={fg} strokeWidth="0.8"/>
        <circle cx="57" cy="54" r="2" fill="none" stroke={fg} strokeWidth="0.6"/>
        <circle cx="83" cy="54" r="2" fill="none" stroke={fg} strokeWidth="0.6"/>
        <path d="M42 110 Q70 114 98 110" {...stitch}/>
        <path d="M50 70 L90 70" {...stitch}/>
      </g>
    ),

    // Legging
    "legging": (
      <g>
        <path d="M42 35 L98 35 L100 55 L95 175 L80 180 L75 80 L65 80 L60 180 L45 175 L40 55 Z" {...common}/>
        <path d="M42 35 Q70 30 98 35" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M42 50 L98 50" {...stitch}/>
        <path d="M72 80 L72 175" {...stitch}/>
        <path d="M42 55 L40 60 M98 55 L100 60" fill="none" stroke={fg} strokeWidth="0.6"/>
      </g>
    ),

    // Bike shorts
    "short": (
      <g>
        <path d="M40 55 L100 55 L98 115 L82 120 L78 95 L62 95 L58 120 L42 115 Z" {...common}/>
        <path d="M40 55 Q70 48 100 55" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M40 70 L100 70" {...stitch}/>
        <path d="M70 95 L70 120" {...stitch}/>
      </g>
    ),

    // Beach cover-up (crochê saída)
    "saida": (
      <g>
        <path d="M35 45 L105 45 L110 170 L30 170 Z" {...common}/>
        <path d="M35 45 L15 30 M105 45 L125 30" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M55 45 Q70 52 85 45" fill="none" stroke={fg} strokeWidth="0.8"/>
        {/* Crochet texture */}
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d={`M35 ${60 + i*14} L105 ${60 + i*14}`} {...stitch}/>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={i} d={`M${45 + i*10} 50 L${45 + i*10} 168`} {...stitch}/>
        ))}
        <path d="M30 170 Q45 175 60 170 Q75 175 90 170 Q105 175 110 170" fill="none" stroke={fg} strokeWidth="0.7"/>
      </g>
    ),

    // Dress
    "vestido": (
      <g>
        <path d="M40 40 L100 40 L105 65 L115 175 L25 175 L35 65 Z" {...common}/>
        <path d="M40 40 L28 25 M100 40 L112 25" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M55 40 Q70 48 85 40" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M35 65 Q70 72 105 65" {...stitch}/>
        <path d="M30 120 Q70 128 110 120" {...stitch}/>
      </g>
    ),

    // Pareô pants
    "calca": (
      <g>
        <path d="M38 40 L102 40 L105 60 L95 175 L78 178 L72 85 L68 85 L62 178 L45 175 L35 60 Z" {...common}/>
        <path d="M38 40 Q70 34 102 40" fill="none" stroke={fg} strokeWidth="0.8"/>
        <path d="M38 55 L102 55" {...stitch}/>
        <path d="M70 85 L70 175" {...stitch}/>
        <circle cx="70" cy="47" r="1.5" fill={fg}/>
      </g>
    ),

    // Straw hat
    "chapeu": (
      <g>
        <ellipse cx="70" cy="120" rx="55" ry="14" {...common}/>
        <path d="M45 118 Q48 85 70 80 Q92 85 95 118" {...common}/>
        <path d="M50 115 Q70 108 90 115" fill="none" stroke={fg} strokeWidth="0.7"/>
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d={`M${18 + i*9} 120 L${22 + i*9} 128`} {...stitch}/>
        ))}
      </g>
    ),

    // Canga / wrap
    "canga": (
      <g>
        <path d="M25 30 L115 35 L120 170 L20 175 Z" {...common}/>
        <path d="M30 50 L110 55 M35 80 L115 82 M30 110 L112 115 M35 140 L110 145" {...stitch}/>
        <path d="M25 30 Q70 40 115 35" fill="none" stroke={fg} strokeWidth="0.7"/>
        <path d="M20 175 L15 182 M120 170 L125 177" fill="none" stroke={fg} strokeWidth="0.7"/>
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 140 210" preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: size, height: "auto", ...style }}
      xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="70" cy="200" rx="40" ry="3" fill={shadow}/>
      {garments[type] || garments["biquini-triangle"]}
    </svg>
  );
}

// Map product category/id → garment type
function garmentTypeFor(p) {
  const map = {
    "SOL-001": "biquini-cortina",
    "SOL-002": "biquini-triangle",
    "SOL-003": "biquini-hotpants",
    "SOL-004": "maio",
    "MOV-011": "fit-top",
    "MOV-012": "legging",
    "MOV-013": "short",
    "OFF-021": "saida",
    "OFF-022": "vestido",
    "OFF-023": "calca",
    "ACC-031": "chapeu",
    "ACC-032": "canga",
  };
  if (p?.id && map[p.id]) return map[p.id];
  if (p?.category === "biquini") return "biquini-triangle";
  if (p?.category === "fitness") return "fit-top";
  if (p?.category === "acessorios") return "chapeu";
  if (p?.category === "praia") return "maio";
  if (p?.category === "roupas") return "vestido";
  return "biquini-triangle";
}

Object.assign(window, { Garment, garmentTypeFor });
