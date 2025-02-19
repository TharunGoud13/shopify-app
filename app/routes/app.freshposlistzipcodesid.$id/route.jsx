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
  InlineStack,
  Grid,
  Divider,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { DeleteIcon } from "@shopify/polaris-icons";
import customStyles from "../../styles/shared.css?url";

export const links = () => [{ rel: "stylesheet", href: customStyles }];

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      pos_code: "",
      description: "",
      page_url: "",
      status: "true",
      storename: "",
      created_user: "",
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

  // Load all related ZIP codes (metaobjects of type pos_zip_codes)
  const zipResponse = await admin.graphql(
    `{
      metaobjects(type: "pos_zip_codes", first: 250, query: "display_name:${params.id}") {
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
  const zipJsonResponse = await zipResponse.json();
  const zipData = zipJsonResponse.data.metaobjects.edges.map((edge) => {
    const fields = edge.node.fields.reduce((acc, field) => {
      acc[field.key] = field.jsonValue || "";
      return acc;
    }, {});
    return { id: edge.node.id, ...fields };
  });

  return json({ posItem: metaobject, zipCodes: zipData });
}

export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const formData = Object.fromEntries(await request.formData());

  const posData = {
    pos_code: formData.pos_code,
    description: formData.description,
    page_url: formData.page_url,
    status: formData.status,
    storename: formData.storename,
    created_user: formData.created_user,
  };

  const zipCodes = JSON.parse(formData.zipCodes || "[]");

  const errors = {};
  if (!posData.pos_code) errors.pos_code = "Page Name is required";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  const zipCodeErrors = [];

  for (let zip of zipCodes) {
    if (zip.zip_code && zip._action) {
      if (zip._action === "delete" && zip.id) {
        const deleteResponse = await admin.graphql(
          `mutation DeleteMetaobject($id: ID!) {
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
            variables: { id: zip.id },
          },
        );
        const deleteJson = await deleteResponse.json();
        if (deleteJson.data.metaobjectDelete.userErrors?.length) {
          deleteJson.data.metaobjectDelete.userErrors.forEach((error) =>
            zipCodeErrors.push(error.message),
          );
        }
      } else if (zip._action === "update" && zip.id) {
        const updateResponse = await admin.graphql(
          `mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
            metaobjectUpdate(id: $id, metaobject: $metaobject) {
              metaobject {
                fields {
                  key
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
              id: zip.id,
              metaobject: {
                fields: [
                  { key: "zip_code", value: zip.zip_code },
                  { key: "status", value: zip.status },
                  { key: "pos_code", value: params.id },
                ],
              },
            },
          },
        );
        const updateJson = await updateResponse.json();
        if (updateJson.data.metaobjectUpdate.userErrors?.length) {
          updateJson.data.metaobjectUpdate.userErrors.forEach((error) =>
            zipCodeErrors.push(error.message),
          );
        }
      } else if (zip._action === "create") {
        const createResponse = await admin.graphql(
          `mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
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
                type: "pos_zip_codes",
                fields: [
                  { key: "zip_code", value: zip.zip_code },
                  { key: "status", value: zip.status },
                  { key: "pos_code", value: params.id },
                ],
              },
            },
          },
        );
        const createJson = await createResponse.json();
        if (createJson.data.metaobjectCreate.userErrors?.length) {
          createJson.data.metaobjectCreate.userErrors.forEach((error) =>
            zipCodeErrors.push(error.message),
          );
        }
      }
    }
  }

  if (zipCodeErrors.length) {
    return json({ errors: { zipCodes: zipCodeErrors } }, { status: 422 });
  }

  return redirect(
    `/app/freshposlistzipcodesid/${params.id}?successMessage=Record updated successfully`,
  );
}

export default function Form() {
  const errors = useActionData()?.errors || {};
  const { posItem, zipCodes: initialZipCodes } = useLoaderData();
  const actionData = useActionData();
  const [formState, setFormState] = useState(posItem);
  const [cleanFormState, setCleanFormState] = useState(posItem);
  const [zipCodes, setZipCodes] = useState(initialZipCodes);
  const [cleanZipCodes, setCleanZipCodes] = useState(
    JSON.stringify(initialZipCodes),
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const shopify = useAppBridge();

  const submit = useSubmit();
  const navigate = useNavigate();
  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";

  useEffect(() => {
    const isZipCodesDirty = JSON.stringify(zipCodes) !== cleanZipCodes;
    setIsDirty(isZipCodesDirty);
  }, [zipCodes, cleanZipCodes]);

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

  function handleAddZipCode() {
    setZipCodes([...zipCodes, { _action: "create", status:"true", zip_code:"" }]);
  }

  function handleDeleteZipCode(index) {
    const updatedZipCodes = [...zipCodes];
    const zip = updatedZipCodes[index];
    if (zip.id) {
      updatedZipCodes[index]._action = "delete";
    } else {
      updatedZipCodes.splice(index, 1);
    }
    setZipCodes(updatedZipCodes);
  }

  function handleZipCodeChange(key, value, index) {
    const updatedZipCodes = [...zipCodes];
    updatedZipCodes[index][key] = value;
    updatedZipCodes[index]._action = updatedZipCodes[index].id
      ? "update"
      : "create";
    setZipCodes(updatedZipCodes);
  }

  function handleSave() {
    const payload = { ...formState, zipCodes: JSON.stringify(zipCodes) };
    submit(payload, { method: "post" });
    setCleanFormState({ ...formState, zipCodes });
    setCleanZipCodes(JSON.stringify(zipCodes));
  }

  return (
    <Page
      backAction={{
        content: "zip code and state manager",
        url: "/app/freshposlist",
      }}
      title={
        formState.id
          ? `Zip code and state manager (${posItem.pos_code})`
          : "Add zip code and state manager"
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
            <BlockStack gap="300">
              <h3>ZIP Codes</h3>
              <div className="zipcodeitems">
                {zipCodes.map((zip, index) => {
                  if (zip._action === "delete") return;
                  return (
                    <BlockStack key={index} gap="100" alignment="center">
                      <Grid columns={{ xs: 6, sm: 6, md: 12, lg: 12, xl: 12 }}>
                        <Grid.Cell
                          columnSpan={{ xs: 6, sm: 6, md: 5, lg: 5, xl: 5 }}
                        >
                          <TextField
                            label="ZIP Code"
                            value={zip.zip_code}
                            onChange={(value) =>
                              handleZipCodeChange("zip_code", value, index)
                            }
                          />
                        </Grid.Cell>
                        <Grid.Cell
                          columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}
                        >
                          <Select
                            label="Status"
                            options={[
                              { label: "Active", value: "true" },
                              { label: "Inactive", value: "false" },
                            ]}
                            onChange={(value) =>
                              handleZipCodeChange("status", value, index)
                            }
                            value={
                              !!zip.status && zip.status !== "false"
                                ? "true"
                                : "false"
                            }
                          />
                        </Grid.Cell>
                        <Grid.Cell
                          columnSpan={{ xs: 6, sm: 6, md: 1, lg: 1, xl: 1 }}
                        >
                          <div className="deleteZipCode">
                            <Button
                              icon={DeleteIcon}
                              onClick={() => handleDeleteZipCode(index)}
                              tone="critical"
                            >
                              <span className="text">remove</span>
                            </Button>
                          </div>
                        </Grid.Cell>
                      </Grid>
                      <div style={{ height: "5px" }}></div>
                      <Divider borderColor="border" />
                    </BlockStack>
                  );
                })}
              </div>
              <Button onClick={handleAddZipCode} variant="primary">
                Add ZIP Code
              </Button>
            </BlockStack>
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
