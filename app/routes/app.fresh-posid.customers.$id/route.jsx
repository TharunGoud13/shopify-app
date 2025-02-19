// app/fresh-posid/customers/$id/route.tsx
import React, { useState, useEffect } from "react";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useParams,
  useSearchParams,
  useNavigate,
  redirect,
} from "@remix-run/react";
import CustomerForm from "./CustomerForm";
import { fetchGraphQL } from "../../lib/graphql";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Page, Banner } from "@shopify/polaris";
// import { json, redirect } from "@remix-run/node";

export async function loader({ params }) {
  const { id } = params;

  if (!id || id === "new") {
    return {
      customer: {
        taxExempt: false,
        addresses: [{ countryCode: "US" }],
      },
      id,
    };
  }

  const query = `
    query Customer($id: ID!) {
      customer(id: $id) {
        id
        firstName
        lastName
        email
        phone
        locale
        note
        tags
        taxExempt
        addresses {
          address1
          address2
          city
          provinceCode
          zip
          countryCode
        }
      
      }
    }
  `;

  const variables = { id: "gid://shopify/Customer/" + id };
  const data = await fetchGraphQL(query, variables, true);
  return {
    customer: data?.customer,
    id,
  };
}

export async function action({ request }) {
  const formData = await request.formData();
  let customerId = formData.get("id");
  let createdCustomerId = null;

  const input = {};

  // Set fields only if their values are not empty
  if (formData.get("firstName")) input.firstName = formData.get("firstName");
  if (formData.get("lastName")) input.lastName = formData.get("lastName");
  if (formData.get("email")) input.email = formData.get("email");
  if (formData.get("phone")) input.phone = formData.get("phone");
  if (formData.get("locale")) input.locale = formData.get("locale");
  if (formData.get("note")) input.note = formData.get("note");
  if (formData.get("tags")) input.tags = formData.get("tags");
  if (formData.get("taxExempt"))
    input.taxExempt = formData.get("taxExempt") === "true";

  const address = {
    address1: formData.get("address1"),
    address2: formData.get("address2"),
    city: formData.get("city"),
    provinceCode: formData.get("provinceCode"),
    zip: formData.get("zip"),
    countryCode: formData.get("countryCode"),
  };

  const isAddressNotEmpty = Object.values(address).some((value) => value);

  if (isAddressNotEmpty) {
    input.addresses = [address];
  }

  console.log("input", input);

  let mutation = `
       mutation customerCreate($input: CustomerInput!) {
         customerCreate(input: $input) {
          customer{
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
  let customerCreatedId;
  if (customerId) {
    mutation = `
            mutation customerUpdate($input: CustomerInput!) {
                customerUpdate(input: $input) {
                  customer{
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
      input: { id: customerId, ...input },
    };
  }
  try {
    const customerData = await fetchGraphQL(mutation, variables, true);

    if (
      customerData?.customerCreate?.userErrors?.length ||
      customerData?.customerUpdate?.userErrors?.length
    ) {
      return {
        errors:
          customerData?.customerCreate?.userErrors ||
          customerData?.customerUpdate?.userErrors,
      };
    }
    customerCreatedId =
      customerData?.customerCreate?.customer?.id ||
      customerData?.customerUpdate?.customer?.id;

    const redirectPath = customerId
      ? `/app/fresh-posid/customers/${customerId.split("/").pop()}?successMessage=Customer updated successfully`
      : `/app/fresh-posid/customers/${customerCreatedId.split("/").pop()}?successMessage=Customer created successfully`;
    return redirect(redirectPath);
  } catch (error) {
    console.log(error);
    return { errors: ["Failed to save customer", JSON.stringify(error)] };
  }
}

export default function CustomerRoute() {
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
    const formData = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (loaderData?.customer?.id) {
      formData.append("id", loaderData.customer.id);
    }
    submit(formData, { method: "post" });

    setLoading(false);
  };

  const customerData = {
    ...loaderData?.customer,
    tags: loaderData?.customer?.tags?.join(", ") || "",
    address1: loaderData?.customer?.addresses?.[0]?.address1 || "",
    address2: loaderData?.customer?.addresses?.[0]?.address2 || "",
    city: loaderData?.customer?.addresses?.[0]?.city || "",
    provinceCode: loaderData?.customer?.addresses?.[0]?.provinceCode || "",
    zip: loaderData?.customer?.addresses?.[0]?.zip || "",
    countryCode: loaderData?.customer?.addresses?.[0]?.countryCode || "",
  };

  return (
    <Page
      backAction={{ content: "Customers", url: "/app/fresh-pos/customers" }}
      title={loaderData?.customer?.id ? "Edit Customer" : "Add Customer"}
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
      <CustomerForm
        initialCustomer={customerData}
        onSave={handleSave}
        loading={loading}
        errors={actionData?.errors}
      />
    </Page>
  );
}
