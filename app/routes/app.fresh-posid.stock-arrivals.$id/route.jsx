import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Card,
  TextField,
  Button,
  BlockStack,
  PageActions,
  Select,
  Banner,
  Text,
  Thumbnail,
  DataTable,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  const locationsQuery = `
        query LocationPickerQuery($first: Int!, $query: String, $includeLegacy: Boolean!) {
            locations(first: $first, query: $query, includeLegacy: $includeLegacy) {
            edges {
                node {
                id
                name
                }
            }
          }
        }
    `;

  const locationsVariables = {
    first: 25,
    query: "active:true", // Fetch only active locations initially
    includeLegacy: true,
  };

  let locations;

  try {
    const locationsData = await admin.graphql(locationsQuery, {
      variables: locationsVariables,
    });
    const locationsDataJSON = await locationsData.json();

    locations = locationsDataJSON.data?.locations?.edges.map(
      (edge) => edge.node,
    );
  } catch (error) {
    console.error("Error fetching locations:", error);
  }

  console.log("locations", locations);

  if (params.id === "new") {
    return json({
      data: {
        // date: new Date().t oISOString().split("T")[0], // Default to today's date
        narration: "",
        // location_name: "A",
        products: [], // Initialize with empty products array
        movement_type: "draft",
      },
      locations: locations || [],
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
  if (!jsonResponse.data.metaobject) {
    return json(
      {
        errors: { base: "Metaobject not found" },
      },
      { status: 404 },
    );
  }
  const metaobject = jsonResponse.data.metaobject.fields.reduce(
    (acc, field) => {
      acc[field.key] = field.jsonValue || "";
      return acc;
    },
    {},
  );

  metaobject["id"] = jsonResponse.data.metaobject.id;

  try {
    metaobject.products = metaobject.products || [];
  } catch (error) {
    console.error("failed to parse products", error);
    metaobject.products = [];
  }

  return json({
    data: {
      ...metaobject,
      date: metaobject?.date?.replace(":00+00:00", ""),
    },
    locations: locations || [],
  });
}

export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const formData = Object.fromEntries(await request.formData());
  const actionType = formData.action || "save";

  const data = {
    date: formData.date,
    narration: formData.narration,
    location_name: formData.location_name,
    products: formData.products,
    movement_type: formData.movement_type,
  };

  // Validate required fields
  const errors = {};
  if (!data.date) errors.date = "Date is required";
  if (!data.location_name) errors.location_name = "Location is required";
  if (!data.products || data.products === "[]")
    errors.products = "Products is required";

  data.date = data.date + ":00";

  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  if (actionType === "stockin" && params.id) {
    try {
      const products = JSON.parse(data.products);
      const inventoryAdjustments = products.map((item) => ({
        delta: parseInt(item.quantity, 10),
        inventoryItemId: item.variant.inventoryItem.id,
        locationId: data.location_name,
      }));

      const response = await admin.graphql(
        `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
              userErrors {
                field
                message
              }
              inventoryAdjustmentGroup {
                createdAt
                reason
                referenceDocumentUri
                changes {
                  name
                  delta
                }
              }
            }
          }`,
        {
          variables: {
            input: {
              reason: "correction",
              name: "available",
              referenceDocumentUri:
                "logistics://some.warehouse/take/2023-01/13", //just keep this for now
              changes: inventoryAdjustments,
            },
          },
        },
      );

      const jsonResponse = await response.json();

      const { userErrors } = jsonResponse.data.inventoryAdjustQuantities;
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

      data.movement_type = "stockin";
    } catch (e) {
      return json(
        {
          errors: { base: e.message },
        },
        { status: 422 },
      );
    }

    // return redirect(
    //   `/app/fresh-posid/stock-arrivals/${params.id}?successMessage=Inventory adjusted successfully`,
    // );
  }
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
    return redirect("/app/fresh-pos/stock-arrivals");
  }

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
            type: "inventory_logs",
            fields: [
              { key: "date", value: data.date },
              { key: "narration", value: data.narration },
              { key: "location_name", value: data.location_name },
              { key: "products", value: data.products },
              { key: "movement_type", value: "arrival" },
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
      `/app/fresh-posid/stock-arrivals/${NewRecordID}?successMessage=Record created successfully`,
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
              { key: "date", value: data.date },
              { key: "narration", value: data.narration },
              { key: "location_name", value: data.location_name },
              { key: "products", value: data.products },
              { key: "movement_type", value: data.movement_type },
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

    if (actionType === "stockin" && params.id) {
      return redirect(
        `/app/fresh-pos/stock-arrivals?successMessage=Inventory adjusted successfully`,
      );
    }

    return redirect(
      `/app/fresh-posid/stock-arrivals/${params.id}?successMessage=Record updated successfully`,
    );
  }
  return redirect(`/app/fresh-posid/stock-arrivals/${params.id}`);
}

export default function ArrivalForm() {
  const errors = useActionData()?.errors || {};
  const { data, locations: locationsData } = useLoaderData();
  const actionData = useActionData();
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const navigate = useNavigate();
  const submit = useSubmit();
  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" &&
    nav.formData?.get("action") !== "delete" &&
    nav.formData?.get("action") !== "inventory_add";
  const isAddingInventory =
    nav.state === "submitting" &&
    nav.formData?.get("action") === "inventory_add";
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const shopify = useAppBridge();
  const locations = locationsData.map((value) => ({
    label: value.name,
    value: value.id,
  }));

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
    const searchParams = new URLSearchParams(window.location.search);
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
  }, [navigate]);

  const handleProductSelection = useCallback(async () => {
    try {
      const result = await shopify.resourcePicker({
        type: "product",
        multiple: false,
      });
      if (result && result.selection && result.selection.length > 0) {
        const selectedProduct = result.selection[0];
        let updatedProducts = [...formState.products];

        if (selectedProduct.variants.length > 1) {
          // Add each variant as a separate product
          const variantProducts = selectedProduct.variants.map((variant) => ({
            product: selectedProduct,
            quantity: "1",
            variant: variant,
          }));

          if (selectedProductIndex !== null) {
            updatedProducts.splice(selectedProductIndex, 1, ...variantProducts);
          } else {
            updatedProducts = [...updatedProducts, ...variantProducts];
          }
        } else {
          if (selectedProductIndex !== null) {
            updatedProducts[selectedProductIndex] = {
              product: selectedProduct,
              quantity: "1",
              variant: selectedProduct.variants[0],
            };
          } else {
            updatedProducts.push({
              product: selectedProduct,
              quantity: "1",
              variant: selectedProduct.variants[0],
            });
          }
        }

        setFormState({ ...formState, products: updatedProducts });
      }
      setSelectedProductIndex(null);
    } catch (e) {
      console.log(e);
    }
  }, [formState, shopify, selectedProductIndex]);
  const handleAddProduct = useCallback(() => {
    setSelectedProductIndex(null);
    handleProductSelection();
  }, [handleProductSelection]);
  const handleEditProduct = useCallback(
    (index) => {
      setSelectedProductIndex(index);
      handleProductSelection();
    },
    [handleProductSelection],
  );
  const handleQuantityChange = useCallback(
    (index, value) => {
      const updatedProducts = [...formState.products];
      updatedProducts[index].quantity = value;
      setFormState({ ...formState, products: updatedProducts });
    },
    [formState],
  );

  const handleRemoveProduct = useCallback(
    (index) => {
      const updatedProducts = [...formState.products];
      updatedProducts.splice(index, 1);
      setFormState({ ...formState, products: updatedProducts });
    },
    [formState],
  );

  function handleSave() {
    submit(
      { ...formState, products: JSON.stringify(formState.products) },
      { method: "post" },
    );
    setCleanFormState({ ...formState });
  }

  const handleInventoryAdd = useCallback(() => {
    submit(
      {
        ...formState,
        products: JSON.stringify(formState.products),
        movement_type: "stockin",
        action: "stockin",
      },
      { method: "post" },
    );
    setCleanFormState({ ...formState });
  }, [formState, submit]);

  const formatDate = (date) => {
    const newDate = new Date(date);
    const isoString = newDate.toISOString();
    return isoString.split(".")[0];
  };

  useEffect(() => {
    if (!formState.location_name) {
      setFormState({
        ...formState,
        location_name: locations[locations.length - 1]?.value,
      });
    }
  }, [locations]);

  useEffect(() => {
    if (data.movement_type !== "draft") setFormState(data);
  }, [data]);

  return (
    <Page
      backAction={{ content: "Arrivals", url: "/app/fresh-pos/stock-arrivals" }}
      title={formState.id ? "Edit Arrival" : "Add Arrival"}
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
      {errors?.base && (
        <>
          <Banner
            title="Errors in the form"
            tone="critical"
            onDismiss={() => setSuccessMessage("")}
          >
            <p>{errors.base}</p>
          </Banner>
          <div style={{ height: "20px" }}></div>
        </>
      )}

      <BlockStack gap="500">
        <Card>
          <BlockStack gap="500">
            {formState.movement_type !== "stockin" && <></>}
            <TextField
              type="datetime-local"
              label="Date"
              value={
                formState.date
                // ? formState.date
                // : new Date().toISOString().split(".")[0]
              }
              onChange={(value) => {
                setFormState({ ...formState, date: value });
              }}
              error={errors.date}
            />
            <TextField
              label="Narration"
              value={formState.narration}
              onChange={(value) =>
                setFormState({ ...formState, narration: value })
              }
              multiline={4}
              error={errors.narration}
            />
            <Select
              label="Location"
              options={locations}
              onChange={(value) => {
                setFormState({
                  ...formState,
                  location_id: (locations || []).filter(
                    (val) => val.value === value,
                  )?.[0]?.label,
                });
                setFormState({ ...formState, location_name: value });
              }}
              value={formState.location_name}
              error={errors.location_name}
            />
          </BlockStack>
        </Card>

        <Card title="Products" sectioned>
          {Array.isArray(formState.products) &&
            formState.products.length > 0 && (
              <DataTable
                columnContentTypes={["text", "text"]}
                headings={["Product", "Quantity"]}
                rows={(formState.products || []).map((item, index) => {
                  return [
                    <div className="flex ">
                      <Thumbnail
                        size="small"
                        source={item.product.images?.[0]?.originalSrc}
                      />
                      <div className="ml-2 m-auto">
                        <Text variant="bodyMd" fontWeight="bold">
                          {`${item.variant.displayName}`.replace(
                            " - Default Title",
                            "",
                          )}
                        </Text>
                      </div>
                    </div>,
                    <div className="flex justify-between">
                      <TextField
                        type="number"
                        // label="Quantity"
                        autoComplete="off"
                        value={item.quantity}
                        onChange={(value) => handleQuantityChange(index, value)}
                        min={1}
                      />
                      <Button onClick={() => handleRemoveProduct(index)} plain>
                        Remove
                      </Button>
                    </div>,
                  ];
                })}
              />
            )}
          <div className="mt-2">
            <Button onClick={handleAddProduct} fullWidth>
              Add Product
            </Button>
          </div>
          {errors.products && (
            <Text variant="bodyMd" tone="critical">
              {errors.products}
            </Text>
          )}
        </Card>
      </BlockStack>
      {(formState.movement_type === "draft" ||
        formState.movement_type === "arrival") && (
        <PageActions
          primaryAction={{
            content: formState.movement_type === "draft" ? "Save" : "Update",
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
      )}
      {formState.movement_type === "arrival" && (
        <PageActions
          key={JSON.stringify(data)}
          primaryAction={{
            content: "Add Inventory",
            onAction: handleInventoryAdd,
            loading: isAddingInventory || isSaving,
            disabled: isAddingInventory || isSaving,
          }}
        />
      )}
    </Page>
  );
}
