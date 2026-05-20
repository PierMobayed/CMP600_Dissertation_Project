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
    <div className="app-landing app-landing--driver app-landing--signin">
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
            Door2Door Driver
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="app-landing-signin-main">
        <section className="app-landing-signin-intro">
          <p className="app-landing-eyebrow">Courier workspace</p>
          <h1>Sign in to your driver app</h1>
          <p>
            View your stop queue, numbered map pins, route tools, and live GPS sync to the office
            dashboard.
          </p>
          <ul className="app-landing-signin-features">
            <li>Map + list views</li>
            <li>Maps / Waze links</li>
            <li>Optimise route</li>
          </ul>
        </section>

        <form className="app-landing-signin-card" onSubmit={onLogin}>
          <h2>Driver account</h2>
          <label>
            Username
            <input
              value={user}
              onChange={(e) => onUserChange(e.target.value)}
              placeholder="driver1"
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
            Continue to driver app
          </button>
          <p className="app-landing-signin-demo">
            <span>Demo</span> driver1 / demo
          </p>
        </form>
      </main>

      <p className="app-footer-note">CMP600 dissertation prototype · Door2Door · simulated data</p>
    </div>
  );
}
