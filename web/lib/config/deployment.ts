import { validateDeploymentEnvironment, type EnvironmentValidationResult } from "./environment";

export const DEPLOYMENT_CONFIG_VERSION = "deployment-config-v1";

export type DeploymentEnvironmentName = "local" | "preview" | "staging" | "production";

export interface DeploymentRuntimeConfig {
  configVersion: typeof DEPLOYMENT_CONFIG_VERSION;
  deploymentEnvironment: DeploymentEnvironmentName;
  releaseID: string;
  appBaseUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  supportUrl: string | null;
  supportContact: string | null;
  paymentProviderLabel: string | null;
  recommendationsDisabled: boolean;
  screenshotRefinementDisabled: boolean;
  validation: EnvironmentValidationResult;
}

export function getDeploymentRuntimeConfig(env: Record<string, string | undefined> = process.env): DeploymentRuntimeConfig {
  return {
    configVersion: DEPLOYMENT_CONFIG_VERSION,
    deploymentEnvironment: parseDeploymentEnvironment(env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV),
    releaseID: env.NEXT_PUBLIC_GAMEFACE_RELEASE_ID || "local-unset",
    appBaseUrl: env.NEXT_PUBLIC_GAMEFACE_APP_BASE_URL || null,
    privacyUrl: env.NEXT_PUBLIC_GAMEFACE_PRIVACY_URL || null,
    termsUrl: env.NEXT_PUBLIC_GAMEFACE_TERMS_URL || null,
    supportUrl: env.NEXT_PUBLIC_GAMEFACE_SUPPORT_URL || null,
    supportContact: env.NEXT_PUBLIC_GAMEFACE_SUPPORT_CONTACT || null,
    paymentProviderLabel: env.NEXT_PUBLIC_GAMEFACE_PAYMENT_PROVIDER_LABEL || null,
    recommendationsDisabled: parseBooleanFlag(env.NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED),
    screenshotRefinementDisabled: parseBooleanFlag(env.NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED),
    validation: validateDeploymentEnvironment(env, {
      paymentEnabled: false,
      requirePublicLegalUrls: env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV === "production"
    })
  };
}

export function parseBooleanFlag(value: string | undefined): boolean {
  return value === "true";
}

function parseDeploymentEnvironment(value: string | undefined): DeploymentEnvironmentName {
  if (value === "preview" || value === "staging" || value === "production") return value;
  return "local";
}
