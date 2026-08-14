export const STAGING_RELEASE_MODE = "staging";
export const STAGING_TEST_DATA_LABEL = "TEST DATA";
export const STAGING_ROUTE_PATH = "/staging";
export const STAGING_TEST_CATALOG_VERSION = "synthetic-test-catalog-v1";

export function isStagingReleaseModeEnabled(env: Record<string, string | undefined> = process.env) {
  return env.GAMEFACE_RELEASE_MODE === STAGING_RELEASE_MODE || env.NEXT_PUBLIC_GAMEFACE_RELEASE_MODE === STAGING_RELEASE_MODE;
}
