// utils/api.ts
const STOREFRONT_ACCESS_TOKEN = "cee3d6c59cee05db76109a6b4eea968a";
const API_ENDPOINT = `https://maxfoodstore.myshopify.com/api/2025-01/graphql.json`;

export async function fetchShopifyGraphQL({
  query,
  variables = {},
  customerAccessToken,
}: {
  query: string;
  variables?: Record<string, any>;
  customerAccessToken?: string;
}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN,
  };

  if (customerAccessToken) {
    headers["X-Shopify-Customer-Access-Token"] = customerAccessToken;
  }
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Shopify GraphQL API: ${error}`);
  }
  const { data, errors } = await response.json();

  if (errors) {
    console.error("GraphQL errors:", errors);
    return { data: null, errors };
  }

  return { data };
}
