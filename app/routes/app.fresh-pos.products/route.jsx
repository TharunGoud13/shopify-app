// Index.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";
import ProductsTable from "./table"; // Import the new component
import { TitleBar, useAppBridge, Modal } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  // const customStatusResponse = await admin.graphql(
  //   `{
  //     metaobjects(type: "custom_order_status", first: 250) {
  //       edges {
  //         node {
  //           id
  //           type
  //           fields {
  //             key
  //             value
  //             jsonValue
  //           }
  //         }
  //       }
  //     }
  //   }`,
  // );

  // const customStatusjson = await customStatusResponse.json();

  // const customStatus = customStatusjson.data.metaobjects.edges.map((edge) => {
  //   const fields = edge.node.fields.reduce((acc, field) => {
  //     acc[field.key] = field.jsonValue;
  //     return acc;
  //   }, {});
  //   return {
  //     id: edge.node.id,
  //     handle: edge.node.handle,
  //     type: edge.node.type,
  //     ...fields,
  //   };
  // });

  // const sortedCustomStatus = customStatus.sort(
  //   (a, b) => a.sequence_no - b.sequence_no,
  // );

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
          onClick={() => navigate("/app/fresh-posid/products/new")}
        >
          Add Product
        </button>
      </TitleBar> */}
      <Layout>
        <Layout.Section>
          <ProductsTable />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
