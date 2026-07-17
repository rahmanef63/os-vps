"use client";

// Last-resort boundary for the whole cockpit. The OS is one client shell under a
// single catch-all route, so an unhandled render error anywhere would otherwise
// white-screen with no recovery. global-error replaces the root layout, so it
// must ship its own <html>/<body>. Inline styles only — the app stylesheet may
// be exactly what failed to load.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0e0f13",
          color: "#e7e8ec",
        }}
      >
        <div style={{ maxWidth: 360, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Something broke</h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 20px", lineHeight: 1.5 }}>
            Manef Shell OS hit an unexpected error. Reloading usually clears it; your
            files and session are untouched.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "1px solid #3a3f4b",
              borderRadius: 10,
              background: "#1b1d24",
              color: "#e7e8ec",
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
