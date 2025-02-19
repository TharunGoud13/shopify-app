import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useState, useEffect } from "react";
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
  Banner,
  BlockStack,
  PageActions,
  Select,
  InlineStack,
  Grid,
  Divider,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { DeleteIcon } from "@shopify/polaris-icons";
import customStyles from "../../styles/shared.css?url";

export const links = () => [{ rel: "stylesheet", href: customStyles }];

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  // Load all ZIP codes from the "store_zip_codes" metaobject
  const zipResponse = await admin.graphql(
    `{
      metaobjects(type: "store_zip_codes", first: 250) {
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

  return json({ zipCodes: zipData, storeName: session.shop });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = Object.fromEntries(await request.formData());

  const zipCodes = JSON.parse(formData.zipCodes || "[]");
  const storeName = formData.storeName || "";

  const zipCodeErrors = [];

  for (let zip of zipCodes) {
    console.log("zip", zip);
    if (zip.zipcode && zip._action) {
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
                  { key: "zipcode", value: zip.zipcode?.toString() },
                  { key: "status", value: zip.status },
                  { key: "storename", value: storeName },
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
                type: "store_zip_codes",
                fields: [
                  { key: "zipcode", value: zip.zipcode?.toString() },
                  { key: "status", value: zip.status },
                  { key: "storename", value: storeName },
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
    `/app/storezipcodes?successMessage=Record updated successfully`,
  );
}

export default function Form() {
  const errors = useActionData()?.errors || {};
  const { zipCodes: initialZipCodes, storeName } = useLoaderData();
  const [zipCodes, setZipCodes] = useState(initialZipCodes);
  const [cleanZipCodes, setCleanZipCodes] = useState(
    JSON.stringify(initialZipCodes),
  );
  const [duplicateError, setDuplicateError] = useState({});
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
    setZipCodes([
      ...zipCodes,
      { _action: "create", status: "true", zipcode: "" },
    ]);
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
    const payload = { zipCodes: JSON.stringify(zipCodes), storeName };
    submit(payload, { method: "post" });
    setCleanZipCodes(JSON.stringify(zipCodes));
  }

  return (
    <Page title={"Store zip code manager"}>
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
      {errors && errors.length > 0 && (
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
                            value={zip.zipcode}
                            onChange={(val) => {
                              const value = Number(
                                val.replace(/\D/g, "").slice(0, 10),
                              );
                              handleZipCodeChange("zipcode", value, index);
                              const isDuplicate = zipCodes.some(
                                (zip, i) =>
                                  i !== index && zip.zipcode === value,
                              );

                              if (isDuplicate) {
                                setDuplicateError((prev) => ({
                                  ...prev,
                                  [index]: `ZIP Code ${value} already exists.`,
                                }));
                              } else {
                                setDuplicateError((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors[index];
                                  return newErrors;
                                });
                              }
                            }}
                            error={duplicateError[index]}
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
