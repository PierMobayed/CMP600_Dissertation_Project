import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "../ThemeToggle";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  user: string;
  pass: string;
  displayName: string;
  onUserChange: (v: string) => void;
  onPassChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  error: string | null;
  onLogin: (e: React.FormEvent) => void;
  onRegister: (e: React.FormEvent) => void;
  onBackHome?: () => void;
  onStartBook?: () => void;
};

export function AuthScreen({
  mode,
  onModeChange,
  user,
  pass,
  displayName,
  onUserChange,
  onPassChange,
  onDisplayNameChange,
  error,
  onLogin,
  onRegister,
  onBackHome,
  onStartBook,
}: Props) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="client-auth-page client-auth-page--signin">
      <div className="client-auth-bg" aria-hidden />
      <div className="client-auth-signin-accent" aria-hidden />
      <header className="client-auth-top">
        <div className="client-auth-top-left">
          {onBackHome && (
            <button type="button" className="client-btn client-btn--ghost client-back-btn" onClick={onBackHome}>
              ← Home
            </button>
          )}
          <span className="client-brand">
            <BrandMark />
            Door2Door
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="client-auth-signin-main">
        <section className="client-auth-signin-intro">
          <p className="client-auth-eyebrow">London door-to-door logistics</p>
          <h1>Sign in to your Door2Door account</h1>
          <p>
            Send and track parcels with collection from your door — next-day delivery on our simulated
            London network (CMP600 prototype).
          </p>
          <ul className="client-auth-signin-features">
            <li>Send · door-to-door</li>
            <li>Track · live map</li>
            <li>Next day · from £14.99</li>
          </ul>
          {onStartBook && (
            <p className="client-auth-alt">
              Prefer to book first?{" "}
              <button type="button" className="client-link-btn" onClick={onStartBook}>
                Start parcel booking →
              </button>
            </p>
          )}
        </section>

        <div className="client-auth-signin-card">
          <div className="client-auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "client-auth-tab client-auth-tab--active" : "client-auth-tab"}
              onClick={() => onModeChange("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "client-auth-tab client-auth-tab--active" : "client-auth-tab"}
              onClick={() => onModeChange("register")}
            >
              Register
            </button>
          </div>

          {mode === "login" ? (
            <form className="client-auth-form" onSubmit={onLogin}>
              <label>
                Username
                <input
                  value={user}
                  onChange={(e) => onUserChange(e.target.value)}
                  placeholder="client1"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <div className="client-input-row">
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => onPassChange(e.target.value)}
                    placeholder="demo"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="client-input-addon" onClick={() => setShowPass((v) => !v)}>
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {error && <p className="client-alert client-alert--error">{error}</p>}
              <button type="submit" className="client-btn client-btn--primary client-btn--block">
                Log in and continue
              </button>
              <p className="client-auth-signin-demo">
                <span>Demo</span> client1 / demo
              </p>
            </form>
          ) : (
            <form className="client-auth-form" onSubmit={onRegister}>
              <label>
                Display name <span className="client-label-opt">(optional)</span>
                <input
                  value={displayName}
                  onChange={(e) => onDisplayNameChange(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
              <label>
                Username
                <input
                  value={user}
                  onChange={(e) => onUserChange(e.target.value)}
                  placeholder="Min. 2 characters"
                  autoComplete="username"
                  required
                  minLength={2}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => onPassChange(e.target.value)}
                  placeholder="Min. 3 characters"
                  autoComplete="new-password"
                  required
                  minLength={3}
                />
              </label>
              {error && <p className="client-alert client-alert--error">{error}</p>}
              <button type="submit" className="client-btn client-btn--primary client-btn--block">
                Create your account
              </button>
              <p className="client-auth-signin-demo client-auth-signin-demo--muted">
                Simulated registration for the dissertation prototype only.
              </p>
            </form>
          )}
        </div>
      </main>

      <p className="app-footer-note">CMP600 dissertation prototype · Door2Door · simulated data</p>
    </div>
  );
}
