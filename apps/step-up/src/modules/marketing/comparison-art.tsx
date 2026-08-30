/** Decorative SVGs for the comparison section — not interactive. */

import styles from "./comparison.module.scss";

interface GearGeometry {
  cx: number;
  cy: number;
  teeth: number;
  /** Pitch radius — where this gear's teeth mesh with a neighbor's. */
  pitch: number;
  /** How far teeth extend above and below the pitch radius. */
  tooth: number;
  /** Angle (rad) of the first tooth's center, used to align meshing. */
  rotate: number;
}

function gearPath({ cx, cy, teeth, pitch, tooth, rotate }: GearGeometry) {
  const outer = pitch + tooth;
  const root = pitch - tooth;
  const step = (Math.PI * 2) / teeth;
  const at = (angle: number, radius: number) =>
    `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;

  const parts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = rotate + i * step;
    // Teeth narrower than the gaps so meshed gears clear while rotating.
    parts.push(
      `${i === 0 ? "M" : "L"} ${at(a - step * 0.2, root)}`,
      `L ${at(a - step * 0.1, outer)}`,
      `L ${at(a + step * 0.1, outer)}`,
      `L ${at(a + step * 0.2, root)}`,
    );
  }
  return `${parts.join(" ")} Z`;
}

function Gear({
  hole,
  className,
  ...geometry
}: GearGeometry & { hole: number; className?: string | undefined }) {
  return (
    <g
      className={className}
      style={{ transformOrigin: `${geometry.cx}px ${geometry.cy}px` }}
      fill="none"
      stroke="#c45f2e"
      strokeWidth="1.8"
    >
      <path d={gearPath(geometry)} strokeLinejoin="round" />
      <circle cx={geometry.cx} cy={geometry.cy} r={hole} />
    </g>
  );
}

export function FolderAccent() {
  return (
    <svg viewBox="0 0 56 48" fill="none" aria-hidden>
      <title>Folder of loose papers</title>
      <rect x="18" y="6" width="22" height="28" rx="2" fill="#f3ece0" />
      <rect x="22" y="10" width="22" height="28" rx="2" fill="#e7ddd0" />
      <path
        d="M6 16 H22 L26 20 H50 A4 4 0 0 1 54 24 V42 A4 4 0 0 1 50 46 H6 A4 4 0 0 1 2 42 V20 A4 4 0 0 1 6 16 Z"
        fill="#d9a066"
      />
      <path d="M6 16 H20 L24 20 H6 Z" fill="#c48a4a" />
    </svg>
  );
}

export function GearsAccent() {
  // Same module (pitch / teeth ratio) on both gears so they truly mesh:
  // 8 teeth @ pitch 11.5 with 6 teeth @ pitch 8.625. The rotation keyframes
  // (+45deg / -60deg per cycle) keep surface speeds equal at the pitch circles.
  const mesh = Math.atan2(10.5, 18.5);
  const cx = 16.5 + 21.8 * Math.cos(mesh);
  const cy = 17.5 + 21.8 * Math.sin(mesh);
  return (
    <svg viewBox="0 0 52 44" fill="none" aria-hidden>
      <title>Automated workflow gears</title>
      <Gear
        className={styles.gearLarge}
        cx={16.5}
        cy={17.5}
        teeth={8}
        pitch={11.5}
        tooth={2.6}
        hole={4.2}
        rotate={mesh}
      />
      <Gear
        className={styles.gearSmall}
        cx={cx}
        cy={cy}
        teeth={6}
        pitch={8.625}
        tooth={2.6}
        hole={3.1}
        rotate={mesh + Math.PI - Math.PI / 6}
      />
    </svg>
  );
}

export function DatabaseAccent() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <title>Centralized student database</title>
      <ellipse
        cx="22"
        cy="12"
        rx="14"
        ry="5"
        fill="#fff"
        stroke="#2b2927"
        strokeWidth="2.5"
      />
      <path
        d="M 8,12 L 8,20 C 8,22.8 14.3,25 22,25 C 29.7,25 36,22.8 36,20 L 36,12"
        stroke="#2b2927"
        strokeWidth="2.5"
      />
      <path
        d="M 8,20 L 8,28 C 8,30.8 14.3,33 22,33 C 29.7,33 36,30.8 36,28 L 36,20"
        stroke="#2b2927"
        strokeWidth="2.5"
      />
      <circle
        cx="34"
        cy="32"
        r="9"
        fill="#ff7a45"
        stroke="#2b2927"
        strokeWidth="2.5"
      />
      <polyline
        points="29,32 33,35 39,28"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>Sparkle</title>
      <path
        d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z"
        fill="#f8f4ec"
        opacity="0.85"
      />
    </svg>
  );
}

export function BackdropSwirls() {
  return (
    <svg
      viewBox="0 0 1200 640"
      fill="none"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <title>Background flourishes</title>
      <path
        d="M-40 420 C180 280, 260 520, 520 380 S 860 220, 1240 360"
        stroke="#c45f2e"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <path
        d="M-20 520 C220 400, 340 620, 640 480 S 980 340, 1280 500"
        stroke="#c45f2e"
        strokeOpacity="0.16"
        strokeWidth="1.25"
      />
    </svg>
  );
}
