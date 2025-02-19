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
  Banner,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      fulfillment_task: "",
      description: "",
      sequence: "",
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

    return redirect("/app/fulfillmenttask");
  }

  const data = {
    fulfillment_task: formData.fulfillment_task,
    description: formData.description,
    sequence: formData.sequence,
    status: formData.status,
  };
  // Validate required fields
  const errors = {};
  if (!data.fulfillment_task)
    errors.fulfillment_task = "Fulfillment Task is required";
  if (!data.sequence) errors.sequence = "Sequence is required";
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
            type: "fulfillment_task",
            fields: [
              { key: "fulfillment_task", value: data.fulfillment_task },
              { key: "description", value: data.description },
              { key: "sequence", value: data.sequence },
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
    return redirect(
      `/app/fulfillmenttaskid/${NewRecordID}?successMessage=Record created successfully`,
    );
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
              { key: "fulfillment_task", value: data.fulfillment_task },
              { key: "description", value: data.description },
              { key: "sequence", value: data.sequence },
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

    return redirect(
      `/app/fulfillmenttaskid/${params.id}?successMessage=Record updated successfully`,
    );
  }

  return redirect(`/app/fulfillmenttaskid/${params.id}`);
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
      backAction={{ content: "Fulfillment Tasks", url: "/app/fulfillmenttask" }}
      title={formState.id ? "Edit Fulfillment Task" : "Add Frech page"}
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
              label="Fulfillment Task"
              value={formState.fulfillment_task}
              onChange={(value) =>
                setFormState({ ...formState, fulfillment_task: value })
              }
              error={errors.fulfillment_task}
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
              label="Sequence"
              value={formState.sequence}
              onChange={(value) =>
                setFormState({ ...formState, sequence: value })
              }
              error={errors.sequence}
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
              value={formState.status}
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
