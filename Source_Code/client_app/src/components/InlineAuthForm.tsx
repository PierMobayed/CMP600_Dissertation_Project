import { useState } from "react";

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
};

export function InlineAuthForm({
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
}: Props) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="inline-auth">
      <p className="book-panel-lead">
        Sign in or create an account to pay and confirm your booking. Demo: <strong>client1</strong> /{" "}
        <strong>demo</strong>
      </p>
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
            Create account and continue
          </button>
        </form>
      )}
    </div>
  );
}
