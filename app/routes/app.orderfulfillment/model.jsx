import {
  Page,
  Card,
  InlineStack,
  TextContainer,
  Badge,
  Icon,
  Button,
  TextField,
  Grid,
  BlockStack,
} from "@shopify/polaris";
import { ClockIcon } from "@shopify/polaris-icons";

import { useState, useEffect, useCallback } from "react";
import { useAppBridge, Modal } from "@shopify/app-bridge-react";
import { fetchGraphQL } from "../../lib/graphql";

export default function OrderModal({ id, customStatus }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [doneStepsLength, setDoneStepsLength] = useState(0);
  const [steps, setSteps] = useState([]);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchOrderLogs = async () => {
    const query = `
          {
              metaobjects(type: "custom_order_status_log", query:"display_name:${id}", first: 250) {
                  edges {
                  node {
                      id
                      type
                      updatedAt
                      fields {
                          key
                          value
                          jsonValue
                      }
                  }
                  }
              }
          }
        `;
    const respdata = await fetchGraphQL(query);
    const data = respdata?.metaobjects?.edges.map((edge) => {
      const fields = edge.node.fields.reduce((acc, field) => {
        acc[field.key] = field.jsonValue;
        return acc;
      }, {});
      return {
        id: edge.node.id,
        type: edge.node.type,
        updatedAt: edge.node.updatedAt,
        ...fields,
      };
    });

    return data;
  };

  const load = async () => {
    if (!id) return;
    const sortedDoneSteps = await fetchOrderLogs();

    setDoneStepsLength(sortedDoneSteps.length - 1);
    const lastDoneStep = sortedDoneSteps[sortedDoneSteps.length - 1];
    const lastDoneStepIndex = customStatus.findIndex(
      (step) => step.order_status_title === lastDoneStep?.custom_order_status,
    );

    const remainingSteps = customStatus
      .slice(lastDoneStepIndex + 1)
      .map((step) => ({
        ...step,
      }));
    if (remainingSteps.length > 0) {
      remainingSteps[0]["active_step"] = true;
    }
    const allSteps = [...sortedDoneSteps, ...remainingSteps];

    setSteps(allSteps);
    console.log("allSteps", allSteps);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSteps([]);
    load();
  }, [id]);

  const [remarks, setRemarks] = useState("");

  const handleRemarkSubmit = async (step, index) => {
    setLoadingSubmit(true);

    const mutationQuery = `
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
      }
    `;

    const updateOrderTagsMutation = `
    mutation updateOrderTags($input: OrderInput!) {
      orderUpdate(input: $input) {
        order {
          id
          tags
        }
        userErrors {
          message
          field
        }
      }
    }
  `;

    const variables = {
      metaobject: {
        type: "custom_order_status_log",
        fields: [
          { key: "custom_order_status", value: step.order_status_title },
          { key: "remarks", value: remarks },
          { key: "order_ref_id", value: id },
        ],
      },
    };

    const tagResponse = await fetchGraphQL(updateOrderTagsMutation, {
      input: {
        id: "gid://shopify/Order/" + id,
        tags: ["fcos:" + step.order_status_title],
      },
    });

    if (
      tagResponse?.orderUpdate?.userErrors.length > 0 ||
      !tagResponse.orderUpdate
    ) {
      console.error(
        "Error updating order tags:",
        tagResponse.orderUpdate.userErrors,
      );
      shopify.toast.show("Error updating order tags");
      return;
    }

    const response = await fetchGraphQL(mutationQuery, variables);

    if (response?.metaobjectCreate?.userErrors.length > 0) {
      console.error(
        "Error saving remarks:",
        response.metaobjectCreate.userErrors,
      );
      shopify.toast.show(
        "Error saving remarks: " +
          JSON.stringify(response.metaobjectCreate.userErrors),
      );
    } else {
      const newLog = {
        id: response.metaobjectCreate.metaobject.id,
        custom_order_status: step.order_status_title,
        remarks,
        order_ref_id: id,
        type: "custom_order_status_log",
        active_step: false,
        updatedAt: new Date().toISOString(),
      };

      console.log(index, steps.length, steps[index]);

      steps[index] = { ...steps[index], ...newLog };

      if (steps.length > index) {
        steps[index + 1]["active_step"] = true;
      }
      setSteps((prevSteps) => [...prevSteps]);
      setRemarks("");
      shopify.toast.show("Remarks and tags updated successfully!");
    }

    setLoadingSubmit(false);
  };

  const stepCard = (data, index) => {
    const date = new Date(data.updatedAt);
    return (
      <>
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <div
              style={{
                borderRadius: "50%",
                padding: 8,
                borderWidth: 4,
                backgroundColor: "#2c6ecb",
                fill:
                  data.type === "custom_order_status" && !data.active_step
                    ? "#6b7280"
                    : "#ffffff",
                color:
                  data.type === "custom_order_status" && !data.active_step
                    ? "#6b7280"
                    : "#ffffff",
                borderColor: "#2c6ecb",
                height: "40px",
                width: "40px",
              }}
            >
              <ClockIcon style={{ height: 24, width: 24 }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              {data.type === "custom_order_status_log"
                ? data.custom_order_status
                : data.order_status_title}
            </h3>
            {data.type === "custom_order_status_log" && (
              <div style={{ marginTop: 8, fontSize: 14, color: "#6b7280" }}>
                <p>
                  Completed on: {date.toDateString()} at{" "}
                  {date.toTimeString().split(" ")[0]}
                </p>
                <p>remarks: {data?.remarks}</p>
                {/* <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-user"
                    style={{ height: 16, width: 16, marginRight: 4 }}
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx={12} cy={7} r={4} />
                  </svg>
                  Completed by: John Doe
                </p> */}
              </div>
            )}

            {data.type === "custom_order_status" && data.active_step && (
              <div style={{ marginTop: 16 }}>
                <BlockStack>
                  <TextField
                    label="Remarks"
                    value={remarks}
                    onChange={(value) => setRemarks(value)}
                    multiline={3}
                    placeholder="Enter any remarks or special instructions"
                  />
                </BlockStack>
                <div style={{ height: "5px" }}></div>
                <Button
                  primary
                  fullWidth
                  loading={loadingSubmit}
                  onClick={() => {
                    handleRemarkSubmit(data, index);
                  }}
                >
                  Complete Status
                </Button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <Modal id="fillfilmtentd">
        {loading ? (
          <h1>Loading...</h1>
        ) : (
          <div style={{ padding: "12px" }}>
            {steps.map((status, index) => {
              return stepCard(status, index);
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
