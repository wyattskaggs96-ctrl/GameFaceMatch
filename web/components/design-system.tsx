"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes } from "react";
import { useEffect, useRef } from "react";
import type { AppScreen, StepFlowStep } from "@/lib/navigation";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function ScreenHeader({
  eyebrow,
  title,
  children,
  id
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={id}>{title}</h1>
      <div className="section-copy">{children}</div>
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`button button-${variant} ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  );
}

export function Card({
  children,
  tone = "neutral",
  className = ""
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <div className={`card card-${tone} ${className}`.trim()}>{children}</div>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function ProgressBar({
  value,
  max,
  label
}: {
  value: number;
  max: number;
  label: string;
}) {
  const normalizedMax = Math.max(max, 1);
  const percent = Math.round((Math.min(value, normalizedMax) / normalizedMax) * 100);
  return (
    <div className="progress-block">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{value}/{max}</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Alert({
  title,
  children,
  tone = "info",
  role = "status"
}: {
  title: string;
  children: ReactNode;
  tone?: Tone;
  role?: "status" | "alert";
}) {
  return (
    <div className={`alert alert-${tone}`} role={role}>
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="empty-state">
      <div>
        <p className="empty-kicker">No data yet</p>
        <h2>{title}</h2>
        <div className="section-copy">{children}</div>
      </div>
      {action}
    </Card>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      <strong>{label}</strong>
    </div>
  );
}

export function TextField({
  label,
  note,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  note?: string;
}) {
  const id = props.id ?? `field-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
      {note ? <span className="field-note">{note}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  note,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  const id = props.id ?? `field-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} {...props}>
        {children}
      </select>
      {note ? <span className="field-note">{note}</span> : null}
    </label>
  );
}

export function ModalDialog({
  title,
  children,
  actions,
  onDismiss,
  tone = "danger"
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  onDismiss: () => void;
  tone?: Tone;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstButton = dialogRef.current?.querySelector("button");
    firstButton?.focus();
    return () => {
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onDismiss();
      return;
    }
    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className={`modal-dialog modal-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        ref={dialogRef}
        onKeyDown={trapFocus}
      >
        <strong id="modal-title">{title}</strong>
        <div className="section-copy" id="modal-description">{children}</div>
        <div className="button-row">{actions}</div>
      </div>
    </div>
  );
}

export function StepFlowRail({
  steps,
  activeScreen,
  onNavigate
}: {
  steps: Array<{ id: StepFlowStep; label: string; description: string }>;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}) {
  const activeIndex = steps.findIndex((step) => step.id === activeScreen);
  return (
    <aside className="step-rail" aria-label="Match step progress">
      {steps.map((step, index) => (
        <button
          key={step.id}
          className="step-item"
          type="button"
          data-active={step.id === activeScreen}
          data-complete={activeIndex > index}
          onClick={() => onNavigate(step.id)}
          aria-current={step.id === activeScreen ? "step" : undefined}
          aria-label={`${step.label}: ${step.description}`}
        >
          <span className="step-marker">{index + 1}</span>
          <span>
            <strong>{step.label}</strong>
            <small>{step.description}</small>
          </span>
        </button>
      ))}
    </aside>
  );
}
