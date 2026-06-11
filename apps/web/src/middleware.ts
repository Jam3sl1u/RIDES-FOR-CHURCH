export { default } from "next-auth/middleware";

// Protect the entire admin area and all data APIs (auth routes excluded by matcher).
export const config = {
  matcher: ["/admin/:path*", "/api/((?!auth).*)"],
};
