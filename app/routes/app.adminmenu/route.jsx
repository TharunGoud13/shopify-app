// freshpages.tsx
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Grid, BlockStack, Button, Text } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";

// Loader function to fetch data
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(
    `{
      metaobjects(type: "freshpages", first: 250) {
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
    }`,
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
    freshpages: data,
  });
}

export default function FreshPages() {
  const { freshpages } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page fullWidth>
      <TitleBar title="Menu"></TitleBar>
      <Grid>
        {freshpages.map((page, index) => (
          <Grid.Cell
            key={index}
            columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}
          >
            <Button
              fullWidth
              onClick={() => {
                navigate("/app" + page.page_url);
              }}
            >
              <BlockStack>
                <div style={{ paddingTop: "4px", paddingBottom: "4px" }}>
                  <Text variant="headingMd" as="h6" fontWeight="semibold">
                    {page.page_name || "page_name"}
                  </Text>
                  <p>{page.description || "description"}</p>
                </div>
              </BlockStack>
            </Button>
          </Grid.Cell>
        ))}
      </Grid>
    </Page>
  );
}
