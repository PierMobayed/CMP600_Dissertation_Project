import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "../ThemeToggle";

type Props = {
  user: string;
  pass: string;
  onUserChange: (v: string) => void;
  onPassChange: (v: string) => void;
  error: string | null;
  onLogin: (e: React.FormEvent) => void;
  onBackHome?: () => void;
};

export function AuthScreen({
  user,
  pass,
  onUserChange,
  onPassChange,
  error,
  onLogin,
  onBackHome,
}: Props) {
  return (
    <div className="app-landing app-landing--dashboard app-landing--signin">
      <div className="app-landing-bg" aria-hidden />
      <div className="app-landing-signin-accent" aria-hidden />
      <header className="app-landing-top">
        <div className="app-landing-top-left">
          {onBackHome && (
            <button type="button" className="app-landing-back" onClick={onBackHome}>
              ← Home
            </button>
          )}
          <span className="app-landing-brand">
            <BrandMark />
            Door2Door Ops
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="app-landing-signin-main">
        <section className="app-landing-signin-intro">
          <p className="app-landing-eyebrow">Office dispatcher</p>
          <h1>Sign in to the operations console</h1>
          <p>
            Live map, KPI panel, dispatch tools, and Viva simulation controls — demo data only.
          </p>
          <ul className="app-landing-signin-features">
            <li>Map + KPI refresh</li>
            <li>Assign drivers</li>
            <li>GPS simulation</li>
          </ul>
        </section>

        <form className="app-landing-signin-card" onSubmit={onLogin}>
          <h2>Office account</h2>
          <label>
            Username
            <input
              value={user}
              onChange={(e) => onUserChange(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={pass}
              onChange={(e) => onPassChange(e.target.value)}
              placeholder="demo"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-error app-landing-signin-error">{error}</p>}
          <button type="submit" className="app-landing-btn app-landing-btn--primary app-landing-btn--block">
            Continue to dashboard
          </button>
          <p className="app-landing-signin-demo">
            <span>Demo</span> admin / demo
          </p>
        </form>
      </main>

      <p className="app-footer-note">CMP600 dissertation prototype · Door2Door · simulated data</p>
    </div>
  );
}
