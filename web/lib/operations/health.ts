import type { GameCatalogManifest } from "@/types/domain";
import type { DeploymentRuntimeConfig } from "@/lib/config/deployment";
import { monitorCatalogRelease, type CatalogReleaseMonitorReport } from "./release-monitoring";

export interface HealthReport {
  service: "gameface-match-web";
  status: "ok" | "degraded" | "misconfigured";
  generatedAt: string;
  releaseID: string;
  deploymentEnvironment: DeploymentRuntimeConfig["deploymentEnvironment"];
  uptimeSeconds: number;
  catalog: CatalogReleaseMonitorReport;
  killSwitches: {
    recommendationsDisabled: boolean;
    screenshotRefinementDisabled: boolean;
  };
  support: {
    supportUrlConfigured: boolean;
    supportContactConfigured: boolean;
  };
  privacy: {
    rawMediaLogging: "disabled";
    analyticsPreciseMeasurements: "prohibited";
    externalErrorProviderConnected: false;
  };
  checks: Array<{ name: string; status: "pass" | "warn" | "fail"; message: string }>;
}

export function createHealthReport(input: {
  config: DeploymentRuntimeConfig;
  manifest: GameCatalogManifest;
  now?: Date;
  uptimeSeconds?: number;
  expectedCatalogVersionID?: string | null;
}): HealthReport {
  const catalog = monitorCatalogRelease(input.manifest, input.expectedCatalogVersionID);
  const checks = [
    {
      name: "environmentValidation",
      status: input.config.validation.valid ? ("pass" as const) : ("fail" as const),
      message: input.config.validation.valid ? "Environment variables are valid." : input.config.validation.errors.join(" ")
    },
    {
      name: "catalogRelease",
      status: catalog.state === "available" ? ("pass" as const) : catalog.state === "empty" ? ("warn" as const) : ("fail" as const),
      message: catalog.message
    },
    {
      name: "recommendationKillSwitch",
      status: input.config.recommendationsDisabled ? ("warn" as const) : ("pass" as const),
      message: input.config.recommendationsDisabled ? "Recommendations are disabled by deployment configuration." : "Recommendation kill switch is not active."
    },
    {
      name: "privacySafeOperations",
      status: "pass" as const,
      message: "Raw media logging and precise facial-measurement analytics are prohibited."
    }
  ];
  const hasFailedCheck = checks.some((check) => check.status === "fail");
  const hasWarning = checks.some((check) => check.status === "warn");

  return {
    service: "gameface-match-web",
    status: hasFailedCheck ? "misconfigured" : hasWarning ? "degraded" : "ok",
    generatedAt: (input.now ?? new Date()).toISOString(),
    releaseID: input.config.releaseID,
    deploymentEnvironment: input.config.deploymentEnvironment,
    uptimeSeconds: Math.max(0, Math.round(input.uptimeSeconds ?? process.uptime?.() ?? 0)),
    catalog,
    killSwitches: {
      recommendationsDisabled: input.config.recommendationsDisabled,
      screenshotRefinementDisabled: input.config.screenshotRefinementDisabled
    },
    support: {
      supportUrlConfigured: Boolean(input.config.supportUrl),
      supportContactConfigured: Boolean(input.config.supportContact)
    },
    privacy: {
      rawMediaLogging: "disabled",
      analyticsPreciseMeasurements: "prohibited",
      externalErrorProviderConnected: false
    },
    checks
  };
}
