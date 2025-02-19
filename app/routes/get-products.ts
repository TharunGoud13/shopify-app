/* eslint-disable @typescript-eslint/no-explicit-any */
import { json } from "@remix-run/node";

const SHOPIFY_ADMIN_URL =
  "https://amogademo.myshopify.com/admin/api/2025-01/graphql.json";
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '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';

export async function loader() {
  return json(
    { message: "This request supports only POST requests" },
    { status: 405 },
  );
}

export async function action({ request }: any) {
  console.log("SHOPIFY_ACCESS_TOKEN---", SHOPIFY_ACCESS_TOKEN);
  try {
    const { query } = await request.json();

    const response = await fetch(SHOPIFY_ADMIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN!,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return json({ status: response.status, error: await response.json() });
    }
    const data = await response.json();
    console.log("data--", data);
    return json(data);
  } catch (error) {
    console.log("error--", error);
    return json({ error: "Error occured" }, { status: 500 });
  }
}
