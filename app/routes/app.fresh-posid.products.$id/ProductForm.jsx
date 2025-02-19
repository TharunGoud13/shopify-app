// ProductForm.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  TextField,
  Select,
  FormLayout,
  Button,
  Text,
  Thumbnail,
  OptionList,
} from "@shopify/polaris";
import ImageUpload from "./ImageUpload";
import VariantManager from "./variant-manager";
import { Loader2 } from "lucide-react";
import CategorySelector from "./CategorySelector";
import { fetchGraphQL } from "../../lib/graphql";
import MetaobjectSearch from "../../components/MetaobjectSearch";

function ProductForm({
  initialProduct = {},
  onSave,
  loading,
  errors,
  categories,
  productTypes,
  storageOptions,
}) {
  const initialVariants = initialProduct.variants
    ? JSON.parse(JSON.stringify(initialProduct.variants)).edges.map((edge) => ({
        ...edge.node,
        barcode: edge.node.barcode || "",
      }))
    : [];
  const initialOptions = initialProduct.options
    ? JSON.parse(JSON.stringify(initialProduct.options)).map((edge) => ({
        edge,
      }))
    : [];

  const [product, setProduct] = useState(initialProduct);
  const [deletedVariants, setDeletedVariants] = useState([]);
  // const [categories, setCategories] = useState([]);
  const [selectedImage, setSelectedImage] = useState();
  const [deletedImages, setDeletedImages] = useState([]);
  const [variants, setVariants] = useState(initialVariants);
  const [options, setOptions] = useState(
    initialProduct.options
      ? JSON.parse(
          JSON.stringify(
            initialProduct.options.filter((opt) => opt.name !== "Title"),
          ),
        )
      : [],
  );

  // ... existing code ...
  const handleImageUpload = useCallback((file) => {
    console.log("fileselected", file);
    setSelectedImage(file);
  }, []);

  const handleInputChange = useCallback((field, value) => {
    if (field === "tags") {
      setProduct((prev) => ({ ...prev, [field]: value }));
      return;
    }
    setProduct((prev) => ({ ...prev, [field]: value }));
  }, []);

  const getNewOptions = () => {
    return options.filter((item) => !item.id);
  };

  const getDeletedOptions = () => {
    const optionNames = new Set(options.map((opt) => opt.name));
    const deletedOptions = initialOptions
      .filter((opt) => !optionNames.has(opt.edge.name) && opt.edge.id)
      .map((opt) => opt.edge.id);
    return deletedOptions;
  };

  const getUpdatedOptions = () => {
    return options
      .filter((opt) => opt.id) // Only consider existing options
      .map((opt) => {
        const initialOpt = initialOptions.find(
          (initOpt) => initOpt.edge.id === opt.id,
        );
        if (!initialOpt) return null;

        const initialValues = new Set(initialOpt.edge.values);
        const currentValues = new Set(opt.values);

        const optionValuesToAdd = opt.values
          .filter((val) => !initialValues.has(val))
          .map((val) => ({ name: val }));

        // Find values to delete (exist in initial but not in current)
        const optionValuesToDelete = initialOpt.edge.values
          .filter((val) => !currentValues.has(val))
          .map(
            (val) =>
              initialOpt.edge.optionValues.find((v) => v.name === val)?.id,
          );

        // If nothing changed, return null
        if (optionValuesToAdd.length === 0 && optionValuesToDelete.length === 0)
          return null;

        return {
          productId: "pid",
          option: { id: opt.id },
          optionValuesToAdd,
          optionValuesToUpdate: [],
          optionValuesToDelete,
        };
      })
      .filter((update) => update !== null);
  };

  const validateOptions = () => {
    const errors = [];

    options.forEach((option) => {
      if (!option.values || option.values.length === 0) {
        errors.push(`You need to set a value for option: ${option.name}`);
        shopify.toast.show(
          `You need to set a value for option: ${option.name}`,
          { isError: true },
        );
      }
    });

    return errors.length === 0;
  };

  const handleSave = useCallback(
    async (event) => {
      event.preventDefault();
      let media = null;

      if (!validateOptions()) {
        return;
      }

      if (selectedImage) {
        media = [
          {
            alt: "",
            mediaContentType: "IMAGE",
            originalSource: selectedImage.name,
          },
        ];
      }

      const deletedVariants = initialVariants
        .filter((v) => !variants.some((pv) => pv.title === v.title && pv.id))
        .map((v) => v.id);

      const input = {
        title: product.title,
        productType: product.productType,
        tags: product.tags.split(",").map((tag) => tag.trim()),
        descriptionHtml: product.description,
        vendor: product.vendor,
        ...(product.category && { category: product.category }),
        options: options,
        variants: variants,
        deletedVariants: deletedVariants,
        ...(product.status && { status: product.status }),
        ...(product.order_points && { order_points: product.order_points }),
        ...(product.per_order_limit && {
          per_order_limit: product.per_order_limit,
        }),
        ...(product.start_date && { start_date: product.start_date }),
        ...(product.end_date && { end_date: product.end_date }),
        newOptions: JSON.stringify(getNewOptions()),
        deletedOptions: JSON.stringify(getDeletedOptions()),
        updatedOptions: JSON.stringify(getUpdatedOptions()),
        storage: product.storage,
        store_options: product.store_options,
        bagging_score: product.bagging_score,
        custom_product_type: product.productType,
        units: product.units,
        deletedImages: JSON.stringify(deletedImages),
      };
      if (selectedImage) {
        input.imageFile = selectedImage;
      }

      if (media) {
        input.media = media;
      }

      if (deletedImages) {
        input;
      }

      // return;
      onSave(input);
    },
    [onSave, product, selectedImage, variants, options, deletedVariants],
  );

  return (
    <Card sectioned>
      <Text variant="headingMd" as="h2">
        {product.id ? "Edit Product" : "Create Product"}
      </Text>
      <form onSubmit={handleSave}>
        <FormLayout>
          <Select
            label="Status"
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Archived", value: "ARCHIVED" },
              { label: "Draft", value: "DRAFT" },
            ]}
            value={product.status || "ACTIVE"}
            onChange={(v) => handleInputChange("status", v)}
          />
          <TextField
            label="Title"
            value={product.title}
            onChange={(v) => handleInputChange("title", v)}
          />
          <Select
            label="Product Type"
            options={productTypes}
            value={product.productType}
            onChange={(v) => handleInputChange("productType", v)}
          />
          <TextField
            label="Units"
            value={product.units}
            onChange={(v) => handleInputChange("units", v)}
          />
          <TextField
            label="Tags"
            value={product.tags}
            onChange={(v) => handleInputChange("tags", v)}
          />
          <TextField
            label="Description"
            value={product.descriptionHtml}
            multiline={3}
            onChange={(v) => handleInputChange("descriptionHtml", v)}
          />
          <ImageUpload
            key={JSON.stringify(product?.featuredImage)}
            onUpload={handleImageUpload}
            initialImage={{
              ...product?.featuredImage,
              ...product.featuredMedia,
            }}
            deletedImages={deletedImages}
            setDeletedImages={setDeletedImages}
          />
          <TextField
            label="Vendor"
            value={product.vendor}
            onChange={(v) => handleInputChange("vendor", v)}
          />
          {/* <Select
            label="Category"
            options={categories.map((category) => ({
              label: category.name,
              value: category.id,
            }))}
            value={product.category}
            onChange={(v) => handleInputChange("category", v)}
          /> */}
          <CategorySelector
            categories={categories}
            handleCategorySelect={(categoryId) => {
              handleInputChange("category", categoryId);
            }}
            initValue={product.category_name}
          />
          <TextField
            type="integer"
            label="Order Points"
            value={product.order_points}
            onChange={(v) => handleInputChange("order_points", v)}
          />
          <TextField
            type="integer"
            label="Per order limit"
            value={product.per_order_limit}
            onChange={(v) => handleInputChange("per_order_limit", v)}
          />
          <Select
            label="Storage"
            options={storageOptions}
            value={product.storage}
            onChange={(v) => handleInputChange("storage", v)}
          />
          <TextField
            type="integer"
            label="Bagging score"
            value={product.bagging_score}
            onChange={(v) => handleInputChange("bagging_score", v)}
          />
          <OptionList
            title="Store Options"
            onChange={(sel) =>
              handleInputChange("store_options", JSON.stringify(sel))
            }
            options={[
              { value: "instore", label: "Instore" },
              { value: "curbside", label: "Curbside" },
              { value: "locker", label: "Locker" },
            ]}
            selected={JSON.parse(product.store_options || "[]")}
            allowMultiple={true}
          />
          {/* <TextField
            type="date"
            label="Start Date"
            value={product.start_date || ""}
            onChange={(v) => handleInputChange("start_date", v)}
          />
          <TextField
            type="date"
            label="End Date"
            value={product.end_date || ""}
            onChange={(v) => handleInputChange("end_date", v)}
          /> */}
          <VariantManager
            initialData={initialProduct}
            initialVariants={initialVariants}
            variants={variants}
            setVariants={setVariants}
            options={options}
            setOptions={setOptions}
          />
          <Button primary submit disabled={loading} loading={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Save
          </Button>
          {errors && (
            <div className="mt-4">
              <ul className="list-disc list-inside text-red-500">
                {errors.map((error, index) => (
                  <li key={index}>{error.message || error}</li>
                ))}
              </ul>
            </div>
          )}
        </FormLayout>
      </form>
    </Card>
  );
}

export default ProductForm;
