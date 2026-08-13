import { describe, expect, it } from "vitest";
import {
  PUBLIC_ENVIRONMENT_KEYS,
  SERVER_ONLY_ENVIRONMENT_KEYS,
  validateDeploymentEnvironment
} from "@/lib/config/environment";

describe("deployment environment contract", () => {
  it("requires no variables for the current free local MVP", () => {
    const result = validateDeploymentEnvironment({});
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain("Payment provider variables are optional because payment is not connected.");
  });

  it("validates public URL shape without requiring provider details", () => {
    expect(
      validateDeploymentEnvironment({
        NEXT_PUBLIC_GAMEFACE_APP_BASE_URL: "https://app.example.com",
        NEXT_PUBLIC_GAMEFACE_PRIVACY_URL: "http://not-secure.example.com"
      }).errors
    ).toEqual(["NEXT_PUBLIC_GAMEFACE_PRIVACY_URL must be an absolute HTTPS URL, or localhost for local testing."]);
  });

  it("requires legal URLs only when public launch opts into that gate", () => {
    const result = validateDeploymentEnvironment(
      {
        NEXT_PUBLIC_GAMEFACE_PRIVACY_URL: "https://example.com/privacy",
        NEXT_PUBLIC_GAMEFACE_TERMS_URL: "https://example.com/terms"
      },
      { paymentEnabled: false, requirePublicLegalUrls: true }
    );
    expect(result.errors).toEqual(["NEXT_PUBLIC_GAMEFACE_SUPPORT_URL is required before public launch."]);
  });

  it("requires server-only payment variables only after payment is enabled", () => {
    const result = validateDeploymentEnvironment({}, { paymentEnabled: true, requirePublicLegalUrls: false });
    expect(result.errors).toEqual([
      "GAMEFACE_PAYMENT_PROVIDER is required only after the owner selects a payment provider.",
      "GAMEFACE_PAYMENT_SERVER_TOKEN is required only after the owner selects a payment provider.",
      "GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN is required only after the owner selects a payment provider."
    ]);
  });

  it("validates the owner review demo flag as an explicit public boolean", () => {
    expect(
      validateDeploymentEnvironment({
        NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "yes"
      }).errors
    ).toContain('NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO must be either "true" or "false" when set.');
  });

  it("recognizes owner review deployment while keeping its access code server-only", () => {
    const result = validateDeploymentEnvironment({
      NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "owner_review",
      NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "true"
    });
    expect(result.valid).toBe(true);
    expect(SERVER_ONLY_ENVIRONMENT_KEYS).toContain("GAMEFACE_OWNER_REVIEW_ACCESS_CODE");
  });

  it("recognizes private beta deployment as a distinct Vercel environment", () => {
    const result = validateDeploymentEnvironment({
      NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "private_beta",
      NEXT_PUBLIC_GAMEFACE_APP_BASE_URL: "https://gameface-match-private-beta.vercel.app",
      NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED: "true",
      NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED: "true"
    });
    expect(result.valid).toBe(true);
  });

  it("rejects unknown deployment environment names", () => {
    expect(
      validateDeploymentEnvironment({
        NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "public-demo"
      }).errors
    ).toContain("NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV must be one of: local, development, preview, private_beta, staging, owner_review, production.");
  });

  it("keeps public and server-only variable names separated", () => {
    expect(PUBLIC_ENVIRONMENT_KEYS.every((key) => key.startsWith("NEXT_PUBLIC_"))).toBe(true);
    expect(SERVER_ONLY_ENVIRONMENT_KEYS.every((key) => !key.startsWith("NEXT_PUBLIC_"))).toBe(true);
  });
});
