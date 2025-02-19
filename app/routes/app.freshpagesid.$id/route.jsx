import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
  useNavigation,
  useSearchParams,
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
  Banner
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      page_name: "",
      description: "",
      page_url: "",
      fields: "",
      created_user: "",
      status: "true",
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
      acc[field.key] = field.jsonValue || "";
      return acc;
    },
    {},
  );

  metaobject["id"] = jsonResponse.data.metaobject.id;

  return json(metaobject);
}

export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const formData = Object.fromEntries(await request.formData());

  const actionType = formData.action || "save";

  if (actionType === "delete" && params.id) {
    const response = await admin.graphql(
      `#graphql
      mutation DeleteMetaobject($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Metaobject/${params.id}`,
        },
      },
    );

    const jsonResponse = await response.json();

    const { userErrors } = jsonResponse.data.metaobjectDelete;
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

    return redirect("/app/freshpages");
  }

  const data = {
    page_name: formData.page_name,
    description: formData.description,
    page_url: formData.page_url,
    fields: formData.fields,
    created_user: formData.created_user,
    status: formData.status,
  };

  // Validate required fields
  const errors = {};
  if (!data.page_name) errors.page_name = "Page Name is required";
  if (!data.page_url) errors.page_url = "Page URL is required";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  // Update or create logic
  if (params.id === "new") {
    const response = await admin.graphql(
      `#graphql
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
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
          metaobject: {
            type: "freshpages",
            fields: [
              { key: "page_name", value: data.page_name },
              { key: "description", value: data.description },
              { key: "page_url", value: data.page_url },
              { key: "fields", value: data.fields },
              { key: "created_user", value: data.created_user },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();

    const { userErrors } = jsonResponse.data.metaobjectCreate;
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

    const NewRecordID = jsonResponse.data.metaobjectCreate.metaobject.id
      ? jsonResponse.data.metaobjectCreate.metaobject.id.split("/").pop()
      : "";
    return redirect(`/app/freshpagesid/${NewRecordID}?successMessage=Record created successfully`);
  }

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
              { key: "page_name", value: data.page_name },
              { key: "description", value: data.description },
              { key: "page_url", value: data.page_url },
              { key: "fields", value: data.fields },
              { key: "created_user", value: data.created_user },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();
 
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

    return redirect(`/app/freshpagesid/${params.id}?successMessage=Record updated successfully`);
  }

  return redirect(`/app/freshpagesid/${params.id}`);
}

export default function Form() {
  const errors = useActionData()?.errors || {};
  const data = useLoaderData();
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState("");
  const shopify = useAppBridge();
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const submit = useSubmit();
  const navigate = useNavigate();
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

  useEffect(() => {
    const message = searchParams.get("successMessage");
    if (message) {
      setSuccessMessage(message);
      searchParams.delete("successMessage");
      navigate(
        {
          pathname: window.location.pathname,
          search: searchParams.toString(),
        },
        { replace: true },
      );
    }
  }, [searchParams, navigate]);

  function handleSave() {
    submit(formState, { method: "post" });
    setCleanFormState({ ...formState });
  }

  return (
    <Page
      backAction={{ content: "Frech Pages", url: "/app/freshpages" }}
      title={formState.id ? "Edit Frech page" : "Add Frech page"}
    >
      {!!successMessage && successMessage !== "" && (
        <>
          <Banner
            title={successMessage}
            tone="success"
            onDismiss={() => setSuccessMessage("")}
          />
          <div style={{ height: "20px" }}></div>
        </>
      )}
      {errors && errors.length && (
        <>
          <Banner
            title="Errors in the form"
            tone="critical"
            onDismiss={() => setShowBanner(false)}
          >
            {Object.keys(errors).map((key) => (
              <p key={key}>{`${key}: ${errors[key]}`}</p>
            ))}
          </Banner>
          <div style={{ height: "20px" }}></div>
        </>
      )}

      <BlockStack gap="500">
        <Card>
          <BlockStack gap="500">
            <TextField
              label="Page Name"
              value={formState.page_name}
              onChange={(value) =>
                setFormState({ ...formState, page_name: value })
              }
              error={errors.page_name}
            />
            <TextField
              label="Description"
              value={formState.description}
              onChange={(value) =>
                setFormState({ ...formState, description: value })
              }
              multiline={4}
              error={errors.description}
            />
            <TextField
              label="Page URL"
              value={formState.page_url}
              onChange={(value) =>
                setFormState({ ...formState, page_url: value })
              }
              error={errors.page_url}
            />
            <TextField
              label="Fields"
              value={formState.fields}
              onChange={(value) =>
                setFormState({ ...formState, fields: value })
              }
              error={errors.fields}
            />
            <TextField
              label="created_user"
              value={formState.created_user}
              onChange={(value) =>
                setFormState({ ...formState, created_user: value })
              }
              error={errors.created_user}
            />
            <Select
              label="Status"
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
              onChange={(value) =>
                setFormState({ ...formState, status: value })
              }
              value={
                !!formState.status && formState.status !== "false"
                  ? "true"
                  : "false"
              }
            />
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
        secondaryActions={[
          {
            content: "Delete",
            destructive: true,
            disabled: !formState.id,
            onAction: () => submit({ action: "delete" }, { method: "post" }),
          },
        ]}
      />
    </Page>
  );
}
