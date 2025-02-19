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
import CustomRolesTable from "./table"; // Import the new component
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(
    `{
      metaobjects(type: "usercustomroles", first: 250) {
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

  const userCustomRoles = jsonResponse.data.metaobjects.edges.map((edge) => {
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
    userCustomRoles,
  });
}


const EmptyRolesState = ({ onAction }) => (
  <EmptyState
    heading="No custom roles available"
    action={{
      content: "Create Custom Role",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Create custom roles and assign permissions to customers.</p>
  </EmptyState>
);

export default function Index() {
  const { userCustomRoles } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Custom Roles Management">
        <button
          variant="primary"
          onClick={() => navigate("/app/customroleid/new")}
        >
          Create Custom Role
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {userCustomRoles.length === 0 ? (
              <EmptyRolesState
                onAction={() => navigate("/app/customroleid/new")}
              />
            ) : (
              <CustomRolesTable userCustomRoles={userCustomRoles} />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
