// route.tsx
import React, { useState, useEffect } from "react";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useParams,
  useNavigate,
  redirect,
  useSearchParams,
} from "@remix-run/react";
import { fetchGraphQL } from "../../lib/graphql";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Page, Banner, Card, Text } from "@shopify/polaris";
import OrderForm from "./OrderForm";
import { authenticate } from "../../shopify.server";
import { NoteIcon } from "@shopify/polaris-icons";

export async function loader({ request, params }) {
  const { id } = params;

  if (!id) {
    throw new Error("Order ID is required");
  }
  const { admin, session } = await authenticate.admin(request);
  const query = `
      query Order($id: ID!) {
        order(id: $id) {
          id
          name
          email
          note
          tags
           customer {
            firstName
            lastName
            email
            phone
            registration_no:metafield(key: "registration_no", namespace: "custom") {
              value
            }
            guest_status:metafield(key: "guest_status_", namespace: "custom") {
              value
            }
            addressesV2(first:1){
              edges{
                node{
                    address1
                    address2
                    city
                    province
                    zip
                    country
                }
              }
            }
          }
           lineItems(first: 250) {
              edges {
                node {
                  id
                  quantity
                  name
                  image{
                    url
                  }
                  discountedTotalSet{
                    presentmentMoney{
                      amount
                      currencyCode
                    }
                  }
                  variant {
                    image{
                      url
                    }
                  }
                  product{
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
                  }
                }
              }
           }
            displayFinancialStatus
            displayFulfillmentStatus
            createdAt
            confirmationNumber
             shippingAddress{
               address1
               address2
               city
               province
               zip
               country
             }
             events(first: 250,  query:"verb:comment") {
              edges{
                node{
                 id
                
                }
              }
            }
          fullfillment:metafield(key: "fullfillment_", namespace: "custom") {
            value
          }
          custom_order_status:metafield(key: "custom_order_status", namespace: "custom") {
            value
          }
          custom_order_logs:metafield(key: "custom_order_logs", namespace: "custom") {
            value
          }
          store_location:metafield(key: "store_location", namespace: "custom") {
            value
          }
          delivery_option:metafield(key: "delivery_option", namespace: "custom") {
            value
          }
          pickup_date_time:metafield(key: "pickup_date_time", namespace: "custom") {
            value
          }
          pickup_person_last_name:metafield(key: "pickup_person_last_name", namespace: "custom") {
            value
          }
          pickup_person_first_name:metafield(key: "pickup_person_first_name_", namespace: "custom") {
            value
          }
          pickup_person_mobile:metafield(key: "pickup_person_mobile", namespace: "custom") {
            value
          }


          substitute_preference_note:metafield(key: "substitute_preference_note_", namespace: "custom") {
            value
          }
          consent:metafield(key: "consent_", namespace: "custom") {
            value
          }
          arrival_message:metafield(key: "arrival_message", namespace: "custom") {
            value
          }
        }
      }
    `;

  const variables = { id: "gid://shopify/Order/" + id };
  const data = await fetchGraphQL(query, variables, true);
  // const dataReq = await admin.graphql(query, { variables });
  // const { data } = await dataReq.json();
  //////////////////////////////////////////

  const customStatusResponse = await admin.graphql(
    `{
      metaobjects(type: "custom_order_status", first: 250) {
        edges {
          node {
            id
            type
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

  const customStatusjson = await customStatusResponse.json();

  const customStatus = customStatusjson.data.metaobjects.edges.map((edge) => {
    const fields = edge.node.fields.reduce((acc, field) => {
      acc[field.key] = field.jsonValue;
      return acc;
    }, {});
    return {
      id: edge.node.id,
      handle: edge.node.handle,
      type: edge.node.type,
      ...fields,
    };
  });

  const sortedCustomStatus = customStatus.sort(
    (a, b) => a.sequence_no - b.sequence_no,
  );

  return {
    order: data?.order,
    id,
    customStatus: sortedCustomStatus,
  };
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const { admin, session } = await authenticate.admin(request);
  const { id } = params;

  const newStatus = formData.get("custom_order_status") || "";
  const prevStatus = formData.get("prevStatus") || "";
  const prevOrderLog = JSON.parse(formData.get("prevOrderLog") || "[]");

  const userFirstName = session.onlineAccessInfo?.associated_user?.first_name;
  const userLastName = session.onlineAccessInfo?.associated_user?.last_name;

  console.log("session", session, session?.onlineAccessInfo);

  let updatedLogs = [...prevOrderLog];

  if (newStatus && newStatus !== prevStatus) {
    const logEntry = {
      orderNo: id,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toISOString().split("T")[1].split(".")[0],
      fromStatus: prevStatus,
      toStatus: newStatus,
      userName: `${userFirstName} ${userLastName}`,
      storeName: session?.shop,
    };
    updatedLogs.push(logEntry);
  }

  const input = {
    id: "gid://shopify/Order/" + id,
    tags: formData.get("tags")
      ? formData
          .get("tags")
          .split(",")
          .map((tag) => tag.trim())
      : [],
    // email: formData.get("email") || null,
    note: formData.get("note") || null,
    metafields: [
      {
        namespace: "custom",
        key: "custom_order_logs",
        type: "json",
        value: JSON.stringify(updatedLogs),
      },
      {
        namespace: "custom",
        key: "custom_order_status",
        type: "single_line_text_field",
        value: newStatus,
      },
      {
        namespace: "custom",
        key: "fullfillment_",
        type: "json",
        value: formData.get("fullfillment") || "[]",
      },
    ],
  };

  const mutation = `
        mutation orderUpdate($input: OrderInput!) {
          orderUpdate(input: $input) {
            order {
              id
              tags
              note
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

  const variables = { input };

  try {
    const data = await fetchGraphQL(mutation, variables, true);
    if (data?.orderUpdate?.userErrors?.length) {
      return { errors: data.orderUpdate.userErrors };
    }
    // return { success: true, orderId: id };
    const redirectPath = `/app/fresh-posid/orders/${id.split("/").pop()}?successMessage=Order updated successfully`;
    return redirect(redirectPath);
  } catch (error) {
    console.error("Error updating order:", error);
    return { errors: ["Failed to update order", JSON.stringify(error)] };
  }
}

export default function OrderRoute() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const errors = useActionData()?.errors || {};
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState("");
  const [searchParams] = useSearchParams();

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

  const orderData = {
    ...loaderData?.order,
    tags: loaderData?.order?.tags?.join(", ") || "",
    note: loaderData?.order?.note || "",
    customer: {
      ...loaderData?.order?.customer,
      addresses: loaderData?.order?.customer?.addressesV2?.edges?.map(
        (edge) => ({ ...edge.node }),
      )[0],
    },
    custom_order_logs: JSON.parse(
      loaderData?.order?.custom_order_logs?.value || "[]",
    ),
    custom_order_status: loaderData?.order?.custom_order_status?.value || "",
    // timelineComments: loaderData?.order?.events?.edges.map((edge) => ({ ...edge.node})),
  };

  const handleSave = async (input) => {
    console.log("input", input);
    setLoading(true);
    const formData = new FormData();
    Object.entries({
      ...input,
      prevStatus: orderData?.custom_order_status,
      prevOrderLog: loaderData?.order?.custom_order_logs?.value || "[]",
    }).forEach(([key, value]) => {
      formData.append(key, value);
    });
    submit(formData, { method: "post" });
    setLoading(false);
  };

  return (
    <Page
      backAction={{ content: "Orders", url: "/app/fresh-pos/orders" }}
      title={`Order ${loaderData?.order?.name}`}
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
      <OrderForm
        initialOrder={orderData}
        onSave={handleSave}
        loading={loading}
        errors={actionData?.errors}
        customStatus={loaderData?.customStatus || []}
      />

      {orderData?.custom_order_logs.length > 0 && (
        <div className="my-2">
          <Card sectioned>
            <Text variant="bodyLg" as="h2">
              Order Status Updates
            </Text>
            <div className="relative pt-2">
              {orderData?.custom_order_logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 mb-6 relative"
                >
                  {/* Vertical Line */}
                  {index !== orderData?.custom_order_logs.length - 1 && (
                    <div className="absolute left-2.5 top-6 h-full w-0.5 bg-gray-300"></div>
                  )}

                  {/* Dot Indicator */}
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>

                  {/* Status Change Details */}
                  <div className="flex flex-col">
                    <Text variant="bodyMd" as="h2">
                      Status changed from{" "} <span className="font-semibold">{log.fromStatus}</span> to{" "}
                      <span className="font-semibold">{log.toStatus}</span>
                    </Text>
                    <span className="text-xs text-gray-400">
                      {log.date} at {log.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
