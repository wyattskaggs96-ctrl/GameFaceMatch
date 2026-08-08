import { NextResponse, type NextRequest } from "next/server";
import {
  evaluateOwnerReviewAccess,
  OWNER_REVIEW_ACCESS_COOKIE,
  readOwnerReviewQueryAccessCode
} from "@/lib/security/owner-review-access";

export function proxy(request: NextRequest) {
  const decision = evaluateOwnerReviewAccess({
    pathname: request.nextUrl.pathname,
    queryAccessCode: readOwnerReviewQueryAccessCode(request.nextUrl.searchParams),
    cookieAccessCode: request.cookies.get(OWNER_REVIEW_ACCESS_COOKIE)?.value ?? null,
    env: process.env
  });

  if (decision.status === "allow") {
    return NextResponse.next();
  }

  if (decision.status === "set_cookie") {
    const redirectUrl = request.nextUrl.clone();
    for (const key of ["ownerCode", "accessCode"]) {
      redirectUrl.searchParams.delete(key);
    }
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
      name: decision.cookieName,
      value: decision.cookieValue,
      httpOnly: true,
      sameSite: "strict",
      secure: request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });
    return response;
  }

  return new NextResponse(decision.message, {
    status: decision.httpStatus,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export const config = {
  matcher: ["/owner/:path*", "/verifier/:path*", "/api/internal/:path*"]
};
