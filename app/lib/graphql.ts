export async function fetchGraphQL(
  query: string,
  variables = {},
  cors = true,
  admin?: {
    graphql: (
      query: string,
      options?: { variables?: Record<string, any> },
    ) => Promise<any>;
  },
) {
  try {
    let response;
    let SHOPIFY_ACCESS_TOKEN;
    let SHOPIFY_SUBDOMAIN;
    const isServer = typeof process !== "undefined" && process.env;
    try {
      SHOPIFY_ACCESS_TOKEN = isServer
        ? process.env.SHOPIFY_ACCESS_TOKEN
        : undefined;
      SHOPIFY_SUBDOMAIN = isServer ? process.env.SHOPIFY_SUBDOMAIN : undefined;
    } catch (error) {}

    if (admin) {
      response = await admin.graphql(query, { variables });
    } else {
      const endpoint = cors
        ? SHOPIFY_ACCESS_TOKEN && SHOPIFY_SUBDOMAIN
          ? `https://${SHOPIFY_SUBDOMAIN}.myshopify.com/admin/api/2024-10/graphql.json`
          : `/api/shopify/graphql`
        : "shopify:admin/api/graphql.json";

      const headers = {
        "Content-Type": "application/json",
        Referer: "https://admin.shopify.com",
        Origin: "https://admin.shopify.com",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      };

      const options: any = {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      };

      response = await fetch(endpoint, options);
    }

    const jsonResponse = await response.json();

    if (!response.ok || jsonResponse.errors) {
      console.error(
        "GraphQL Error:",
        jsonResponse.errors || response.statusText,
      );
      return {
        errors: jsonResponse.errors ? jsonResponse.errors : response.statusText,
      };
      throw new Error(
        jsonResponse.errors
          ? JSON.stringify(jsonResponse.errors)
          : response.statusText,
      );
    }

    return jsonResponse.data;
  } catch (error) {
    console.error("fetchGraphQL failed:", error);
    throw error;
  }
}
