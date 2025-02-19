import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Page, Spinner, Text, Button } from "@shopify/polaris";
import { getSession, destroySession } from "../../session.server";
import { getCustomerDetails } from "../../lib/auth";

export async function loader({ request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const customerAccessToken = session.get("customerAccessToken");

  if (!customerAccessToken) {
    return redirect("/pos/login");
  }
  const { data, errors } = await getCustomerDetails(customerAccessToken);
  if (errors) {
    console.log("errors", errors);
    return redirect("/pos/login?errorMsg=session expired please login again", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  return json({ customer: data?.customer });
}

export default function POSPage() {
  const { customer } = useLoaderData();
  return (
    <div title="POS Area">
      <Card>
        {customer ? (
          <>
            <Text variant="headingMd">
              POS Area for {customer.firstName} {customer.lastName}!
            </Text>
            <Button url="/pos/login?logout=true" >Log Out</Button>
          </>
        ) : (
          <Text variant="headingMd">Loading ...</Text>
        )}
      </Card>
    </div>
  );
}
