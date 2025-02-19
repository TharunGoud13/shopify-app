import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";
import RegistrationTable from "./table"; // Import the registration table component
import { TitleBar } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(
    `{
      metaobjects(type: "registration", first: 250) {
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

const EmptyRegistrationsState = ({ onAction }) => (
  <EmptyState
    heading="No registrations available"
    action={{
      content: "Add registration",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Add registrations to manage your records.</p>
  </EmptyState>
);

export default function RegistrationIndex() {
  const { data } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Registrations">
        <button
          variant="primary"
          onClick={() => navigate("/app/registrationid/new")}
        >
          Add registration
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {data.length === 0 ? (
              <EmptyRegistrationsState
                onAction={() => navigate("/app/registrationid/new")}
              />
            ) : (
              <RegistrationTable data={data} />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
