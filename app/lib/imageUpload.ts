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

/**
 * Uploads an image file to Shopify and returns the resulting file ID.
 *
 * @param {File} imageFile - The image file to upload.  Must be a File object obtained from a form.
 * @param {object} admin - The Shopify Admin API client.  Must have a `graphql` method for making GraphQL requests.
 * @returns {Promise<string>} - A promise that resolves to the Shopify file ID, or null if the upload fails.
 * @throws {Error} - Throws an error if the upload or file creation process fails at any stage.
 */
export async function uploadImageAndGetFileId(
  imageFile: any,
  admin: any,
  urlOnly: boolean = false,
) {
  if (!imageFile) {
    console.log("No image file provided.");
    return null; // Or throw an error, depending on desired behavior
  }

  if (!admin || typeof admin.graphql !== "function") {
    throw new Error(
      "Invalid admin object provided.  Must have a `graphql` method.",
    );
  }

  try {
    // 1. Staged Upload Target Create
    const stagedUploadResponse = await admin.graphql(
      STAGED_UPLOAD_TARGET_CREATE,
      {
        variables: {
          input: [
            {
              resource: "IMAGE",
              filename: imageFile.name,
              mimeType: imageFile.type,
              fileSize: imageFile.size?.toString(),
              httpMethod: "POST",
            },
          ],
        },
      },
    );

    const stagedUploadData = await stagedUploadResponse.json();
    const stagedTarget =
      stagedUploadData.data.stagedUploadsCreate.stagedTargets[0];

    if (!stagedTarget) {
      throw new Error("Failed to get upload URL");
    }

    const { url, parameters } = stagedTarget;

    // 2. Upload Image to Staging
    const formDataImage = new FormData();
    parameters.forEach(({ name, value }: any) => {
      formDataImage.append(name, value);
    });
    formDataImage.append("file", imageFile);

    const uploadResponse = await fetch(url, {
      method: "POST",
      body: formDataImage,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Image upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
      );
    }

    const responseText = await uploadResponse.text();
    const imageUrlMatch = responseText.match(/<Location>(.*?)<\/Location>/);

    if (!(imageUrlMatch && imageUrlMatch[1])) {
      throw new Error("Failed to extract image URL from response");
    }

    const imageUrl = imageUrlMatch[1];

    if (urlOnly) return { imageUrl, fileId: null };

    // 3. Create File in Shopify
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
            originalSource: imageUrl,
          },
        },
      },
    );

    const fileCreateDataJSON = await fileCreateData.json();

    if (fileCreateDataJSON.data.fileCreate.userErrors.length > 0) {
      const errorMessages = fileCreateDataJSON.data.fileCreate.userErrors
        .map((error: any) => `${error.field.join(".")}: ${error.message}`)
        .join(", ");
      throw new Error(`File creation failed: ${errorMessages}`);
    }

    const fileId = fileCreateDataJSON.data.fileCreate.files[0]?.id;

    if (!fileId) {
      throw new Error("Failed to get file ID after creation");
    }

    return { fileId, imageUrl };
  } catch (error) {
    console.error("Image upload process failed:", error);
    throw error; // Re-throw the error for the calling function to handle
  }
}
