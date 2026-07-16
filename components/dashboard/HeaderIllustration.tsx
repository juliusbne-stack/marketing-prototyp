/**
 * Decorative target + wave motif for the dashboard hero.
 * Purely visual — pointer-events none, aria-hidden on the host.
 *
 * Layout within viewBox:
 * - target in the upper area (profile lives in the global banner)
 * - waves anchored to bottom edge
 */
export function HeaderIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        <linearGradient
          id="hw-back"
          x1="0"
          y1="100"
          x2="520"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#D8F4F2" stopOpacity="0" />
          <stop offset="16%" stopColor="#C5EEEA" stopOpacity="0.2" />
          <stop offset="52%" stopColor="#A8E4EC" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#D0F1F6" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient
          id="hw-mid"
          x1="20"
          y1="120"
          x2="520"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E2F8F5" stopOpacity="0" />
          <stop offset="20%" stopColor="#B4EDE6" stopOpacity="0.3" />
          <stop offset="58%" stopColor="#8FDCE8" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#C4F0F6" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient
          id="hw-front"
          x1="40"
          y1="140"
          x2="520"
          y2="115"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ECFBF8" stopOpacity="0" />
          <stop offset="26%" stopColor="#9EE9E0" stopOpacity="0.36" />
          <stop offset="66%" stopColor="#6FCDDD" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#B5EAF2" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="hw-face" cx="44%" cy="36%" r="64%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="48%" stopColor="#EAF8FB" />
          <stop offset="100%" stopColor="#A9DFEC" />
        </radialGradient>
        <radialGradient id="hw-bull" cx="40%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#2FA3B4" />
          <stop offset="100%" stopColor="#0D6572" />
        </radialGradient>
        <linearGradient id="hw-arrow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A4A72" />
          <stop offset="100%" stopColor="#2B2445" />
        </linearGradient>
        <filter id="hw-shadow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" />
          <feOffset dx="1" dy="10" result="o" />
          <feFlood floodColor="#7BB8C4" floodOpacity="0.3" />
          <feComposite in2="o" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id="hw-arrow-shadow"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" />
          <feOffset dx="1" dy="1.5" />
          <feFlood floodColor="#1A1430" floodOpacity="0.2" />
          <feComposite in2="SourceAlpha" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="88" cy="92" r="5" fill="#A8E4EC" fillOpacity="0.32" />
      <circle cx="138" cy="118" r="3.2" fill="#8DD5C8" fillOpacity="0.3" />
      <circle cx="200" cy="78" r="4" fill="#B5EAF2" fillOpacity="0.36" />
      <circle cx="478" cy="138" r="4.5" fill="#9FE0EA" fillOpacity="0.26" />
      <circle cx="62" cy="128" r="2.5" fill="#C5EEF2" fillOpacity="0.4" />

      {/* Waves — bottom-anchored, wide S-curves */}
      <path
        d="M0 108 C75 86, 135 126, 215 96 C285 70, 345 116, 415 90 C465 72, 498 86, 520 80 L520 168 L0 168 Z"
        fill="url(#hw-back)"
      />
      <path
        d="M0 122 C85 96, 150 138, 235 108 C310 82, 370 128, 445 102 C485 86, 508 100, 520 96 L520 168 L0 168 Z"
        fill="url(#hw-mid)"
      />
      <path
        d="M0 138 C95 110, 165 148, 255 122 C330 100, 390 138, 460 118 C492 106, 510 118, 520 116 L520 168 L0 168 Z"
        fill="url(#hw-front)"
      />

      {/* Target — above wave body */}
      <g
        transform="translate(388 64) rotate(-15) skewX(-7)"
        filter="url(#hw-shadow)"
      >
        <ellipse
          cx="3"
          cy="12"
          rx="70"
          ry="64"
          fill="#9FD8E4"
          fillOpacity="0.26"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="64"
          ry="59"
          fill="url(#hw-face)"
          stroke="#C8EDF4"
          strokeWidth="2"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="51"
          ry="46"
          fill="none"
          stroke="#78C5D4"
          strokeWidth="9.5"
          strokeOpacity="0.5"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="35"
          ry="32"
          fill="none"
          stroke="#A6DCE8"
          strokeWidth="8.5"
          strokeOpacity="0.72"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="21"
          ry="19"
          fill="#D9F4F9"
          stroke="#86CEDC"
          strokeWidth="3"
        />
        <ellipse cx="0" cy="0" rx="11" ry="10" fill="url(#hw-bull)" />
        <ellipse
          cx="-2"
          cy="-2.8"
          rx="3.8"
          ry="3.2"
          fill="#FFFFFF"
          fillOpacity="0.5"
        />
      </g>

      {/*
        Arrow tip anchored at the same origin as the bullseye (388, 64).
        Local +Y points into the target; shaft/fletching extend along -Y
        and rotate(38) places them top-right of the center.
      */}
      <g transform="translate(388 64) rotate(38)" filter="url(#hw-arrow-shadow)">
        <rect
          x="-2.8"
          y="-70"
          width="5.6"
          height="58"
          rx="2.4"
          fill="url(#hw-arrow)"
        />
        <path d="M0 0 L-7.2 -18 L7.2 -18 Z" fill="#2B2445" />
        <path d="M-2.8 -68 L-13 -80 L-2.8 -55 Z" fill="#3F345C" />
        <path d="M2.8 -68 L13 -80 L2.8 -55 Z" fill="#3F345C" />
        <path d="M-2.8 -60 L-11 -70 L-2.8 -49 Z" fill="#54486F" />
        <path d="M2.8 -60 L11 -70 L2.8 -49 Z" fill="#54486F" />
        <rect
          x="-1.1"
          y="-62"
          width="1.5"
          height="46"
          rx="0.75"
          fill="#FFFFFF"
          fillOpacity="0.2"
        />
      </g>
    </svg>
  );
}
