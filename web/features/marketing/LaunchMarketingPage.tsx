import { Alert, Card, StatusBadge } from "@/components/design-system";
import {
  AFFILIATION_COPY,
  EXAMPLE_RESULT,
  FAQ_ITEMS,
  HOW_IT_WORKS_STEPS,
  LAUNCH_HERO,
  LAUNCH_SCREENSHOT_ASSETS,
  PRIVACY_SUMMARY_POINTS,
  REQUIRED_LAUNCH_MESSAGES,
  SAFE_SHARE_CARD,
  SUPPORTED_GAME_STATEMENT
} from "@/lib/marketing/launch-messaging";

export function LaunchMarketingPage() {
  return (
    <main className="marketing-page" id="main-content">
      <section className="marketing-hero" aria-labelledby="launch-title">
        <div className="marketing-hero-copy">
          <p className="eyebrow">{LAUNCH_HERO.eyebrow}</p>
          <h1 id="launch-title">{LAUNCH_HERO.title}</h1>
          <p className="lede">{LAUNCH_HERO.lede}</p>
          <p className="supporting">{LAUNCH_HERO.support}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/">
              Start web MVP
            </a>
            <a className="button button-secondary" href="/support">
              Support
            </a>
          </div>
        </div>
        <Card className="launch-card" tone="info">
          <div className="status-row">
            <h2>Launch promise</h2>
            <StatusBadge tone="success">honest copy</StatusBadge>
          </div>
          <ul className="message-list">
            {REQUIRED_LAUNCH_MESSAGES.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <Alert title="Catalog gate" tone="warning">
            {SUPPORTED_GAME_STATEMENT.versionStatus}
          </Alert>
        </Card>
      </section>

      <section className="screen-stack" aria-labelledby="how-title">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">From browser capture to a manual build guide</h2>
        </div>
        <div className="card-grid">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <Card key={step.title}>
              <StatusBadge tone="info">Step {index + 1}</StatusBadge>
              <h3>{step.title}</h3>
              <p className="supporting">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="result-detail-grid" aria-labelledby="supported-title">
        <Card tone="info">
          <p className="eyebrow">Supported game/version statement</p>
          <h2 id="supported-title">{SUPPORTED_GAME_STATEMENT.game}</h2>
          <dl className="metadata-list">
            <div>
              <span>Mode</span>
              <strong>{SUPPORTED_GAME_STATEMENT.mode}</strong>
            </div>
            <div>
              <span>Production catalog</span>
              <strong>{SUPPORTED_GAME_STATEMENT.versionStatus}</strong>
            </div>
          </dl>
          <p className="supporting">{SUPPORTED_GAME_STATEMENT.platformStatus}</p>
          <p className="supporting">{SUPPORTED_GAME_STATEMENT.limitation}</p>
        </Card>
        <Card tone="warning">
          <p className="eyebrow">Example result</p>
          <h2>{EXAMPLE_RESULT.title}</h2>
          <ul className="message-list">
            {EXAMPLE_RESULT.slots.map((slot) => (
              <li key={slot}>{slot}</li>
            ))}
          </ul>
          <Alert title={EXAMPLE_RESULT.status} tone="warning">
            {EXAMPLE_RESULT.explanation}
          </Alert>
        </Card>
      </section>

      <section className="result-detail-grid" aria-labelledby="privacy-title">
        <Card>
          <p className="eyebrow">Privacy summary</p>
          <h2 id="privacy-title">Local-first by default</h2>
          <ul className="message-list">
            {PRIVACY_SUMMARY_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Card>
        <Card className="share-card-preview" tone="success">
          <p className="eyebrow">Safe share card</p>
          <h2>{SAFE_SHARE_CARD.title}</h2>
          <p>{SAFE_SHARE_CARD.headline}</p>
          <p className="supporting">{SAFE_SHARE_CARD.body}</p>
          <p className="supporting">{SAFE_SHARE_CARD.footer}</p>
        </Card>
      </section>

      <section className="screen-stack" aria-labelledby="assets-title">
        <div className="section-heading">
          <p className="eyebrow">Launch screenshots</p>
          <h2 id="assets-title">Safe visual assets without face imagery</h2>
        </div>
        <div className="marketing-asset-grid">
          {LAUNCH_SCREENSHOT_ASSETS.map((asset) => (
            <Card key={asset.path}>
              <img className="marketing-asset" src={asset.path} alt={asset.alt} />
              <h3>{asset.title}</h3>
              <p className="supporting">{asset.alt}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="screen-stack" aria-labelledby="faq-title">
        <div className="section-heading">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title">Straight answers before launch</h2>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
        <Alert title="Independent companion application" tone="info">
          {AFFILIATION_COPY.independent}
        </Alert>
      </section>
    </main>
  );
}
