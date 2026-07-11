"use client";

import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { PRICING_OPTIONS, canMakePaidRecommendationClaims } from "@/lib/payments/pricing";

export function PricingScaffold({ catalogIsEmpty }: { catalogIsEmpty: boolean }) {
  const paidClaims = canMakePaidRecommendationClaims(catalogIsEmpty);
  return (
    <section className="screen-stack" aria-labelledby="pricing-title">
      <ScreenHeader eyebrow="Payment readiness" title="Pricing is not connected" id="pricing-title">
        <p>
          This scaffold compares future commercial models without creating checkout sessions, collecting payment credentials, or enforcing a paywall.
        </p>
      </ScreenHeader>
      <Alert title="Recommended launch model" tone="info">
        Start with a free beta until verified catalog records prove that users receive useful recommendations.
      </Alert>
      {!paidClaims.allowed ? (
        <Alert title="Paid recommendation claims disabled" tone="warning" role="alert">
          {paidClaims.reason} Do not charge for top-three recommendations or detailed build guides until verified records exist.
        </Alert>
      ) : null}
      <div className="card-grid">
        {PRICING_OPTIONS.map((option) => (
          <Card key={option.product.id} className="action-card" tone={option.recommendedForLaunch ? "info" : "neutral"}>
            <div className="status-row">
              <h2>{option.product.name}</h2>
              <StatusBadge tone={option.recommendedForLaunch ? "success" : "warning"}>
                {option.recommendedForLaunch ? "recommended" : "future"}
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
            <Button disabled aria-disabled="true" variant="secondary">
              Checkout not connected
            </Button>
          </Card>
        ))}
      </div>
      <Card>
        <h2>Purchase restoration, refunds, and support</h2>
        <p className="supporting">
          Purchase restoration, receipts, refunds, support contact, sales-tax handling, chargebacks, and cancellation language are placeholders until the owner
          selects a provider and final terms are reviewed.
        </p>
      </Card>
    </section>
  );
}
