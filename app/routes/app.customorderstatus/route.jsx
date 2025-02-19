// Index.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
} from "@shopify/polaris";
import Table from "./table"; // Import the new component
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(
    `{
      metaobjects(type: "custom_order_status", first: 250) {
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


const EmptyRolesState = ({ onAction }) => (
  <EmptyState
    heading="No Custom Order available"
    action={{
      content: "Add Custom Order Status",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Add Custom Order to assign to it in orders.</p>
  </EmptyState>
);

export default function Index() {
  const { data } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Custom Order Status">
        <button
          variant="primary"
          onClick={() => navigate("/app/customorderstatusid/new")}
        >
          Add Custom Order Status
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {data.length === 0 ? (
              <EmptyRolesState
                onAction={() => navigate("/app/customorderstatusid/new")}
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
