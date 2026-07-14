"use client";

import type { ReliabilityRecoveryPlan } from "@/lib/reliability/recovery-actions";

export function RecoveryActionList({
  plans,
  title = "Recovery action"
}: {
  plans: Array<ReliabilityRecoveryPlan | null | undefined>;
  title?: string;
}) {
  const resolvedPlans = plans.filter((plan): plan is ReliabilityRecoveryPlan => Boolean(plan));
  const uniquePlans = Array.from(new Map(resolvedPlans.map((plan) => [plan.id, plan])).values());
  if (uniquePlans.length === 0) return null;
  return (
    <div className="recovery-action-list" aria-label={title}>
      {uniquePlans.map((plan) => (
        <article className={`alert alert-${plan.severity === "danger" ? "warning" : plan.severity} recovery-action-card`} key={plan.id}>
          <div className="section-heading">
            <p className="eyebrow">{title}</p>
            <h3>{plan.title}</h3>
          </div>
          <p>{plan.userMessage}</p>
          <p>
            <strong>{plan.primaryAction.label}:</strong> {plan.primaryAction.description}
          </p>
          {plan.secondaryActions.length > 0 ? (
            <ul className="message-list">
              {plan.secondaryActions.map((action) => (
                <li key={`${plan.id}-${action.label}`}>
                  <strong>{action.label}:</strong> {action.description}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
