/** Door2Door nested-frame mark (matches favicon.svg). */
export function BrandMark() {
  return (
    <span className="app-landing-mark" aria-hidden>
      <svg viewBox="0 0 32 32" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="4" fill="currentColor" />
        <rect x="8" y="8" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.75" />
        <rect x="12.5" y="12.5" width="7" height="7" fill="currentColor" />
      </svg>
    </span>
  );
}
