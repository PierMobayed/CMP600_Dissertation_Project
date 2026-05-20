import type { DeliveryOptionMeta } from "../api";
import { ThemeToggle } from "../ThemeToggle";
import { BookParcelFlow, type OrderDraft } from "./BookParcelFlow";
import { InlineAuthForm } from "./InlineAuthForm";

type Mode = "login" | "register";

type Props = {
  deliveryOpts: DeliveryOptionMeta[];
  busy: boolean;
  authed: boolean;
  clientId: string | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  user: string;
  pass: string;
  displayName: string;
  onUserChange: (v: string) => void;
  onPassChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  authError: string | null;
  onLogin: (e: React.FormEvent) => void;
  onRegister: (e: React.FormEvent) => void;
  onSubmit: (draft: OrderDraft, paymentRef: string) => Promise<void>;
  onBackHome: () => void;
  onOpenLogin: () => void;
};

export function PublicBookPage({
  deliveryOpts,
  busy,
  authed,
  clientId,
  mode,
  onModeChange,
  user,
  pass,
  displayName,
  onUserChange,
  onPassChange,
  onDisplayNameChange,
  authError,
  onLogin,
  onRegister,
  onSubmit,
  onBackHome,
  onOpenLogin,
}: Props) {
  return (
    <div className="client-public-book">
      <header className="client-public-book-top">
        <button type="button" className="client-btn client-btn--ghost client-back-btn" onClick={onBackHome}>
          ← Home
        </button>
        <span className="client-brand">
          <span className="client-brand-mark" aria-hidden>
            ▣
          </span>
          Door2Door
        </span>
        <div className="client-public-book-top-actions">
          <button type="button" className="client-link-btn" onClick={onOpenLogin}>
            Full login screen
          </button>
          <ThemeToggle />
        </div>
      </header>

      <section className="client-public-book-intro">
        <h1>Book a parcel</h1>
        <p>Complete all five steps — collection, delivery, service, account, and payment.</p>
      </section>

      <div className="card client-card client-public-book-card">
        <BookParcelFlow
          deliveryOpts={deliveryOpts}
          busy={busy}
          onSubmit={onSubmit}
          publicBooking
          authed={authed}
          clientId={clientId}
          accountPanel={
            authed ? (
              <div className="inline-auth inline-auth--ok">
                <p className="inline-auth-signed">
                  Signed in as <strong>{clientId ?? user}</strong>. You can continue to payment.
                </p>
              </div>
            ) : (
              <InlineAuthForm
                mode={mode}
                onModeChange={onModeChange}
                user={user}
                pass={pass}
                displayName={displayName}
                onUserChange={onUserChange}
                onPassChange={onPassChange}
                onDisplayNameChange={onDisplayNameChange}
                error={authError}
                onLogin={onLogin}
                onRegister={onRegister}
              />
            )
          }
        />
      </div>

      <p className="app-footer-note">CMP600 prototype · simulated data</p>
    </div>
  );
}
