import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Card,
  TextField,
  Button,
  InlineError,
  BlockStack,
  PageActions,
  Select,
  Layout,
  Checkbox,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  const pagesResponse = await admin.graphql(
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

  const pagesJsonResponse = await pagesResponse.json();

  const pagesData = pagesJsonResponse.data.metaobjects.edges.map((edge) => {
    const fields = edge.node.fields.reduce((acc, field) => {
      acc[field.key] = field.jsonValue || "";
      return acc;
    }, {});
    return {
      id: edge.node.id,
      handle: edge.node.handle,
      ...fields,
    };
  });

  if (params.id === "new") {
    return json({
      pages: pagesData,
      data: {
        custom_role: "",
        status: "true",
        description: "",
      },
    });
  }

  const response = await admin.graphql(
    `{
      metaobject(id: "gid://shopify/Metaobject/${params.id}") {
        id
        handle
        fields {
          key
          value
          jsonValue
        }
      }
    }`,
  );

  const jsonResponse = await response.json();

  const metaobject = jsonResponse.data.metaobject.fields.reduce(
    (acc, field) => {
      acc[field.key] = field.jsonValue;
      return acc;
    },
    {},
  );

  metaobject["id"] = jsonResponse.data.metaobject.id;

  return json({
    pages: pagesData,
    data: metaobject,
  });
}


export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const formData = Object.fromEntries(await request.formData());

  const data = {
    customrole_permissions: formData.customrole_permissions
      ? formData.customrole_permissions.split(",")
      : [],
  };

  // Validate required fields
  const errors = {};
  if (!data.customrole_permissions)
    errors.customrole_permissions = "Role Permissions is required";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  console.log("data.customrole_permissions", data.customrole_permissions);
  if (params.id !== "new") {
    const response = await admin.graphql(
      `#graphql
      mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            fields {
                  key
                  value
                  jsonValue
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          id: "gid://shopify/Metaobject/" + params.id,
          metaobject: {
            fields: [
              {
                key: "customrole_permissions",
                value: JSON.stringify(data.customrole_permissions),
              },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();
    console.log(
      "uopdate jsonResponse",
      jsonResponse.data.metaobjectUpdate.userErrors,
    );
    // Handle GraphQL errors
    const { userErrors } = jsonResponse.data.metaobjectUpdate;
    if (userErrors && userErrors.length) {
      return json(
        {
          errors: userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    return redirect(`/app/customrolepermissionid/${params.id}`);
  }

  return redirect(`/app/customrolepermissionid/${params.id}`);
}

export default function UserCustomRoleForm() {
  const errors = useActionData()?.errors || {};
  const shopify = useAppBridge();

  const { pages, data } = useLoaderData();
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const [selectedPages, setSelectedPages] = useState(
    formState.customrole_permissions || [],
  );

  // const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);
  const isDirty =
    JSON.stringify(formState) !== JSON.stringify(cleanFormState) ||
    JSON.stringify(selectedPages) !==
      JSON.stringify(formState.customrole_permissions);

  const submit = useSubmit();
  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";

  useEffect(() => {
    const errorsLength = Object.keys(errors).length;

    if (errorsLength) {
      const errorMessages = Object.entries(errors)
        .map(([key, message]) => `${key}: ${message}`)
        .join(", ");

      shopify.toast.show(`There are errors: ${errorMessages}`, {
        isError: true,
      });
    }
  }, [errors, shopify]);

  function handleCheckboxChange(pageId) {
    if (selectedPages.includes(pageId)) {
      // If the page is already selected, remove it
      setSelectedPages((prev) => prev.filter((id) => id !== pageId));
    } else {
      // Otherwise, add it to the selected list
      setSelectedPages((prev) => [...prev, pageId]);
    }
  }

  function handleSave() {
    console.log("selectedPages", selectedPages);
    submit(
      {
        customrole_permissions: selectedPages.join(","),
      },
      { method: "post" },
    );
    setCleanFormState({ ...formState, customrole_permissions: selectedPages });
  }

  return (
    <Page
      backAction={{ content: "Custom Roles", url: "/app/customrole" }}
      title={`Edit Permission for (${formState.custom_role})`}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="500">
            <Layout>
              <Layout.Section>
                <BlockStack spacing="tight">
                  {/* <Stack vertical spacing="loose"> */}
                  Select Pages Permissions
                  {pages.map((page) => {
                    return (
                      <Checkbox
                        key={page.page_name}
                        label={page.page_name || "Untitled Page"}
                        checked={selectedPages.includes(page.page_name)}
                        onChange={() => handleCheckboxChange(page.page_name)}
                      />
                    );
                  })}
                  {/* </Stack> */}
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>
      </BlockStack>
      <PageActions
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading: isSaving,
          disabled: !isDirty || isSaving,
        }}
      />
    </Page>
  );
}
