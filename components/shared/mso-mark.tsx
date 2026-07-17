// MSO brand mark — the graphite "terminal window" squircle + phosphor-mint M
// monogram. Fixed colors (an app icon never themes). Used for the login + About
// identity tiles and anywhere the brand glyph is shown in-app.
export function MsoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="MSO">
      <defs>
        <linearGradient id="mso-mk-bg" x1="256" y1="16" x2="256" y2="496" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2c2c31" />
          <stop offset="1" stopColor="#141416" />
        </linearGradient>
        <linearGradient id="mso-mk-glyph" x1="150" y1="168" x2="362" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="116" fill="url(#mso-mk-bg)" />
      <rect x="17" y="17" width="478" height="478" rx="115" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="2" />
      <path d="M150 360 L150 168 L256 296 L362 168 L362 360" fill="none" stroke="url(#mso-mk-glyph)" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
