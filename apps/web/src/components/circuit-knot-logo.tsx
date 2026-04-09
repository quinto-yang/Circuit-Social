import React from "react";

export function CircuitKnotLogo({
  className,
  title = "Circuit Social"
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ck_grad" x1="18" y1="18" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#19C37D" />
          <stop offset="0.55" stopColor="#1FD4A2" />
          <stop offset="1" stopColor="#56B6FF" />
        </linearGradient>

        {/* Punch out a subtle shield-shaped negative space in center */}
        <mask id="ck_mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <path
            d="M50 33
               C41 33 35 37 35 42
               V55
               C35 63 41 70 50 74
               C59 70 65 63 65 55
               V42
               C65 37 59 33 50 33Z"
            fill="black"
          />
        </mask>
      </defs>

      {/* Main knot (two interlocking rounded loops) */}
      <g mask="url(#ck_mask)">
        <path
          d="M28 55
             C28 43 38 35 50 35
             C62 35 72 43 72 55
             C72 67 62 75 50 75
             C38 75 28 67 28 55Z"
          fill="none"
          stroke="url(#ck_grad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <path
          d="M34 50
             C34 39 42 30 52 30
             C62 30 70 39 70 50
             C70 61 62 70 52 70
             C42 70 34 61 34 50Z"
          fill="none"
          stroke="url(#ck_grad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      </g>

      {/* Nodes */}
      <g>
        <circle cx="36" cy="38" r="4.8" fill="rgba(255,255,255,0.96)" stroke="rgba(17,19,26,0.10)" />
        <circle cx="67" cy="40" r="4.8" fill="rgba(255,255,255,0.96)" stroke="rgba(17,19,26,0.10)" />
        <circle cx="52" cy="74" r="4.8" fill="rgba(255,255,255,0.96)" stroke="rgba(17,19,26,0.10)" />
      </g>
    </svg>
  );
}

