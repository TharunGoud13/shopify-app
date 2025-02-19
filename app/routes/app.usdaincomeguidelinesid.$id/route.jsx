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
      no_of_people_in_house_hold: "",
      annual: "",
      monthly: "",
      weekly: "",
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
      `mutation DeleteMetaobject($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
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

    return redirect("/app/usdaincomeguidelines");
  }

  const data = {
    no_of_people_in_house_hold: formData.no_of_people_in_house_hold,
    annual: formData.annual,
    monthly: formData.monthly,
    weekly: formData.weekly,
    status: formData.status,
  };

  const errors = {};
  if (!data.no_of_people_in_house_hold)
    errors.no_of_people_in_house_hold = "This field is required";
  if (!data.annual) errors.annual = "Annual income is required";
  if (!data.monthly) errors.monthly = "monthly income is required";
  if (!data.weekly) errors.weekly = "weekly income is required";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  if (params.id === "new") {
    const response = await admin.graphql(
      `mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
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
            type: "usda_income_guidelines",
            fields: [
              {
                key: "no_of_people_in_house_hold",
                value: data.no_of_people_in_house_hold,
              },
              { key: "annual", value: data.annual },
              { key: "monthly", value: data.monthly },
              { key: "weekly", value: data.weekly },
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
      .split("/")
      .pop();
    return redirect(
      `/app/usdaincomeguidelinesid/${NewRecordID}?successMessage=Record created successfully`,
    );
  }

  if (params.id !== "new") {
    const response = await admin.graphql(
      `mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
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
          id: `gid://shopify/Metaobject/${params.id}`,
          metaobject: {
            fields: [
              {
                key: "no_of_people_in_house_hold",
                value: data.no_of_people_in_house_hold,
              },
              { key: "annual", value: data.annual },
              { key: "monthly", value: data.monthly },
              { key: "weekly", value: data.weekly },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();
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
      `/app/usdaincomeguidelinesid/${params.id}?successMessage=Record updated successfully`,
    );
  }
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
      backAction={{
        content: "USDA Guidelines",
        url: "/app/usdaincomeguidelines",
      }}
      title={formState.id ? "Edit USDA Guideline" : "Add USDA Guideline"}
    >
      {!!successMessage && (
        <Banner
          title={successMessage}
          tone="success"
          onDismiss={() => setSuccessMessage("")}
        />
      )}
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="500">
            <TextField
              label="No. of People in Household"
              value={formState.no_of_people_in_house_hold}
              onChange={(value) =>
                setFormState({
                  ...formState,
                  no_of_people_in_house_hold: value,
                })
              }
              error={errors.no_of_people_in_house_hold}
            />
            <TextField
              label="Annual Income"
              value={formState.annual}
              onChange={(value) =>
                setFormState({ ...formState, annual: value })
              }
              error={errors.annual}
            />
            <TextField
              label="Monthly Income"
              value={formState.monthly}
              onChange={(value) =>
                setFormState({ ...formState, monthly: value })
              }
              error={errors.monthly}
            />
            <TextField
              label="Weekly Income"
              value={formState.weekly}
              onChange={(value) =>
                setFormState({ ...formState, weekly: value })
              }
              error={errors.weekly}
            />
            <Select
              label="Status"
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
              value={formState.status}
              onChange={(value) =>
                setFormState({ ...formState, status: value })
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
