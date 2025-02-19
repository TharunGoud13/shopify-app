import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useState, useCallback } from "react";
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
  Popover,
  ColorPicker,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      order_status_title: "",
      description: "",
      colour_code: "",
      message_to_admin: "",
      message_to_customer: "",
      status_icon: "",
      status: "true",
      sequence_no: "",
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

    return redirect("/app/customorderstatus");
  }

  const data = {
    order_status_title: formData.order_status_title,
    description: formData.description,
    colour_code: formData.colour_code,
    message_to_admin: formData.message_to_admin,
    message_to_customer: formData.message_to_customer,
    status_icon: formData.status_icon,
    status: formData.status,
    sequence_no: formData.sequence_no,
  };

  // Validate required fields
  const errors = {};
  if (!data.order_status_title)
    errors.order_status_title = "Status Title is required";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  // Check for duplicate `order_status_title`
  const query = `display_name:'${data.order_status_title}'`;
  const duplicateCheckResponse = await admin.graphql(
    `{
       metaobjects(type: "custom_order_status", query: ${JSON.stringify(query)}, first: 10) {
         edges {
           node {
             id
             fields {
               key
               value
             }
           }
         }
       }
     }`,
  );

  const duplicateCheckJson = await duplicateCheckResponse.json();
  const existingMetaobjects =
    duplicateCheckJson?.data?.metaobjects?.edges || [];

  const isDuplicate = existingMetaobjects.some((metaobject) => {
    const isDifferentRecord =
      params.id === "new" ||
      metaobject.node.id !== `gid://shopify/Metaobject/${params.id}`;
    return isDifferentRecord;
  });

  if (isDuplicate) {
    errors.order_status_title = "Order Status Title already exists";
    return json({ errors }, { status: 422 });
  }

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
            type: "custom_order_status",
            fields: [
              { key: "order_status_title", value: data.order_status_title },
              { key: "description", value: data.description },
              { key: "colour_code", value: data.colour_code },
              { key: "message_to_admin", value: data.message_to_admin },
              { key: "message_to_customer", value: data.message_to_customer },
              { key: "status_icon", value: data.status_icon },
              { key: "status", value: data.status },
              { key: "sequence_no", value: data.sequence_no },
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
      `/app/customorderstatusid/${NewRecordID}?successMessage=Record created successfully`,
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
              { key: "order_status_title", value: data.order_status_title },
              { key: "description", value: data.description },
              { key: "colour_code", value: data.colour_code },
              { key: "message_to_admin", value: data.message_to_admin },
              { key: "message_to_customer", value: data.message_to_customer },
              { key: "status_icon", value: data.status_icon },
              { key: "status", value: data.status },
              { key: "sequence_no", value: data.sequence_no },
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
      `/app/customorderstatusid/${params.id}?successMessage=Record updated successfully`,
    );
  }

  return redirect(`/app/customorderstatusid/${params.id}`);
}

export default function Form() {
  const errors = useActionData()?.errors || {};
  const data = useLoaderData();
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState("");
  const shopify = useAppBridge();

  const submit = useSubmit();
  const navigate = useNavigate();
  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";

  const [popActive, setPopActive] = useState(false);
  const [color, setColor] = useState({
    hue: 120,
    brightness: 1,
    saturation: 1,
  });
  const [cleanColor, setCleanColor] = useState("");
  const toggleActive = useCallback(() => setPopActive((active) => !active), []);

  const isDirty =
    JSON.stringify(formState) !== JSON.stringify(cleanFormState) ||
    JSON.stringify(formState.colour_code) !== cleanColor;

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

  useEffect(() => {
    if (!formState.colour_code) return;
    const [hue, brightness, saturation] = formState.colour_code
      .split(",")
      .map(parseFloat);

    setCleanColor(
      JSON.stringify({
        hue: hue,
        brightness: brightness,
        saturation: saturation,
      }),
    );

    setColor({ hue: hue, brightness: brightness, saturation: saturation });
  }, []);

  function handleSave() {
    const { hue, brightness, saturation } = color;
    submit(
      { ...formState, colour_code: `${hue},${brightness},${saturation}` },
      { method: "post" },
    );
    setCleanFormState({ ...formState });
    setCleanColor(JSON.stringify(formState.colour_code));
  }

  return (
    <Page
      backAction={{
        content: "Custom Order Status",
        url: "/app/customorderstatus",
      }}
      title={
        formState.id ? "Edit Custom Order Status" : "Add Custom Order Status"
      }
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
              label="Order Status Title"
              value={formState.order_status_title}
              onChange={(value) =>
                setFormState({ ...formState, order_status_title: value })
              }
              error={errors.order_status_title}
            />
            <TextField
              label="Sequence No"
              value={formState.sequence_no}
              onChange={(value) =>
                setFormState({ ...formState, sequence_no: value })
              }
              error={errors.sequence_no}
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
            <div>
              <div class="Polaris-Labelled__LabelWrapper">
                <div class="Polaris-Label">
                  <label class="Polaris-Label__Text">
                    <span class="Polaris-Text--root Polaris-Text--bodyMd">
                      Colour Code
                    </span>
                  </label>
                </div>
              </div>
              <Popover
                active={popActive}
                activator={
                  <Button onClick={toggleActive} disclosure>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        backgroundColor: `hsl(${parseFloat(color?.hue)}, ${parseFloat(color?.saturation) * 100}%, ${parseFloat(color?.brightness) * 100}%)`,
                        marginRight: "6px",
                        // border: "1px solid #000",
                        verticalAlign: "middle",
                        borderRadius: "2px",
                      }}
                    />

                    {`${parseFloat(color?.hue)?.toFixed(2)}, ${parseFloat(color?.brightness)?.toFixed(2)}, ${parseFloat(color?.saturation)?.toFixed(2)}`}
                  </Button>
                }
                autofocusTarget="first-node"
                onClose={toggleActive}
              >
                <div style={{ padding: "7px" }}>
                  <ColorPicker onChange={setColor} color={color} />
                </div>
              </Popover>
            </div>
            <TextField
              label="Message To Admin"
              value={formState.message_to_admin}
              onChange={(value) =>
                setFormState({ ...formState, message_to_admin: value })
              }
              error={errors.message_to_admin}
            />
            <TextField
              label="Message To Customer"
              value={formState.message_to_customer}
              onChange={(value) =>
                setFormState({ ...formState, message_to_customer: value })
              }
              error={errors.message_to_customer}
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
            <TextField
              label="Status Icon"
              value={formState.status_icon}
              onChange={(value) =>
                setFormState({ ...formState, status_icon: value })
              }
              error={errors.status_icon}
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
