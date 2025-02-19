import { json } from "@remix-run/node";

export const action = async ({ request }: any) => {
  const { orderInput } = await request.json();
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_MAX_TOKEN || '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';

  const query = `
    mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
      orderCreate(order: $order, options: $options) {
        userErrors {
          field
          message
        }
        order {
          id
          displayFinancialStatus
          customer {
            id
          }
        }
      }
    }
  `;

  try {
    const shopifyResponse = await fetch(
      "https://amogademo.myshopify.com/admin/api/2025-01/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN!,
        },
        body: JSON.stringify({
          query,
          variables: { order: orderInput },
        }),
      },
    );

    const result = await shopifyResponse.json();

    if (!shopifyResponse.ok || result.errors) {
      return json(
        { error: result.errors || result.data.orderCreate?.userErrors },
        { status: 400 },
      );
    }

    return json(result.data); // Return the Shopify response to the client
  } catch (error) {
    console.error("Error placing order:", error);
    return json({ error: "Failed to place the order" }, { status: 500 });
  }
};
