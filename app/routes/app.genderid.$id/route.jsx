// app/gender/edit.jsx
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
      gender: "",
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

    return redirect("/app/gender");
  }

  const data = {
    gender: formData.gender,
    status: formData.status,
  };

  const errors = {};
  if (!data.gender) errors.gender = "This field is required";

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
            type: "gender",
            fields: [
              {
                key: "gender",
                value: data.gender,
              },
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
      `/app/genderid/${NewRecordID}?successMessage=Record created successfully`,
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
                key: "gender",
                value: data.gender,
              },
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
      `/app/genderid/${params.id}?successMessage=Record updated successfully`,
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
      backAction={{
        content: "Genders",
        url: "/app/gender",
      }}
      title={formState.id ? "Edit Gender" : "Add Gender"}
    >
      {!!successMessage && (
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
              label="Gender"
              value={formState.gender}
              onChange={(value) =>
                setFormState({
                  ...formState,
                  gender: value,
                })
              }
              error={errors.gender}
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
