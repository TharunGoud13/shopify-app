// route.tsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";
import Table from "./table"; // Import the table component
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(
    `{
      metaobjects(type: "fulfillment_task", first: 250) {
        edges {
          node {
            id
            fields {
              key
              value
              jsonValue
            }
          }
        }
      }
    }`
  );

  const jsonResponse = await response.json();

  const data = jsonResponse.data.metaobjects.edges.map((edge) => {
    const fields = edge.node.fields.reduce((acc, field) => {
      acc[field.key] = field.jsonValue;
      return acc;
    }, {});
    return {
      id: edge.node.id,
      handle: edge.node.handle,
      ...fields,
    };
  });

  return json({
    data,
  });
}

const EmptyTasksState = ({ onAction }) => (
  <EmptyState
    heading="No fulfillment tasks available"
    action={{
      content: "Add fulfillment task",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Add tasks to manage your fulfillment workflow.</p>
  </EmptyState>
);

export default function FulfillmentTaskIndex() {
  const { data } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Fulfillment Tasks">
        <button
          variant="primary"
          onClick={() => navigate("/app/fulfillmenttaskid/new")}
        >
          Add fulfillment task
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {data.length === 0 ? (
              <EmptyTasksState
                onAction={() => navigate("/app/fulfillmenttaskid/new")}
              />
            ) : (
              <Table data={data} />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
