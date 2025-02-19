import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  Autocomplete,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request, params }) {
  const { admin, session } = await authenticate.admin(request);

  const posResp = await admin.graphql(
    `{
      metaobjects(type: "freshposlist", first: 250) {
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

  const posjsonResp = await posResp.json();

  const posData = posjsonResp.data.metaobjects.edges.map((edge) => {
    const fields = edge.node.fields.reduce((acc, field) => {
      acc[field.key] = field.jsonValue || "";
      return acc;
    }, {});
    return {
      value: edge.node.id.split("/").pop(),
      label: fields["pos_name"],
      ...fields,
    };
  });

  if (params.id === "new") {
    return json({
      data: {
        storage_title: "",
        store_name: "",
        pos_name: "",
        storage_type: "",
        size: "",
        status: "true",
      },
      store_name: session?.shop,
      posData: posData,
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

  return json({
    data: metaobject,
    store_name: session?.shop,
    posData: posData,
  });
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

    return redirect("/app/storage");
  }

  const data = {
    storage_title: formData.storage_title,
    store_name: formData.store_name,
    pos_name: formData.pos_name,
    storage_type: formData.storage_type,
    size: formData.size,
    status: formData.status,
  };

  // Validate required fields
  const errors = {};
  if (!data.storage_title) errors.storage_title = "Storage Title is required";
  if (!data.store_name) errors.store_name = "Store Name is required";
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
            type: "storage",
            fields: [
              { key: "storage_title", value: data.storage_title },
              { key: "store_name", value: data.store_name },
              { key: "pos_name", value: data.pos_name },
              { key: "storage_type", value: data.storage_type },
              { key: "size", value: data.size },
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
      `/app/storageid/${NewRecordID}?successMessage=Record created successfully`,
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
              { key: "storage_title", value: data.storage_title },
              { key: "store_name", value: data.store_name },
              { key: "pos_name", value: data.pos_name },
              { key: "storage_type", value: data.storage_type },
              { key: "size", value: data.size },
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
      `/app/storageid/${params.id}?successMessage=Record updated successfully`,
    );
  }

  return redirect(`/app/storageid/${params.id}`);
}

export default function Form() {
  const errors = useActionData()?.errors || {};
  const { data, posData, store_name } = useLoaderData();
  const [formState, setFormState] = useState({
    ...data,
    store_name: store_name,
  });
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

  // Autocomplete logic for pos_name
  const deselectedOptions = useMemo(() => posData, []);
  const [selectedPos, setSelectedPos] = useState([formState.pos_name || ""]);
  const [inputValue, setInputValue] = useState(formState.pos_name || "");
  const [options, setOptions] = useState(deselectedOptions);
  const [loading, setLoading] = useState(false);

  const updateText = useCallback(
    (value) => {
      setInputValue(value);
      setLoading(true);

      setTimeout(() => {
        if (value === "") {
          setOptions(deselectedOptions);
          setLoading(false);
          return;
        }
        const filterRegex = new RegExp(value, "i");
        const resultOptions = deselectedOptions.filter((option) =>
          option.label.match(filterRegex),
        );
        setOptions(resultOptions);
        setLoading(false);
      }, 300);
    },
    [deselectedOptions],
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedText = selected.map((selectedItem) => {
        const matchedOption = options.find((option) =>
          option.value.match(selectedItem),
        );
        return matchedOption && matchedOption.label;
      });

      setSelectedPos(selected);
      setInputValue(selectedText[0] || "");

      setFormState({ ...formState, pos_name: selectedText[0] || "" });
    },
    [options, formState],
  );

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label="POS Name"
      value={inputValue}
      placeholder="Search POS"
      autoComplete="off"
    />
  );

  function handleSave() {
    submit(formState, { method: "post" });
    setCleanFormState({ ...formState });
  }

  return (
    <Page
      backAction={{ content: "Frech Pages", url: "/app/storage" }}
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
              label="Store Name"
              value={formState.store_name}
              onChange={(value) =>
                setFormState({ ...formState, store_name: store_name })
              }
              error={errors.store_name}
              readOnly={true}
            />
            <Autocomplete
              options={options}
              selected={selectedPos}
              onSelect={updateSelection}
              loading={loading}
              textField={textField}
            />
            <TextField
              label="Storage Title"
              value={formState.storage_title}
              onChange={(value) =>
                setFormState({ ...formState, storage_title: value })
              }
              error={errors.storage_title}
            />
            <Select
              label="Storage Type"
              options={[
                { label: "Fridge", value: "fridge" },
                { label: "Freezer", value: "freezer" },
                { label: "Rack", value: "rack" },
              ]}
              onChange={(value) =>
                setFormState({ ...formState, storage_type: value })
              }
              value={formState.storage_type}
              error={errors.storage_type}
            />
            <TextField
              label="Storage Size"
              value={formState.size}
              onChange={(value) => setFormState({ ...formState, size: value })}
              error={errors.size}
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
