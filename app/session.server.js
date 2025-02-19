// Same as you provided
import { createCookieSessionStorage } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET || "secret";

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "shopify_customer_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export { getSession, commitSession, destroySession };