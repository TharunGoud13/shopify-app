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
      api_name: "",
      api_type: "APi",
      description: "",
      api_url: "",
      key: "",
      secret: "",
      status: "true",
    });
  }

  const response = await admin.graphql(
    `{
      metaobject(id: "gid://shopify/Metaobject/${params.id}") {
        id
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
          }
        }
      }`,
      {
        variables: { id: `gid://shopify/Metaobject/${params.id}` },
      },
    );

    const jsonResponse = await response.json();

    if (jsonResponse.data.metaobjectDelete.userErrors.length) {
      return json(
        {
          errors: jsonResponse.data.metaobjectDelete.userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    return redirect("/app/freshapisettings");
  }

  const data = {
    api_name: formData.api_name,
    api_type: formData.api_type,
    description: formData.description,
    api_url: formData.api_url,
    key: formData.key,
    secret: formData.secret,
    status: formData.status,
  };

  const errors = {};
  if (!data.api_name) errors.api_name = "API Name is required";
  if (!data.api_url) errors.api_url = "API URL is required";

  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  if (params.id === "new") {
    const response = await admin.graphql(
      `#graphql
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metaobject: {
            type: "fresh_api_settings",
            fields: [
              { key: "api_name", value: data.api_name },
              { key: "api_type", value: data.api_type },
              { key: "description", value: data.description },
              { key: "api_url", value: data.api_url },
              { key: "key", value: data.key },
              { key: "secret", value: data.secret },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();

    if (jsonResponse.data.metaobjectCreate.userErrors.length) {
      return json(
        {
          errors: jsonResponse.data.metaobjectCreate.userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    const newId = jsonResponse.data.metaobjectCreate.metaobject.id
      .split("/")
      .pop();
    return redirect(
      `/app/freshapisettingsid/${newId}?successMessage=API Setting created successfully`,
    );
  }

  if (params.id !== "new") {
    const response = await admin.graphql(
      `#graphql
      mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Metaobject/${params.id}`,
          metaobject: {
            fields: [
              { key: "api_name", value: data.api_name },
              { key: "api_type", value: data.api_type },
              { key: "description", value: data.description },
              { key: "api_url", value: data.api_url },
              { key: "key", value: data.key },
              { key: "secret", value: data.secret },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();

    if (jsonResponse.data.metaobjectUpdate.userErrors.length) {
      return json(
        {
          errors: jsonResponse.data.metaobjectUpdate.userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    return redirect(
      `/app/freshapisettingsid/${params.id}?successMessage=API Setting updated successfully`,
    );
  }

  return redirect(`/app/freshapisettingsid/${params.id}`);
}

export default function EditApiSetting() {
  const data = useLoaderData();
  const errors = useActionData()?.errors || {};
  const shopify = useAppBridge();
  const [formState, setFormState] = useState(data);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [successMessage, setSuccessMessage] = useState("");

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

  const handleSave = () => submit(formState, { method: "post" });

  return (
    <Page
      title={formState.id ? "Edit API Setting" : "Add API Setting"}
      backAction={{ content: "API Settings", url: "/app/freshapisettings" }}
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
      <Card>
        <BlockStack gap="500">
          <TextField
            label="API Name"
            value={formState.api_name}
            onChange={(value) =>
              setFormState({ ...formState, api_name: value })
            }
            error={errors.api_name}
          />
          <Select
            label="API Type"
            options={[
              { label: "APi", value: "APi" },
              { label: "Web Hook", value: "Web Hook" },
            ]}
            value={formState.api_type}
            onChange={(value) =>
              setFormState({ ...formState, api_type: value })
            }
          />
          <TextField
            label="Description"
            value={formState.description}
            onChange={(value) =>
              setFormState({ ...formState, description: value })
            }
            multiline
          />
          <TextField
            label="API URL"
            value={formState.api_url}
            onChange={(value) => setFormState({ ...formState, api_url: value })}
            error={errors.api_url}
          />
          <TextField
            label="Key"
            value={formState.key}
            onChange={(value) => setFormState({ ...formState, key: value })}
          />
          <TextField
            label="Secret"
            value={formState.secret}
            onChange={(value) => setFormState({ ...formState, secret: value })}
            type="password"
          />
          <Select
            label="Status"
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
            ]}
            value={formState.status}
            onChange={(value) => setFormState({ ...formState, status: value })}
          />
        </BlockStack>
      </Card>
      <PageActions
        primaryAction={{ content: "Save", onAction: handleSave }}
        secondaryActions={[
          {
            content: "Delete",
            destructive: true,
            onAction: () =>
              submit({ action: "delete" }, { method: "post", replace: true }),
            disabled: !formState.id,
          },
        ]}
      />
    </Page>
  );
}
