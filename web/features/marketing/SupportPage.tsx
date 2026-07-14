import { Alert, Card } from "@/components/design-system";
import { AFFILIATION_COPY, FAQ_ITEMS, SUPPORT_PAGE_CONTENT, SUPPORTED_GAME_STATEMENT } from "@/lib/marketing/launch-messaging";

export function SupportPage() {
  return (
    <main className="marketing-page" id="main-content">
      <section className="screen-stack narrow" aria-labelledby="support-title">
        <div className="section-heading">
          <p className="eyebrow">Support</p>
          <h1 id="support-title">{SUPPORT_PAGE_CONTENT.title}</h1>
          <p className="lede">{SUPPORT_PAGE_CONTENT.responseScope}</p>
        </div>
        <Alert title="Current catalog status" tone="warning">
          {SUPPORTED_GAME_STATEMENT.versionStatus}
        </Alert>
      </section>

      <section className="result-detail-grid" aria-label="Support guidance">
        <Card>
          <h2>Before contacting support</h2>
          <ul className="message-list">
            {SUPPORT_PAGE_CONTENT.beforeContacting.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2>Refunds, restoration, and privacy</h2>
          <p className="supporting">{SUPPORT_PAGE_CONTENT.refundGuidance}</p>
          <p className="supporting">{SUPPORT_PAGE_CONTENT.privacyGuidance}</p>
          <p className="supporting">{AFFILIATION_COPY.short}</p>
        </Card>
      </section>

      <section className="screen-stack" aria-labelledby="support-faq-title">
        <div className="section-heading">
          <p className="eyebrow">FAQ</p>
          <h2 id="support-faq-title">Common support questions</h2>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
