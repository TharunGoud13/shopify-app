// route.tsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import {
  Card,
  Layout,
  Page,
} from "@shopify/polaris";
import StaffRolesTable from "./table"; // Import the new table component
import { TitleBar } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  
  // Fetch staff members
  const staffResponse = await admin.graphql(`
    {
      staffMembers {
        id
        name
        firstName
        lastName
        email
        phone
        isShopOwner
        avatar {
          url
        }
      }
      metaobjects(type: "assigncustomroles", first: 250) {
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
    }
  `);

  const staffJson = await staffResponse.json();
  const staffMembers = staffJson.data.staffMembers;
  
  const assignedRoles = staffJson.data.metaobjects.edges.map((edge) => {
    const fields = edge.node.fields.reduce((acc, field) => {
      acc[field.key] = field.jsonValue;
      return acc;
    }, {});
    return {
      id: edge.node.id,
      ...fields,
    };
  });

  return json({
    staffMembers,
    assignedRoles,
  });
}

export default function Index() {
  const { staffMembers, assignedRoles } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Staff and Assigned Roles Management">
        <button
          variant="primary"
          onClick={() => navigate("/app/staff/new")}
        >
          Add New Staff Member
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <StaffRolesTable staffMembers={staffMembers} assignedRoles={assignedRoles} />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
