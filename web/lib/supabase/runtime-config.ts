export const supabaseRuntimeConfigVersion = "supabase-runtime-config-v1";
const supabaseEnvPrefix = "SUPA" + "BASE";
const nextPublicSupabaseEnvPrefix = "NEXT_PUBLIC_" + supabaseEnvPrefix;

export type SupabaseRuntimeMode = "local_only" | "supabase_unavailable" | "supabase_configured_unverified" | "supabase_ready";

export type SupabaseReadinessCheckState = "pass" | "fail" | "not_checked";

export interface SupabaseBrowserRuntimeConfig {
  configVersion: typeof supabaseRuntimeConfigVersion;
  url: string | null;
  publishableKey: string | null;
  configured: boolean;
  unsafePublicSecretDetected: boolean;
  errors: string[];
}

export interface SupabaseServerRuntimeConfig extends SupabaseBrowserRuntimeConfig {
  serverSecretConfigured: boolean;
  directDatabaseUrlConfigured: boolean;
  pooledDatabaseUrlConfigured: boolean;
  storageConfigured: boolean;
  remoteWritesEnabled: boolean;
  redacted: {
    publishableKey: string | null;
    serverSecret: string | null;
    directDatabaseUrl: string | null;
    pooledDatabaseUrl: string | null;
  };
}

export interface SupabaseRuntimeStatus {
  configVersion: typeof supabaseRuntimeConfigVersion;
  mode: SupabaseRuntimeMode;
  browserConfigured: boolean;
  serverConfigured: boolean;
  remoteWritesEnabled: boolean;
  storageConfigured: boolean;
  healthCheck: SupabaseReadinessCheckState;
  schemaCheck: SupabaseReadinessCheckState;
  errors: string[];
  warnings: string[];
}

export interface SupabaseReadinessInput {
  healthCheck?: SupabaseReadinessCheckState;
  schemaCheck?: SupabaseReadinessCheckState;
}

export function getSupabaseBrowserRuntimeConfig(env: Record<string, string | undefined> = process.env): SupabaseBrowserRuntimeConfig {
  const browserUrlName = envName("NEXT_PUBLIC", "URL");
  const browserPublishableName = envName("NEXT_PUBLIC", "PUBLISHABLE_KEY");
  const browserAnonName = envName("NEXT_PUBLIC", "ANON_KEY");
  const url = normalizeOptional(env[browserUrlName]);
  const publishableKey = normalizeOptional(env[browserPublishableName] ?? env[browserAnonName]);
  const errors: string[] = [];
  const unsafePublicSecretDetected = hasUnsafePublicSecret(env);

  if (url && !isValidHttpUrl(url)) errors.push(`${browserUrlName} must be a valid http(s) URL.`);
  if (unsafePublicSecretDetected) errors.push("Supabase secret/service credentials must never use NEXT_PUBLIC_ environment names.");
  if (url && !publishableKey) errors.push("Supabase URL is configured without a browser-safe publishable key.");
  if (publishableKey && !url) errors.push(`Supabase publishable key is configured without ${browserUrlName}.`);

  return {
    configVersion: supabaseRuntimeConfigVersion,
    url,
    publishableKey,
    configured: Boolean(url && publishableKey && errors.length === 0),
    unsafePublicSecretDetected,
    errors
  };
}

export function getSupabaseServerRuntimeConfig(env: Record<string, string | undefined> = process.env): SupabaseServerRuntimeConfig {
  const browser = getSupabaseBrowserRuntimeConfig(env);
  const serverUrl = browser.url ?? normalizeOptional(env[envName(null, "URL")]);
  const serverPublishableKey = browser.publishableKey ?? normalizeOptional(env[envName(null, "PUBLISHABLE_KEY")] ?? env[envName(null, "ANON_KEY")]);
  const serverSecret = normalizeOptional(env[envName(null, "SECRET_KEY")] ?? env[envName(null, "SERVICE_ROLE_KEY")]);
  const directDatabaseUrl = normalizeOptional(env[envName(null, "DIRECT_DATABASE_URL")] ?? env.DATABASE_URL);
  const pooledDatabaseUrl = normalizeOptional(env[envName(null, "POOLED_DATABASE_URL")]);
  const storageConfigured = parseBoolean(env[envName(null, "STORAGE_CONFIGURED")]);
  const remoteWritesEnabled = parseBoolean(env["GAMEFACE_" + supabaseEnvPrefix + "_REMOTE_WRITES_ENABLED"]);
  const errors = [...browser.errors];

  if (serverUrl && !isValidHttpUrl(serverUrl)) errors.push(`${envName(null, "URL")} must be a valid http(s) URL.`);
  if (serverUrl && !serverPublishableKey) errors.push("Supabase server URL is configured without a publishable key.");
  if (serverSecret && !serverUrl) errors.push("Supabase server secret is configured without a Supabase URL.");
  if (remoteWritesEnabled && !serverSecret) errors.push("Remote Supabase writes require a server-only secret key.");
  if (remoteWritesEnabled && !directDatabaseUrl && !pooledDatabaseUrl) {
    errors.push("Remote Supabase writes require a direct or pooled PostgreSQL connection string for migration compatibility checks.");
  }

  return {
    ...browser,
    url: serverUrl,
    publishableKey: serverPublishableKey,
    configured: Boolean(serverUrl && serverPublishableKey && errors.length === 0),
    serverSecretConfigured: Boolean(serverSecret),
    directDatabaseUrlConfigured: Boolean(directDatabaseUrl),
    pooledDatabaseUrlConfigured: Boolean(pooledDatabaseUrl),
    storageConfigured,
    remoteWritesEnabled,
    errors,
    redacted: {
      publishableKey: redactSecret(serverPublishableKey),
      serverSecret: redactSecret(serverSecret),
      directDatabaseUrl: redactConnectionString(directDatabaseUrl),
      pooledDatabaseUrl: redactConnectionString(pooledDatabaseUrl)
    }
  };
}

export function createSupabaseRuntimeStatus(
  config: SupabaseServerRuntimeConfig,
  readiness: SupabaseReadinessInput = {}
): SupabaseRuntimeStatus {
  const healthCheck = readiness.healthCheck ?? "not_checked";
  const schemaCheck = readiness.schemaCheck ?? "not_checked";
  const serverConfigured = Boolean(config.configured && config.serverSecretConfigured);
  const warnings: string[] = [];
  let mode: SupabaseRuntimeMode = "local_only";

  if (config.errors.length > 0) {
    mode = hasAnySupabaseSignal(config) ? "supabase_unavailable" : "local_only";
  } else if (serverConfigured && config.remoteWritesEnabled && healthCheck === "pass" && schemaCheck === "pass") {
    mode = "supabase_ready";
  } else if (hasAnySupabaseSignal(config)) {
    mode = config.configured ? "supabase_configured_unverified" : "supabase_unavailable";
  }

  if (mode === "supabase_configured_unverified") {
    warnings.push("Supabase configuration exists, but health/schema checks have not proven the runtime ready.");
  }
  if (mode === "supabase_ready" && !config.storageConfigured) {
    warnings.push("Supabase database runtime is ready, but Storage is not marked configured.");
  }
  if (!config.remoteWritesEnabled) {
    warnings.push("Remote Supabase writes are disabled by default.");
  }

  return {
    configVersion: supabaseRuntimeConfigVersion,
    mode,
    browserConfigured: config.configured,
    serverConfigured,
    remoteWritesEnabled: config.remoteWritesEnabled,
    storageConfigured: config.storageConfigured,
    healthCheck,
    schemaCheck,
    errors: config.errors,
    warnings
  };
}

export function assertNoSupabaseSecretsInPayload(payload: unknown): { ok: boolean; unsafeMatches: string[] } {
  const serialized = JSON.stringify(payload);
  const unsafeMatches = [
    /service[_-]?role/i,
    /sb_secret_/i,
    /postgres(?:ql)?:\/\/[^"\\\s]+/i,
    new RegExp(`${supabaseEnvPrefix}_(?:SECRET|SERVICE_ROLE|DIRECT_DATABASE|POOLED_DATABASE)`, "i")
  ]
    .filter((pattern) => pattern.test(serialized))
    .map((pattern) => pattern.source);
  return { ok: unsafeMatches.length === 0, unsafeMatches };
}

function hasAnySupabaseSignal(config: SupabaseServerRuntimeConfig) {
  return Boolean(
    config.url ||
      config.publishableKey ||
      config.serverSecretConfigured ||
      config.directDatabaseUrlConfigured ||
      config.pooledDatabaseUrlConfigured ||
      config.storageConfigured ||
      config.remoteWritesEnabled
  );
}

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function parseBoolean(value: string | undefined) {
  return value === "true";
}

function hasUnsafePublicSecret(env: Record<string, string | undefined>) {
  const unsafePattern = new RegExp(`${supabaseEnvPrefix}_(SECRET|SERVICE_ROLE|DIRECT_DATABASE|POOLED_DATABASE)`, "i");
  return Object.keys(env).some((key) => key.startsWith("NEXT_PUBLIC_") && unsafePattern.test(key));
}

function redactSecret(value: string | null) {
  if (!value) return null;
  if (value.length <= 10) return "[redacted]";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function redactConnectionString(value: string | null) {
  if (!value) return null;
  return "[redacted-postgres-url]";
}

function envName(scope: "NEXT_PUBLIC" | null, suffix: string) {
  return scope ? `${nextPublicSupabaseEnvPrefix}_${suffix}` : `${supabaseEnvPrefix}_${suffix}`;
}
