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
  "NEXT_PUBLIC_GAMEFACE_PAYMENT_PROVIDER_LABEL"
] as const;

export const SERVER_ONLY_ENVIRONMENT_KEYS = [
  "GAMEFACE_PAYMENT_PROVIDER",
  "GAMEFACE_PAYMENT_SERVER_TOKEN",
  "GAMEFACE_PAYMENT_WEBHOOK_SIGNING_TOKEN",
  "GAMEFACE_PAYMENT_PRODUCT_CONFIG_REF",
  "GAMEFACE_ERROR_MONITORING_SERVER_TOKEN"
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

function isAllowedPublicUrl(value: string) {
  return value.startsWith("https://") || localhostPattern.test(value);
}
