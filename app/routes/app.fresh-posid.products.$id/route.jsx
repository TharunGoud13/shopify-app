// route.tsx
import React, { useState, useEffect } from "react";
import { authenticate } from "../../shopify.server";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useParams,
  useSearchParams,
  useNavigate,
  redirect,
} from "@remix-run/react";
import ProductForm from "../app.fresh-posid.products.$id/ProductForm";
import { fetchGraphQL } from "../../lib/graphql";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Page, Banner } from "@shopify/polaris";
// import { json, redirect } from "@remix-run/node";
import { uploadImageAndGetFileId } from "../../lib/imageUpload";

export async function loader({ params, request }) {
  const { id } = params;
  const { admin, session } = await authenticate.admin(request);

  const res = await fetch(
    "https://shopify.github.io/product-taxonomy/releases/unstable/search_index.json",
  );
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  const CategoryData = await res.json();

  const productTypeData = await fetchGraphQL(
    `{
      metaobjects(type: "custom_product_type", first: 250) {
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
    {},
    true,
    admin,
  );

  const storageData = await fetchGraphQL(
    `{
      metaobjects(type: "storage", first: 250) {
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
    {},
    true,
    admin,
  );

  if (!id || id === "new") {
    return {
      product: {
        status: "ACTIVE",
      },
      productTypes: productTypeData.metaobjects.edges.map((edge) => {
        const fields = edge.node.fields.reduce((acc, field) => {
          acc[field.key] = field.jsonValue;
          return acc;
        }, {});
        return {
          id: edge.node.id,
          label: fields.custom_product_type,
          value: fields.custom_product_type,
        };
      }),
      storageOptions: storageData.metaobjects.edges.map((edge) => {
        const fields = edge.node.fields.reduce((acc, field) => {
          acc[field.key] = field.jsonValue;
          return acc;
        }, {});
        return {
          ...fields,
          id: edge.node.id,
          label: fields.storage_title,
          value: fields.storage_title,
        };
      }),
      // category: [],
      category: CategoryData.map((item) => ({
        id: item.category.id,
        name: item.category.name,
        fully_qualified_type: item.category.fully_qualified_type,
      })),
    };
  }
  const query = `
    query Product($id: ID!) {
      product(id: $id) {
        id
        title
        descriptionHtml
        productType
        tags
        vendor
        category{
            id
            name
        }
        featuredImage {
          url
          id
        }
        featuredMedia{
          id
          preview{
            image{
              id
              url
            }
          }
        }
        variants(first: 250) {
          edges {
            node {
              id
              sku
              barcode
              price
              title
              selectedOptions {
                name
                value
              }
            }
          }
        }
        options {
          id
          name
          values
          optionValues{
            name
            id
            hasVariants
          }
        }
        status
        start_date:metafield(key: "start_date", namespace: "custom") {
            value
        }
        end_date:metafield(key: "end_date", namespace: "custom") {
            value
        }
        per_order_limit:metafield(key: "per_order_limit", namespace: "custom") {
            value
        }
        order_points:metafield(key: "order_points", namespace: "custom") {
            value
        }
        bagging_score:metafield(key: "bagging_score", namespace: "custom") {
            value
        }
        storage:metafield(key: "storage", namespace: "custom") {
            value
        }
        store_options:metafield(key: "store_options", namespace: "custom") {
            value
        }
        units:metafield(key: "units", namespace: "custom") {
            value
        }
        custom_product_type:metafield(key: "custom_product_type", namespace: "custom") {
            value
        }
      }
    }
  `;

  const variables = { id: "gid://shopify/Product/" + id };
  const data = await fetchGraphQL(query, variables, true, admin);
  return {
    product: data?.product,
    id,
    productTypes: productTypeData.metaobjects.edges.map((edge) => {
      const fields = edge.node.fields.reduce((acc, field) => {
        acc[field.key] = field.jsonValue;
        return acc;
      }, {});
      return {
        id: edge.node.id,
        label: fields.custom_product_type,
        value: fields.custom_product_type,
      };
    }),
    storageOptions: storageData.metaobjects.edges.map((edge) => {
      const fields = edge.node.fields.reduce((acc, field) => {
        acc[field.key] = field.jsonValue;
        return acc;
      }, {});
      return {
        ...fields,
        id: edge.node.id,
        label: fields.storage_title,
        value: fields.storage_title,
      };
    }),
    //category: [],
    category: CategoryData.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      fully_qualified_type: item.category.fully_qualified_type,
    })),
  };
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("id");
  const newOptions = JSON.parse(formData.get("newOptions") || "[]");
  const deletedOptions = JSON.parse(formData.get("deletedOptions") || "[]");
  const updatedOptions = JSON.parse(formData.get("updatedOptions") || "[]");
  const deletedImages = JSON.parse(formData.get("deletedImages") || "[]");

  const input = {
    title: formData.get("title"),
    productType: formData.get("productType"),
    tags: formData.get("tags"),
    descriptionHtml: formData.get("descriptionHtml"),
    vendor: formData.get("vendor"),
    category: formData.get("category"),
    // ...(formData.get("category") && {
    //   category: formData.get("category")
    // }),

    status: formData.get("status"),
    metafields: [
      {
        namespace: "custom",
        key: "order_points",
        type: "number_integer",
        value: formData.get("order_points") || "",
      },
      {
        namespace: "custom",
        key: "per_order_limit",
        type: "number_integer",
        value: formData.get("per_order_limit") || "",
      },
      {
        namespace: "custom",
        key: "bagging_score",
        type: "number_integer",
        value: formData.get("bagging_score") || "",
      },
      {
        namespace: "custom",
        key: "start_date",
        type: "date",
        value: formData.get("start_date") || "",
      },
      {
        namespace: "custom",
        key: "end_date",
        type: "date",
        value: formData.get("end_date") || "",
      },
      {
        namespace: "custom",
        key: "storage",
        type: "single_line_text_field",
        value: formData.get("storage") || "",
      },
      {
        namespace: "custom",
        key: "units",
        type: "single_line_text_field",
        value: formData.get("units") || "",
      },
      {
        namespace: "custom",
        key: "store_options",
        type: "json",
        value: formData.get("store_options") || "[]",
      },
      {
        namespace: "custom",
        key: "custom_product_type",
        type: "single_line_text_field",
        value: formData.get("custom_product_type") || "",
      },
    ],
    // options: JSON.parse(formData.get("options")),
  };
  const variants = JSON.parse(formData.get("variants") || "[]");
  let imageUploadData;

  try {
    imageUploadData = await uploadImageAndGetFileId(
      formData.get("imageFile"),
      admin,
    );
    let { fileId, imageUrl } = imageUploadData;
    console.log("Uploaded image ID:", imageUrl, fileId);
  } catch (error) {
    console.error("Failed to upload image:", error);
  }

  if (productId && deletedImages.length > 0) {
    console.log("media deleting",{
      "mediaIds": deletedImages,
      "productId": productId
    })
    const deleteMediaData = await fetchGraphQL(
      `mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
        productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
          deletedMediaIds
          deletedProductImageIds
          mediaUserErrors {
            field
            message 
          }
        }
      }`,
      {
        "mediaIds": deletedImages,
        "productId": productId
      },
      true,
    );

    if (deleteMediaData?.productDeleteMedia?.userErrors?.length) {
      console.error(
        "productData?.productDeleteMedia?.userErrors",
        deleteMediaData?.productDeleteMedia?.userErrors,
      );
      // return {
      //   errors: deleteMediaData?.productDeleteMedia?.userErrors,
      // };
    }
  }

  let mutation = `
       mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
         productCreate(input: $input, media: $media) {
          product{
             id
           }
            userErrors{
              field
              message
            }
          }
      }
    `;
  let variables = {
    input: { ...input },
  };

  let productCreatedId;

  if (productId) {
    mutation = `
            mutation productUpdate($input: ProductInput!, $media: [CreateMediaInput!]) {
                productUpdate(input: $input, media: $media) {
                  product{
                    id
                  }
                  userErrors{
                    field
                    message
                  }
                }
            }
          `;
    variables = {
      input: { id: productId, ...input },
    };
  }

  if (imageUploadData) {
    variables["media"] = {
      originalSource: imageUploadData.imageUrl,
      alt: formData.get("imageFile").name,
      mediaContentType: "IMAGE",
    };
  }

  try {
    const productData = await fetchGraphQL(mutation, variables, true);

    if (
      productData?.productCreate?.userErrors?.length ||
      productData?.productUpdate?.userErrors?.length
    ) {
      return {
        errors:
          productData?.productCreate?.userErrors ||
          productData?.productUpdate?.userErrors,
      };
    }
    productCreatedId =
      productData?.productCreate?.product?.id ||
      productData?.productUpdate?.product?.id;

    console.log("productCreatedId", productId, productCreatedId);
    console.log(
      "newOptions",
      newOptions,
      newOptions.map((opt) => ({
        name: opt.name,
        values: (opt.values || []).map((value) => ({ name: value })),
      })),
    );

    if (newOptions) {
      const createNewOptionsData = await fetchGraphQL(
        `mutation createOptions($productId: ID!, $options: [OptionCreateInput!]!, $variantStrategy: ProductOptionCreateVariantStrategy) {
        productOptionsCreate(productId: $productId, options: $options, variantStrategy: $variantStrategy) {
          userErrors {
            field
            message
            code
          }
          product {
            id
          }
        }
      }`,
        {
          productId: productCreatedId,
          options: newOptions.map((opt) => ({
            name: opt.name,
            values: (opt.values || []).map((value) => ({ name: value })),
          })),
          variantStrategy: "CREATE", //"LEAVE_AS_IS"
        },
        true,
      );

      if (createNewOptionsData?.productOptionsCreate?.userErrors?.length) {
        console.error(
          "productData?.productOptionsCreate?.userErrors",
          createNewOptionsData?.productOptionsCreate?.userErrors,
        );
        return {
          errors: createNewOptionsData?.productOptionsCreate?.userErrors,
        };
      }
    }

    if (deletedOptions) {
      const deleteOptionsData = await fetchGraphQL(
        `mutation deleteOptions($productId: ID!, $options: [ID!]!, $strategy: ProductOptionDeleteStrategy) {
          productOptionsDelete(productId: $productId, options: $options, strategy: $strategy) {
            userErrors {
              field
              message
              code
            }
            deletedOptionsIds
            product {
              id
            }
          }
        }`,
        {
          productId: productCreatedId,
          options: deletedOptions,
          strategy: "POSITION",
        },
        true,
      );

      if (deleteOptionsData?.productOptionsDelete?.userErrors?.length) {
        console.error(
          "deleteOptionsData?.productOptionsDelete?.userErrors",
          deleteOptionsData?.productOptionsDelete?.userErrors,
        );
        return {
          errors: deleteOptionsData?.productOptionsDelete?.userErrors,
        };
      }
    }

    for (let i = 0; i < updatedOptions.length; i++) {
      console.log("update", {
        ...updatedOptions[i],
        productId: productCreatedId,
        variantStrategy: "MANAGE",
      });
      const updatedOptionsData = await fetchGraphQL(
        `mutation updateOption($productId: ID!, $option: OptionUpdateInput!, $optionValuesToAdd: [OptionValueCreateInput!], $optionValuesToUpdate: [OptionValueUpdateInput!], $optionValuesToDelete: [ID!], $variantStrategy: ProductOptionUpdateVariantStrategy) {
          productOptionUpdate(productId: $productId, option: $option, optionValuesToAdd: $optionValuesToAdd, optionValuesToUpdate: $optionValuesToUpdate, optionValuesToDelete: $optionValuesToDelete, variantStrategy: $variantStrategy) {
            userErrors {
              field
              message
              code
            }
            product {
              id
            }
          }
        }`,
        {
          ...updatedOptions[i],
          productId: productCreatedId,
          variantStrategy: "MANAGE",
        },
        true,
      );

      if (updatedOptionsData?.productOptionUpdate?.userErrors?.length) {
        console.error(
          "updatedOptionsData?.productOptionUpdate?.userErrors",
          updatedOptionsData?.productOptionUpdate?.userErrors,
        );
        return {
          errors: updatedOptionsData?.productOptionUpdate?.userErrors,
        };
      }
    }

    const redirectPathUrl = productId
      ? `/app/fresh-posid/products/${productId.split("/").pop()}?successMessage=Product updated successfully`
      : `/app/fresh-posid/products/${productCreatedId.split("/").pop()}?successMessage=Product created successfully`;
    return redirect(redirectPathUrl);

    //handle variants
    if (productId) {
      // Update or Create variants
      const createVariants = variants.filter((v) => v.isNew);
      const updateVariants = variants.filter((v) => v.id && !v.isNew);
      const deleteVariants = JSON.parse(
        formData.get("deletedVariants") || "[]",
      );

      if (createVariants.length > 0) {
        const createVariantMutation = `
                mutation productVariantsBulkCreate(
                    $productId: ID!,
                    $variants: [ProductVariantsBulkInput!]!
                ) {
                    productVariantsBulkCreate(productId: $productId, variants: $variants) {
                      productVariants{
                        id
                        
                      }
                    userErrors{
                          field
                          message
                        }
                    }
                  }
              `;

        const createVariantVariables = {
          productId,
          variants: createVariants.map((variant) => {
            return {
              price: variant.price || 0,
              // barcode: variant.barcode,
              optionValues: variant.selectedOptions.map((option) => ({
                optionName: option.name,
                name: option.value,
              })),
            };
          }),
        };
        const variantCreateResponse = await fetchGraphQL(
          createVariantMutation,
          createVariantVariables,
          true,
        );
        if (
          variantCreateResponse?.productVariantsBulkCreate?.userErrors?.length
        ) {
          return {
            errors:
              variantCreateResponse?.productVariantsBulkCreate?.userErrors,
          };
        }
      }

      if (updateVariants.length > 0) {
        const updateVariantMutation = `
                mutation productVariantsBulkUpdate(
                    $productId: ID!,
                    $variants: [ProductVariantsBulkInput!]!
                    ) {
                      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                          productVariants{
                             id
                        }
                        userErrors{
                              field
                              message
                            }
                        }
                    }
                `;
        const updateVariantVariables = {
          productId,
          variants: updateVariants.map((variant) => {
            return {
              id: variant.id,
              price: variant.price || 0,
              barcode: variant.barcode || "",
            };
          }),
        };
        const variantUpdateResponse = await fetchGraphQL(
          updateVariantMutation,
          updateVariantVariables,
          true,
        );

        if (
          variantUpdateResponse?.productVariantsBulkUpdate?.userErrors?.length
        ) {
          return {
            errors:
              variantUpdateResponse?.productVariantsBulkUpdate?.userErrors,
          };
        }
      }

      if (deleteVariants.length > 0) {
        const deleteVariantMutation = `
                  mutation productVariantsBulkDelete($productId: ID!, $variantsIds: [ID!]!) {
                    productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
                      userErrors{
                        field
                        message
                      }
                    }
                  }
                `;
        const deleteVariantVariables = {
          productId,
          variantsIds: deleteVariants,
        };

        const variantDeleteResponse = await fetchGraphQL(
          deleteVariantMutation,
          deleteVariantVariables,
          true,
        );

        if (
          variantDeleteResponse?.productVariantsBulkDelete?.userErrors?.length
        ) {
          return {
            errors:
              variantDeleteResponse?.productVariantsBulkDelete?.userErrors,
          };
        }
      }
    } else {
      if (!productCreatedId) {
        return { errors: ["Product creation failed, no product ID received."] };
      }
      //create variant
      if (variants.length > 0) {
        const createVariantMutation = `
                mutation productVariantsBulkCreate(
                    $productId: ID!,
                    $variants: [ProductVariantsBulkInput!]!
                ) {
                    productVariantsBulkCreate(productId: $productId, variants: $variants) {
                      productVariants{
                        id
                        
                      }
                    userErrors{
                          field
                          message
                        }
                    }
                  }
              `;

        const createVariantVariables = {
          productId: productCreatedId,
          variants: variants.map((variant) => {
            return {
              price: variant.price || 0,
              barcode: variant.barcode || "",
              optionValues: variant.selectedOptions.map((option) => ({
                // name: option.name,
                // value: option.value,
                optionName: option.name,
                name: option.value,
              })),
            };
          }),
        };
        const variantCreateResponse = await fetchGraphQL(
          createVariantMutation,
          createVariantVariables,
          true,
        );
        if (
          variantCreateResponse?.productVariantsBulkCreate?.userErrors?.length
        ) {
          return {
            errors:
              variantCreateResponse?.productVariantsBulkCreate?.userErrors,
          };
        }
      }
    }

    // return {
    //   success: true,
    //   productId: productCreatedId,
    // };

    // const redirectPath = productId
    //   ? `/app/fresh-posid/products/${productId}?successMessage=Product created successfully`
    //   : `/app/fresh-posid/products/${productCreatedId}?successMessage=Product updated successfully`;
    const redirectPath = productId
      ? `/app/fresh-posid/products/${productId.split("/").pop()}?successMessage=Product updated successfully`
      : `/app/fresh-posid/products/${productCreatedId.split("/").pop()}?successMessage=Product created successfully`;
    return redirect(redirectPath);
  } catch (error) {
    console.log(error);
    return { errors: ["Failed to save product", JSON.stringify(error)] };
  }
}

export default function ProductRoute() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const errors = useActionData()?.errors || {};
  const [successMessage, setSuccessMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSaving =
    navigate.state === "submitting" &&
    navigate.formData?.get("action") !== "delete";

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

  const handleSave = async (input) => {
    setLoading(true);
    console.log("input", input);
    const formData = new FormData();
    console.log("formState.image", input.image);
    Object.entries(input).forEach(([key, value]) => {
      if (key === "image" && value instanceof File) {
        formData.append("imageFile", value);
      } else if (key === "deletedVariants") {
        formData.append(key, JSON.stringify(value));
      } else if (key === "variants" || key === "options") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    if (loaderData?.product?.id) {
      formData.append("id", loaderData.product.id);
    }
    // setLoading(false);
    // return
    submit(formData, { method: "post", encType: "multipart/form-data" });

    setLoading(false);
  };

  const productData = {
    ...loaderData?.product,
    tags: loaderData?.product?.tags?.join(", ") || "",
    productType: loaderData?.product?.productType || "",
    per_order_limit: loaderData?.product?.per_order_limit?.value || "",
    order_points: loaderData?.product?.order_points?.value || "",
    bagging_score: loaderData?.product?.bagging_score?.value || "",
    units: loaderData?.product?.units?.value || "",
    custom_product_type: loaderData?.product?.custom_product_type?.value || "",
    store_options: loaderData?.product?.store_options?.value || "[]",
    storage: loaderData?.product?.storage?.value || "",
    start_date: loaderData?.product?.start_date?.value || "",
    end_date: loaderData?.product?.end_date?.value || "",
    category: loaderData?.product?.category?.id || "",
    category_name: loaderData?.product?.category?.name || "",
    options: loaderData?.product?.options || [],
  };

  return (
    <Page
      backAction={{ content: "Products", url: "/app/fresh-pos/products" }}
      title={loaderData?.product?.id ? "Edit Product" : "Add Product"}
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
      <ProductForm
        initialProduct={productData}
        categories={loaderData?.category || []}
        productTypes={loaderData?.productTypes || []}
        storageOptions={loaderData?.storageOptions || []}
        onSave={handleSave}
        loading={loading || isSaving}
        errors={actionData?.errors}
        key={JSON.stringify(loaderData)}
      />
    </Page>
  );
}
