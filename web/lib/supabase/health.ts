import {
  createSupabaseRuntimeStatus,
  getSupabaseServerRuntimeConfig,
  type SupabaseReadinessCheckState,
  type SupabaseRuntimeStatus,
  type SupabaseServerRuntimeConfig
} from "./runtime-config";

export const supabaseHealthReportVersion = "supabase-health-report-v1";

export interface SupabaseHealthProbeResult {
  state: SupabaseReadinessCheckState;
  statusCode: number | null;
  message: string;
}

export interface SupabaseStatusReport {
  reportVersion: typeof supabaseHealthReportVersion;
  generatedAt: string;
  runtime: SupabaseRuntimeStatus;
  configured: {
    url: boolean;
    publishableKey: boolean;
    serverSecret: boolean;
    directDatabaseUrl: boolean;
    pooledDatabaseUrl: boolean;
    storage: boolean;
  };
  redacted: SupabaseServerRuntimeConfig["redacted"];
  remoteAssertions: {
    migrationsApplied: "unverified";
    rlsPoliciesApplied: "unverified";
    storageBucketsCreated: "unverified";
    productionWritesEnabled: boolean;
  };
}

export async function probeSupabaseHealth(input: {
  config: SupabaseServerRuntimeConfig;
  fetchImpl?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
}): Promise<SupabaseHealthProbeResult> {
  const { config } = input;
  if (!config.url || !config.publishableKey || config.errors.length > 0) {
    return { state: "not_checked", statusCode: null, message: "Supabase health probe skipped because runtime configuration is incomplete." };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 3000);
  try {
    const response = await fetchImpl(`${config.url.replace(/\/$/, "")}/rest/v1/`, {
      method: "GET",
      signal: controller.signal
    });
    return {
      state: response.ok || response.status === 401 || response.status === 404 ? "pass" : "fail",
      statusCode: response.status,
      message: response.ok ? "Supabase REST endpoint responded." : `Supabase REST endpoint returned HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      state: "fail",
      statusCode: null,
      message: error instanceof Error ? `Supabase health probe failed: ${error.message}` : "Supabase health probe failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function createSupabaseStatusReport(input: {
  env?: Record<string, string | undefined>;
  healthCheck?: SupabaseReadinessCheckState;
  schemaCheck?: SupabaseReadinessCheckState;
  now?: Date;
} = {}): SupabaseStatusReport {
  const config = getSupabaseServerRuntimeConfig(input.env ?? process.env);
  const runtime = createSupabaseRuntimeStatus(config, {
    healthCheck: input.healthCheck,
    schemaCheck: input.schemaCheck
  });
  return {
    reportVersion: supabaseHealthReportVersion,
    generatedAt: (input.now ?? new Date()).toISOString(),
    runtime,
    configured: {
      url: Boolean(config.url),
      publishableKey: Boolean(config.publishableKey),
      serverSecret: config.serverSecretConfigured,
      directDatabaseUrl: config.directDatabaseUrlConfigured,
      pooledDatabaseUrl: config.pooledDatabaseUrlConfigured,
      storage: config.storageConfigured
    },
    redacted: config.redacted,
    remoteAssertions: {
      migrationsApplied: "unverified",
      rlsPoliciesApplied: "unverified",
      storageBucketsCreated: "unverified",
      productionWritesEnabled: runtime.mode === "supabase_ready" && config.remoteWritesEnabled
    }
  };
}
