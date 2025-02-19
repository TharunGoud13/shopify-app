import { json } from "@remix-run/node";

const DEFAULT_TIMEOUT = 20000; // Timeout in milliseconds (10 seconds)
const DEFAULT_RETRIES = 3; // Number of retry attempts

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = DEFAULT_TIMEOUT,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = DEFAULT_RETRIES,
  backoff = 500,
): Promise<Response> {
  try {
    return await fetchWithTimeout(url, options);
  } catch (error) {
    if (retries <= 1) {
      throw error;
    }
    console.warn(`Fetch error: ${error}. Retrying in ${backoff}ms...`);
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
}

export const action = async ({ request }: { request: Request }) => {
  try {
    const { query, variables } = await request.json();
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
    const SHOPIFY_SUBDOMAIN = process.env.SHOPIFY_SUBDOMAIN;

    if (!SHOPIFY_ACCESS_TOKEN) {
      throw new Error("Missing SHOPIFY_ACCESS_TOKEN in environment variables.");
    }

    if (!SHOPIFY_SUBDOMAIN) {
      throw new Error("Missing SHOPIFY_SUBDOMAIN in environment variables.");
    }

    const url = `https://${SHOPIFY_SUBDOMAIN}.myshopify.com/admin/api/2024-10/graphql.json`;

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    };

    const response = await fetchWithRetry(url, options);
    const jsonResponse = await response.json();

    if (!response.ok || jsonResponse.errors) {
      console.error(
        "GraphQL Error:",
        jsonResponse.errors || response.statusText,
      );
      return json(
        { errors: jsonResponse.errors || response.statusText },
        { status: 500 },
      );
    }

    return json(jsonResponse);
  } catch (error) {
    console.error("Proxy Error:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};
