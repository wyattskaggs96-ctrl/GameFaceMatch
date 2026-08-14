export function isLocalFileBackedResearchRouteAvailable(env: Record<string, string | undefined>) {
  return env.NODE_ENV !== "production";
}

