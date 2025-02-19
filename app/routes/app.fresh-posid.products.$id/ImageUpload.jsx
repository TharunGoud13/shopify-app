//ImageUpload.jsx
import React, { useState, useCallback, useRef } from "react";
import { Card, Thumbnail, Button, BlockStack } from "@shopify/polaris";

function ImageUpload({
  initialImage,
  onUpload,
  deletedImages,
  setDeletedImages,
}) {
  const [image, setImage] = useState(initialImage?.url || "");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = useCallback(
    async (event) => {
      setLoading(true);
      const file = event.target.files[0];
      if (file) {
        // In real app do a presigned URL upload
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result);
          onUpload(file);
        };
        reader.readAsDataURL(file);
      }
      setLoading(false);
    },
    [onUpload],
  );

  const handleRemove = () => {
    if (
      image === initialImage?.url &&
      initialImage?.id &&
      !deletedImages.includes(initialImage?.id)
    ) {
      setDeletedImages((prev) => [...prev, initialImage.id]);
    }
    setImage(null);
    onUpload(null);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // ✅ Programmatically trigger file input
    }
  };

  return (
    <Card sectioned>
      <BlockStack>
        {image ? (
          <>
            <Thumbnail size="large" source={image} alt="Product Image" />
            <Button onClick={handleRemove}>Remove Image</Button>
          </>
        ) : (
          <label htmlFor="image-upload">
            <Button loading={loading} onClick={handleButtonClick} as="span">
              Upload Image
            </Button>
          </label>
        )}

        <input
          type="file"
          id="image-upload"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleChange}
          accept="image/*"
        />
      </BlockStack>
    </Card>
  );
}

export default ImageUpload;
