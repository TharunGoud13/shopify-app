// route.tsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
} from "@shopify/polaris";
import Table from "./table"; // Import the table component
import { TitleBar } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `{
      metaobjects(type: "usda_income_guidelines", first: 250) {
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

const EmptyStateComponent = ({ onAction }) => (
  <EmptyState
    heading="No guidelines available"
    action={{
      content: "Add guideline",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Add new income guideline details to manage them effectively.</p>
  </EmptyState>
);

export default function Index() {
  const { data } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="USDA Income Guidelines">
        <button
          variant="primary"
          onClick={() => navigate("/app/usdaincomeguidelinesid/new")}
        >
          Add USDA Income Guidelines
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {data.length === 0 ? (
              <EmptyStateComponent
                onAction={() => navigate("/app/usdaincomeguidelinesid/new")}
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
