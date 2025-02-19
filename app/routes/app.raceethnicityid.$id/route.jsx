// edit.tsx
import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
  useSearchParams,
} from "@remix-run/react";
import {
  Page,
  Card,
  TextField,
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
      race_ethnicity: "",
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

    return redirect("/app/raceethnicity");
  }

  const data = {
    race_ethnicity: formData.race_ethnicity,
    status: formData.status,
  };

  if (!data.race_ethnicity)
    return json(
      { errors: { race_ethnicity: "Race/Ethnicity is required" } },
      { status: 422 },
    );

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
            code
          }
        }
      }`,
      {
        variables: {
          metaobject: {
            type: "race_ethnicity",
            fields: [
              { key: "race_ethnicity", value: data.race_ethnicity },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    const jsonResponse = await response.json();
    const NewRecordID = jsonResponse.data.metaobjectCreate.metaobject.id
      .split("/")
      .pop();
    return redirect(
      `/app/raceethnicityid/${NewRecordID}?successMessage=Record created successfully`,
    );
  }

  if (params.id !== "new") {
    const response = await admin.graphql(
      `#graphql
      mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
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
          id: `gid://shopify/Metaobject/${params.id}`,
          metaobject: {
            fields: [
              { key: "race_ethnicity", value: data.race_ethnicity },
              { key: "status", value: data.status },
            ],
          },
        },
      },
    );

    return redirect(
      `/app/raceethnicityid/${params.id}?successMessage=Record updated successfully`,
    );
  }
}

export default function Form() {
  const errors = useActionData()?.errors || {};
  const data = useLoaderData();
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const submit = useSubmit();
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  useEffect(() => {
    const message = searchParams.get("successMessage");
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

  function handleSave() {
    submit(formState, { method: "post" });
    setCleanFormState({ ...formState });
  }

  return (
    <Page
      backAction={{ content: "Race/Ethnicity", url: "/app/raceethnicity" }}
      title={formState.id ? "Edit Race/Ethnicity" : "Add Race/Ethnicity"}
    >
      {successMessage && <Banner title={successMessage} tone="success" />}
      <Card>
        <TextField
          label="Race/Ethnicity"
          value={formState.race_ethnicity}
          onChange={(value) =>
            setFormState({ ...formState, race_ethnicity: value })
          }
          error={errors.race_ethnicity}
        />
        <Select
          label="Status"
          options={[
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ]}
          onChange={(value) => setFormState({ ...formState, status: value })}
          value={formState.status || "false"}
        />
      </Card>
      <PageActions
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          disabled: !isDirty,
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
