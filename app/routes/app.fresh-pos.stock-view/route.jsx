// route.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";
import Table from "./table";
import { TitleBar, useAppBridge, Modal } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const locationsQuery = `
        query LocationPickerQuery($first: Int!, $query: String, $includeLegacy: Boolean!) {
            locations(first: $first, query: $query, includeLegacy: $includeLegacy) {
            edges {
                node {
                id
                name
                 
                }
            }
            }
        }
    `;

  const locationsVariables = {
    first: 25,
    query: "active:true", // Fetch only active locations initially
    includeLegacy: true,
  };

  try {
    const locationsData = await admin.graphql(locationsQuery, {
      variables: locationsVariables,
    });
    const locationsDataJSON = await locationsData.json();
    return json({
      locations: locationsDataJSON.data?.locations?.edges.map(
        (edge) => edge.node,
      ),
      defaultLocationId: session?.location || null, // Get from session
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return json({
      locations: [],
      defaultLocationId: null,
    });
  }
}

export default function Index() {
  const { locations, defaultLocationId } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page fullWidth={true}>
      {/* <TitleBar title="Inventory View"></TitleBar> */}
      <Layout>
        <Layout.Section>
          <Table locations={locations} defaultLocationId={defaultLocationId} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
