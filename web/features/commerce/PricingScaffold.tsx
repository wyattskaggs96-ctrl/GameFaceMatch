"use client";

import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { PRICING_OPTIONS, canMakePaidRecommendationClaims, createCheckoutUnavailableCopy, getSelectedCollegeFootball27Offer } from "@/lib/payments/pricing";

export function PricingScaffold({ catalogIsEmpty }: { catalogIsEmpty: boolean }) {
  const paidClaims = canMakePaidRecommendationClaims(catalogIsEmpty);
  const selectedOffer = getSelectedCollegeFootball27Offer();
  return (
    <section className="screen-stack" aria-labelledby="pricing-title">
      <ScreenHeader eyebrow="Purchase readiness" title="College Football 27 one-game purchase" id="pricing-title">
        <p>
          The selected paid model is a low-cost one-game purchase for College Football 27. Checkout remains safely disabled until the verified catalog,
          provider account setup, receipt handling, purchase restoration, refund support, and legal review are complete.
        </p>
      </ScreenHeader>
      <Alert title="Transparent selected offer" tone="info">
        {selectedOffer
          ? `${selectedOffer.product.name}: ${selectedOffer.price.displayAmount} ${selectedOffer.price.currency}, ${selectedOffer.product.purchaseType} purchase.`
          : "The selected offer is not configured."}
      </Alert>
      {!paidClaims.allowed ? (
        <Alert title="Paid recommendation claims disabled" tone="warning" role="alert">
          {paidClaims.reason} The app may preview capture readiness and catalog status, but it must not show fake College Football 27 settings or charge for
          recommendations that cannot be delivered.
        </Alert>
      ) : null}
      {selectedOffer ? (
        <Card className="action-card" tone="info">
          <div className="status-row">
            <h2>{selectedOffer.product.name}</h2>
            <StatusBadge tone="success">selected offer</StatusBadge>
          </div>
          <p>{selectedOffer.product.description}</p>
          <dl className="metadata-list">
            <div>
              <span>Price</span>
              <strong>{selectedOffer.price.displayAmount}</strong>
            </div>
            <div>
              <span>Purchase type</span>
              <strong>One game, one-time purchase</strong>
            </div>
            <div>
              <span>Checkout state</span>
              <strong>Not connected</strong>
            </div>
            <div>
              <span>Restoration</span>
              <strong>Provider required</strong>
            </div>
          </dl>
          <h3>Included when production gates pass</h3>
          <ul className="message-list">
            {selectedOffer.featureList.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <h3>Privacy commitments</h3>
          <ul className="message-list">
            {selectedOffer.privacyCommitments.map((commitment) => (
              <li key={commitment}>{commitment}</li>
            ))}
          </ul>
          <Alert title="Result preview rules" tone="info">
            {selectedOffer.resultPreview}
          </Alert>
          <Alert title="No trial or subscription terms" tone="info">
            This offer is modeled as a one-time purchase. No trial period, recurring renewal, countdown, customer quote, or pressure claim is active.
          </Alert>
          <Alert title="Checkout unavailable" tone="warning">
            {createCheckoutUnavailableCopy(selectedOffer, catalogIsEmpty)}
          </Alert>
          <div className="button-row">
            <Button disabled aria-disabled="true">
              Checkout not connected
            </Button>
            <Button disabled aria-disabled="true" variant="secondary">
              Restore purchase unavailable
            </Button>
          </div>
          <p className="supporting">{selectedOffer.supportGuidance}</p>
          <p className="supporting">{selectedOffer.restoreGuidance}</p>
        </Card>
      ) : null}
      <div className="card-grid">
        {PRICING_OPTIONS.map((option) => (
          <Card key={option.product.id} className="action-card" tone={option.recommendedForLaunch ? "info" : "neutral"}>
            <div className="status-row">
              <h2>{option.product.name}</h2>
              <StatusBadge tone={option.offerState === "futureSuite" ? "warning" : option.recommendedForLaunch ? "success" : "info"}>
                {option.offerState === "futureSuite" ? "future suite" : option.recommendedForLaunch ? "selected" : "beta"}
              </StatusBadge>
            </div>
            <p>{option.product.description}</p>
            <dl className="metadata-list">
              <div>
                <span>Price</span>
                <strong>{option.price.displayAmount}</strong>
              </div>
              <div>
                <span>Purchase type</span>
                <strong>{option.product.purchaseType}</strong>
              </div>
              <div>
                <span>Checkout</span>
                <strong>Unavailable</strong>
              </div>
            </dl>
            <ul className="message-list">
              {option.featureList.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Button disabled aria-disabled="true" variant="secondary">
              Checkout not connected
            </Button>
          </Card>
        ))}
      </div>
      <Card>
        <h2>One-game purchase versus future suite</h2>
        <p className="supporting">
          The College Football 27 pack is scoped to one game catalog. A future multi-game suite would require separate verified catalogs, entitlement rules,
          support language, and owner approval.
        </p>
      </Card>
      <Card>
        <h2>Failure handling, refunds, and support</h2>
        <p className="supporting">
          If checkout is attempted before provider setup, the safe adapter returns provider unavailable. Refund, receipt, tax, chargeback, support contact, and
          purchase restoration workflows must be finalized before paid launch.
        </p>
      </Card>
    </section>
  );
}
