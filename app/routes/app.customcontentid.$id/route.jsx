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
  DropZone,
  LegacyStack,
  Thumbnail,
  Text,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";

const STAGED_UPLOAD_TARGET_CREATE = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        resourceUrl
        url
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SAVE_MEDIA_CREATE = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
        alt
        createdAt
      }
      userErrors {
        code
        field
        message
        __typename
      }
    }
  }
`;

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      content_field: "",
      description: "",
      short_description: "",
      image: "",
      url: "",
      status: "true",
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
  const fData = await request.formData();
  const formData = Object.fromEntries(fData);
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

    return redirect("/app/customcontent");
  }

  const data = {
    content_field: formData.content_field,
    description: formData.description,
    short_description: formData.short_description,
    image: formData.image,
    url: formData.url,
    status: formData.status,
  };

  const errors = {};
  if (!data.content_field) errors.content_field = "Content Field is required";
  if (!data.url) errors.url = "URL is required";

  // Handle image upload if a file is present
  let imageValue = data.image;
  console.log("form", formData);
  console.log("fData", fData);

  console.log("fData.get(imageFile).name", fData.get("imageFile").name);
  console.log("fData.get(imageFile).type", fData.get("imageFile").type);
  console.log("fData.get(imageFile).size", fData.get("imageFile").size);

  if (fData.get("imageFile")) {
    try {
      const stagedUploadResponse = await admin.graphql(
        STAGED_UPLOAD_TARGET_CREATE,
        {
          variables: {
            input: [
              {
                resource: "IMAGE",
                filename: fData.get("imageFile").name,
                mimeType: fData.get("imageFile").type,
                fileSize: fData.get("imageFile").size?.toString(),
                httpMethod: "POST",
              },
            ],
          },
        },
      );

      const stagedUploadData = await stagedUploadResponse.json();
      const stagedTarget =
        stagedUploadData.data.stagedUploadsCreate.stagedTargets[0];

      console.log("stagedTarget", stagedTarget);

      if (!stagedTarget) {
        throw new Error("Failed to get upload URL");
      }

      const { url, parameters } = stagedTarget;
      const formDataImage = new FormData();
      parameters.forEach(({ name, value }) => {
        formDataImage.append(name, value);
      });
      formDataImage.append("file", fData.get("imageFile"));

      const uploadResponse = await fetch(url, {
        method: "POST",
        body: formDataImage,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const responseText = await uploadResponse.text();
      const imageUrlMatch = responseText.match(/<Location>(.*?)<\/Location>/);

      if (!(imageUrlMatch && imageUrlMatch[1])) {
        throw new Error("Failed to extract image URL from response");
      }

      imageValue = imageUrlMatch[1];
      console.log("uploadResponse", imageValue);

      // const fileCreateData = await fetchGraphQL(SAVE_MEDIA_CREATE, {
      //   variables: {
      //     files: {
      //       contentType: "IMAGE",
      //       originalSource: imageValue,
      //     },
      //   },
      // });
      const fileCreateData = await admin.graphql(
        `#graphql
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              fileStatus
              alt
              createdAt
            }
            userErrors {
              code
              field
              message
            }
          }
        }`,
        {
          variables: {
            files: {
              alt: "fallback text for a video",
              contentType: "IMAGE",
              originalSource: imageValue,
            },
          },
        },
      );

      const fileCreateDataJSON = await fileCreateData.json();

      console.log("fileCreateData", fileCreateDataJSON);

      if (fileCreateDataJSON.data.fileCreate.userErrors.length > 0) {
        const errorMessages = fileCreateDataJSON.data.fileCreate.userErrors
          .map((error) => `${error.field.join(".")}: ${error.message}`)
          .join(", ");
        throw new Error(`File creation failed: ${errorMessages}`);
      }

      const fileId = fileCreateDataJSON.data.fileCreate.files[0]?.id;
      console.log(
        "fileCreateDataJSON.data",
        fileCreateDataJSON?.data,
        fileCreateDataJSON?.data?.fileCreate?.files,
      );
      if (!fileId) {
        throw new Error("Failed to get file ID after creation");
      }

      data.image = fileId; // Update data.image with the file ID
      imageValue = fileId;
    } catch (error) {
      console.error("Image upload failed:", error);
      errors.image = "Image upload failed" + String(error);
    }
  }

  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

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
            type: "custom_content",
            fields: [
              { key: "content_field", value: data.content_field },
              { key: "description", value: data.description },
              { key: "short_description", value: data.short_description },
              { key: "image", value: imageValue }, // Use uploaded image URL
              { key: "url", value: data.url },
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
      `/app/customcontentid/${NewRecordID}?successMessage=Record created successfully`,
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
              { key: "content_field", value: data.content_field },
              { key: "description", value: data.description },
              { key: "short_description", value: data.short_description },
              { key: "image", value: imageValue }, // Use uploaded image URL
              { key: "url", value: data.url },
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
      `/app/customcontentid/${params.id}?successMessage=Record updated successfully`,
    );
  }

  return redirect(`/app/customcontentid/${params.id}`);
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
    const form = new FormData();
    console.log("formState.image", formState.image);
    Object.keys(formState).forEach((key) => {
      if (key === "image" && formState.image instanceof File) {
        form.append("imageFile", formState.image);
      } else {
        form.append(key, formState[key]);
      }
    });

    submit(form, { method: "post", encType: "multipart/form-data" });
    setCleanFormState({ ...formState });
  }

  const [file, setFile] = useState();

  const handleDropZoneDrop = useCallback(
    (_dropFiles, acceptedFiles, _rejectedFiles) => {
      setFile(acceptedFiles[0]);
      setFormState({ ...formState, image: acceptedFiles[0] });
    },
    [],
  );

  const validImageTypes = ["image/gif", "image/jpeg", "image/png"];

  const fileUpload = !file && (
    <DropZone.FileUpload actionHint="Accepts .gif, .jpg, and .png" />
  );
  const uploadedFile = file && (
    <LegacyStack>
      <Thumbnail
        size="small"
        alt={file.name}
        source={
          validImageTypes.includes(file.type)
            ? window.URL.createObjectURL(file)
            : NoteMinor
        }
      />
      <div>
        {file.name}{" "}
        <Text variant="bodySm" as="p">
          {file.size} bytes
        </Text>
      </div>
    </LegacyStack>
  );

  return (
    <Page
      backAction={{ content: "Custom Content", url: "/app/customcontent" }}
      title={formState.id ? "Edit Content" : "Add Content"}
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
              label="Content Field"
              value={formState.content_field}
              onChange={(value) =>
                setFormState({ ...formState, content_field: value })
              }
              error={errors.content_field}
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
            <TextField
              label="Short Description"
              value={formState.short_description}
              onChange={(value) =>
                setFormState({ ...formState, short_description: value })
              }
              error={errors.short_description}
            />
            <DropZone
              allowMultiple={false}
              onDrop={handleDropZoneDrop}
              label="Image"
              accept="image/*"
              type="image"
              error={errors.image}
            >
              {uploadedFile}
              {fileUpload}
            </DropZone>
            <TextField
              label="URL"
              value={formState.url}
              onChange={(value) => setFormState({ ...formState, url: value })}
              error={errors.url}
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
              error={errors.status}
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
