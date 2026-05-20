import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "../ThemeToggle";

const JOURNEY = [
  { n: 1, title: "Collect", desc: "Where we pick up your parcel" },
  { n: 2, title: "Deliver", desc: "Door-to-door drop-off address" },
  { n: 3, title: "Service", desc: "Next-day or standard delivery" },
  { n: 4, title: "Account", desc: "Quick log in or register" },
  { n: 5, title: "Pay", desc: "Secure simulated checkout" },
] as const;

type Props = {
  onStartBook: () => void;
  onLogin: () => void;
};

export function LandingScreen({ onStartBook, onLogin }: Props) {
  return (
    <div className="client-landing">
      <div className="client-landing-bg" aria-hidden />
      <header className="client-landing-top">
        <span className="client-brand">
          <BrandMark />
          Door2Door
        </span>
        <ThemeToggle />
      </header>

      <main className="client-landing-main">
        <section className="client-landing-hero">
          <p className="client-landing-eyebrow">London door-to-door logistics</p>
          <h1>
            Send parcels from your door —
            <span className="client-landing-accent"> tracked end to end</span>
          </h1>
          <p className="client-landing-lead">
            Book collection and delivery in five simple steps. No account needed to start — sign in
            when you are ready to pay (CMP600 prototype).
          </p>
          <div className="client-landing-cta">
            <button type="button" className="client-btn client-btn--primary client-btn--lg" onClick={onStartBook}>
              Book a parcel
            </button>
            <button type="button" className="client-btn client-btn--outline client-btn--lg" onClick={onLogin}>
              Log in / Register
            </button>
          </div>
          <ul className="client-landing-pills">
            <li>From £14.99 next day</li>
            <li>Live map tracking</li>
            <li>Office assigns your driver</li>
          </ul>
        </section>

        <section className="client-landing-journey" aria-labelledby="journey-title">
          <h2 id="journey-title">How it works</h2>
          <ol className="client-landing-steps">
            {JOURNEY.map((s) => (
              <li key={s.n} className="client-landing-step-card">
                <span className="client-landing-step-num">{s.n}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="client-link-btn client-landing-start-link" onClick={onStartBook}>
            Start step 1 — Collect →
          </button>
        </section>
      </main>

      <p className="app-footer-note">CMP600 dissertation prototype · Door2Door · simulated data</p>
    </div>
  );
}
