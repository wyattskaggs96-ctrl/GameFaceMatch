import { parseDeploymentEnvironment } from "@/lib/config/deployment";

export const OWNER_REVIEW_ACCESS_COOKIE = "gfm_owner_review_access";
export const OWNER_REVIEW_ACCESS_QUERY_PARAMS = ["ownerCode", "accessCode"] as const;

export type OwnerReviewAccessDecision =
  | { status: "allow" }
  | { status: "set_cookie"; cookieName: typeof OWNER_REVIEW_ACCESS_COOKIE; cookieValue: string; redirectPath: string }
  | { status: "block"; httpStatus: 401 | 404 | 503; message: string };

export function isOwnerReviewProtectedPath(pathname: string) {
  return pathname === "/verifier" || pathname.startsWith("/verifier/") || pathname.startsWith("/owner/") || pathname.startsWith("/api/internal/");
}

export function isInternalToolingAvailableInRuntime(env: Record<string, string | undefined>) {
  return env.NODE_ENV !== "production" || parseDeploymentEnvironment(env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV) === "owner_review";
}

export function evaluateOwnerReviewAccess(input: {
  pathname: string;
  queryAccessCode: string | null;
  cookieAccessCode: string | null;
  env: Record<string, string | undefined>;
}): OwnerReviewAccessDecision {
  if (!isOwnerReviewProtectedPath(input.pathname)) {
    return { status: "allow" };
  }

  const deploymentEnvironment = parseDeploymentEnvironment(input.env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV);
  if (input.env.NODE_ENV === "production" && deploymentEnvironment !== "owner_review") {
    return {
      status: "block",
      httpStatus: 404,
      message: "Internal GameFace Match tooling is unavailable in production."
    };
  }

  if (deploymentEnvironment !== "owner_review") {
    return { status: "allow" };
  }

  const configuredAccessCode = input.env.GAMEFACE_OWNER_REVIEW_ACCESS_CODE;
  if (!configuredAccessCode) {
    return {
      status: "block",
      httpStatus: 503,
      message: "Owner review access is not configured."
    };
  }

  if (input.cookieAccessCode === configuredAccessCode) {
    return { status: "allow" };
  }

  if (input.queryAccessCode === configuredAccessCode) {
    return {
      status: "set_cookie",
      cookieName: OWNER_REVIEW_ACCESS_COOKIE,
      cookieValue: configuredAccessCode,
      redirectPath: input.pathname
    };
  }

  return {
    status: "block",
    httpStatus: 401,
    message: "Owner review access code is required."
  };
}

export function readOwnerReviewQueryAccessCode(searchParams: URLSearchParams) {
  for (const key of OWNER_REVIEW_ACCESS_QUERY_PARAMS) {
    const value = searchParams.get(key);
    if (value) return value;
  }
  return null;
}
