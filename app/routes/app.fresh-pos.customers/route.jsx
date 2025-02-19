// Index.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";
import Table from "./table"; // Import the new component
import { TitleBar, useAppBridge, Modal } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  return json({
    customStatus: [],
  });
}

const EmptyRolesState = ({ onAction }) => (
  <EmptyState
    heading="No Orders available"
    // action={{
    //   content: "Add page",
    //   onAction,
    // }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Add page orders to see them.</p>
  </EmptyState>
);

export default function Index() {
  const { customStatus } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page fullWidth={true}>
      {/* <TitleBar title="Order Fulfillment">
        <button
          variant="primary"
          onClick={() => navigate("/app/freshpagesid/new")}
        >
          Add page
        </button> 
      </TitleBar> */}
      <Layout>
        <Layout.Section>
          <Table />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
