// MSO brand mark — the azure→violet "folder-terminal" app icon: a window/folder
// panel (raised-left tab, three window dots, and a `> _ >` shell prompt). Fixed
// colors (an app icon never themes). Used for the login + About identity tiles
// and anywhere the brand glyph is shown in-app. Kept in sync with app/icon.svg
// (the favicon) + apple-icon/opengraph-image.
export function MsoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="MSO">
      <defs>
        <linearGradient id="mso-mark-bg" x1="48" y1="40" x2="466" y2="474" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a7cf8" />
          <stop offset="1" stopColor="#6a54f8" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="116" fill="url(#mso-mark-bg)" />
      <g fill="none" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
        <path d="M138 150 L238 150 L292 179 L374 179 Q402 179 402 207 L402 370 Q402 398 374 398 L138 398 Q110 398 110 370 L110 178 Q110 150 138 150 Z" />
        <path d="M166 272 L204 302 L166 332" />
        <path d="M226 348 L286 348" />
        <path d="M320 272 L358 302 L320 332" />
      </g>
      <g fill="#ffffff">
        <circle cx="150" cy="188" r="11" />
        <circle cx="186" cy="188" r="11" />
        <circle cx="222" cy="188" r="11" />
      </g>
    </svg>
  );
}
