export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  publicKeys: string[];
  serverOnlyKeys: string[];
}

export const PUBLIC_ENVIRONMENT_KEYS = [
  "NEXT_PUBLIC_GAMEFACE_APP_BASE_URL",
  "NEXT_PUBLIC_GAMEFACE_PRIVACY_URL",
  "NEXT_PUBLIC_GAMEFACE_TERMS_URL",
  "NEXT_PUBLIC_GAMEFACE_SUPPORT_URL",
  "NEXT_PUBLIC_GAMEFACE_SUPPORT_CONTACT",
  "NEXT_PUBLIC_GAMEFACE_PAYMENT_PROVIDER_LABEL",
  "NEXT_PUBLIC_GAMEFACE_RELEASE_ID",
  "NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV",
  "NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED",
  "NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED",
  "NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO"
] as const;

export const SERVER_ONLY_ENVIRONMENT_KEYS = [
  "GAMEFACE_PAYMENT_PROVIDER",
  "GAMEFACE_PAYMENT_SERVER_TOKEN",
  "GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN",
  "GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF",
  "GAMEFACE_EXPECTED_CATALOG_VERSION_ID",
  "GAMEFACE_ERROR_REPORTING_PROVIDER",
  "GAMEFACE_ERROR_MONITORING_SERVER_TOKEN",
  "GAMEFACE_OWNER_REVIEW_ACCESS_CODE"
] as const;

export type PublicEnvironmentKey = (typeof PUBLIC_ENVIRONMENT_KEYS)[number];
export type ServerOnlyEnvironmentKey = (typeof SERVER_ONLY_ENVIRONMENT_KEYS)[number];

export interface EnvironmentValidationOptions {
  paymentEnabled: boolean;
  requirePublicLegalUrls: boolean;
}

const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/;

export function validateDeploymentEnvironment(
  env: Record<string, string | undefined>,
  options: EnvironmentValidationOptions = { paymentEnabled: false, requirePublicLegalUrls: false }
): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of PUBLIC_ENVIRONMENT_KEYS) {
    const value = env[key];
    if (value && isUrlKey(key) && !isAllowedPublicUrl(value)) {
      errors.push(`${key} must be an absolute HTTPS URL, or localhost for local testing.`);
    }
    if (value && isBooleanFlagKey(key) && !isBooleanFlag(value)) {
      errors.push(`${key} must be either "true" or "false" when set.`);
    }
    if (key === "NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV" && value && !isDeploymentEnvironmentValue(value)) {
      errors.push(`${key} must be one of: local, development, preview, private_beta, staging, owner_review, production.`);
    }
  }

  if (options.requirePublicLegalUrls) {
    for (const key of ["NEXT_PUBLIC_GAMEFACE_PRIVACY_URL", "NEXT_PUBLIC_GAMEFACE_TERMS_URL", "NEXT_PUBLIC_GAMEFACE_SUPPORT_URL"] as const) {
      if (!env[key]) errors.push(`${key} is required before public launch.`);
    }
  }

  if (options.paymentEnabled) {
    for (const key of ["GAMEFACE_PAYMENT_PROVIDER", "GAMEFACE_PAYMENT_SERVER_TOKEN", "GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN"] as const) {
      if (!env[key]) errors.push(`${key} is required only after the owner selects a payment provider.`);
    }
  } else {
    warnings.push("Payment provider variables are optional because payment is not connected.");
  }

  for (const key of Object.keys(env)) {
    if (key.startsWith("NEXT_PUBLIC_") && (SERVER_ONLY_ENVIRONMENT_KEYS as readonly string[]).includes(key.replace("NEXT_PUBLIC_", "") as ServerOnlyEnvironmentKey)) {
      errors.push(`${key} appears to expose a server-only setting to the browser.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    publicKeys: [...PUBLIC_ENVIRONMENT_KEYS],
    serverOnlyKeys: [...SERVER_ONLY_ENVIRONMENT_KEYS]
  };
}

function isUrlKey(key: string) {
  return key.endsWith("_URL");
}

function isBooleanFlagKey(key: string) {
  return key.endsWith("_DISABLED") || key === "NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO";
}

function isBooleanFlag(value: string) {
  return value === "true" || value === "false";
}

function isAllowedPublicUrl(value: string) {
  return value.startsWith("https://") || localhostPattern.test(value);
}

function isDeploymentEnvironmentValue(value: string) {
  return ["local", "development", "preview", "private_beta", "staging", "owner_review", "production"].includes(value);
}
