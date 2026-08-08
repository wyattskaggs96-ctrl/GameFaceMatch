import { describe, expect, it } from "vitest";
import {
  evaluateOwnerReviewAccess,
  isInternalToolingAvailableInRuntime,
  isOwnerReviewProtectedPath,
  OWNER_REVIEW_ACCESS_COOKIE,
  readOwnerReviewQueryAccessCode
} from "@/lib/security/owner-review-access";

describe("owner review deployment access gate", () => {
  it("protects owner, verifier, and internal API routes without blocking customer invite routes", () => {
    expect(isOwnerReviewProtectedPath("/owner/trials")).toBe(true);
    expect(isOwnerReviewProtectedPath("/verifier")).toBe(true);
    expect(isOwnerReviewProtectedPath("/api/internal/cf27-supported-subset-verifier-session")).toBe(true);
    expect(isOwnerReviewProtectedPath("/trial/btv1_owner_0123456789abcdef0123456789abcdef")).toBe(false);
  });

  it("keeps internal tooling unavailable in true production", () => {
    expect(
      isInternalToolingAvailableInRuntime({
        NODE_ENV: "production",
        NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "production"
      })
    ).toBe(false);
    expect(
      evaluateOwnerReviewAccess({
        pathname: "/owner/trials",
        queryAccessCode: "secret",
        cookieAccessCode: "secret",
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "production",
          GAMEFACE_OWNER_REVIEW_ACCESS_CODE: "secret"
        }
      })
    ).toEqual({
      status: "block",
      httpStatus: 404,
      message: "Internal GameFace Match tooling is unavailable in production."
    });
  });

  it("allows owner review tooling in a production build only when the owner review deployment environment is selected", () => {
    expect(
      isInternalToolingAvailableInRuntime({
        NODE_ENV: "production",
        NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "owner_review"
      })
    ).toBe(true);
  });

  it("requires a server-only owner review access code in owner_review deployments", () => {
    expect(
      evaluateOwnerReviewAccess({
        pathname: "/verifier",
        queryAccessCode: null,
        cookieAccessCode: null,
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "owner_review"
        }
      })
    ).toEqual({
      status: "block",
      httpStatus: 503,
      message: "Owner review access is not configured."
    });
  });

  it("accepts a matching query code once and then relies on the http-only cookie", () => {
    expect(
      evaluateOwnerReviewAccess({
        pathname: "/owner/trials",
        queryAccessCode: "owner-secret",
        cookieAccessCode: null,
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "owner_review",
          GAMEFACE_OWNER_REVIEW_ACCESS_CODE: "owner-secret"
        }
      })
    ).toEqual({
      status: "set_cookie",
      cookieName: OWNER_REVIEW_ACCESS_COOKIE,
      cookieValue: "owner-secret",
      redirectPath: "/owner/trials"
    });

    expect(
      evaluateOwnerReviewAccess({
        pathname: "/api/internal/cf27-supported-subset-verifier-session",
        queryAccessCode: null,
        cookieAccessCode: "owner-secret",
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "owner_review",
          GAMEFACE_OWNER_REVIEW_ACCESS_CODE: "owner-secret"
        }
      })
    ).toEqual({ status: "allow" });
  });

  it("rejects missing or wrong owner-review access codes without logging sensitive values", () => {
    expect(
      evaluateOwnerReviewAccess({
        pathname: "/api/internal/research-source-video",
        queryAccessCode: "wrong-secret",
        cookieAccessCode: null,
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "owner_review",
          GAMEFACE_OWNER_REVIEW_ACCESS_CODE: "owner-secret"
        }
      })
    ).toEqual({
      status: "block",
      httpStatus: 401,
      message: "Owner review access code is required."
    });
  });

  it("reads either supported access-code query parameter", () => {
    expect(readOwnerReviewQueryAccessCode(new URLSearchParams("ownerCode=one"))).toBe("one");
    expect(readOwnerReviewQueryAccessCode(new URLSearchParams("accessCode=two"))).toBe("two");
    expect(readOwnerReviewQueryAccessCode(new URLSearchParams("code=three"))).toBeNull();
  });
});
