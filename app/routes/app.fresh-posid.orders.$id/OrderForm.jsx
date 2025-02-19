// app/fresh-posid/customers/$id/CustomerForm.tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Card,
  TextField,
  Select,
  FormLayout,
  Button,
  Text,
  Layout,
  Image,
  DataTable,
  Banner,
  Checkbox,
} from "@shopify/polaris";
import { Loader2 } from "lucide-react";
import MetaobjectSearch from "../../components/MetaobjectSearch";

function OrderForm({
  initialOrder = {},
  onSave,
  loading,
  errors,
  customStatus = [],
}) {
  const [order, setOrder] = useState(initialOrder);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [fullfillmentData, setFullfillmentData] = useState([]);

  useEffect(() => {
    if (!order?.lineItems?.edges) return;

    let parsedFulfillment = [];
    try {
      parsedFulfillment = JSON.parse(order?.fullfillment?.value || "[]");
    } catch (error) {
      console.error("Error parsing fullfillment data:", error);
      parsedFulfillment = [];
    }

    console.log("parsedFulfillment", parsedFulfillment);

    const fulfillmentMap = new Map(
      parsedFulfillment.map((item) => [item.id, item]),
    );

    const updatedData = order?.lineItems?.edges.map((edge) => ({
      ...edge.node,
      id: edge.node.id,
      name: edge.node.name,
      bagNo: fulfillmentMap.get(edge.node.id)?.bagNo || "",
      fulfilments: fulfillmentMap.get(edge.node.id)?.fulfilments || false,
    }));

    console.log("updatedData", updatedData);

    setFullfillmentData(updatedData);
  }, [order]);

  // Extract status titles
  const statusOptions = customStatus.map((status) => ({
    label: status.order_status_title,
    value: status.order_status_title,
  }));

  // Set initial status based on tags
  useEffect(() => {
    const fcosTag = (order?.tags || "")
      ?.split(",")
      ?.find((tag) => tag.startsWith("fcos:"));
    if (fcosTag) {
      const initialStatus = fcosTag.replace("fcos:", "");
      setSelectedStatus(initialStatus);
    }
  }, [order.tags]);

  const handleInputChange = useCallback((field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleStatusChange = useCallback((value) => {
    if (!value) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(value);
    }
  }, []);

  const handleFullfillmentChange = (id, field, value) => {
    setFullfillmentData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          console.log("fdfdsf", item, { ...item, [field]: value });
        }
        return item.id === id ? { ...item, [field]: value } : item;
      }),
    );
  };

  const handleSave = (event) => {
    event.preventDefault();

    let tags = order.tags.split(",") || [];

    // Remove existing fcos tag
    tags = tags.filter((tag) => !tag.startsWith("fcos:"));

    // Add the new tag if a status is selected
    if (selectedStatus) {
      tags.push(`fcos:${selectedStatus}`);
    }

    console.log("fullfillmentData", fullfillmentData);

    const input = {
      tags: tags.join(","),
      email: order.email,
      note: order.note,
      custom_order_status: order.custom_order_status,
      fullfillment: JSON.stringify(
        fullfillmentData.length > 0
          ? fullfillmentData.map(({ id, name, bagNo, fulfilments }) => ({
              id,
              name,
              bagNo,
              fulfilments,
            }))
          : [],
      ),
    };
    onSave(input);
  };

  const rowMarkup = fullfillmentData.map((item) => [
    <div className="w-16 h-16">
      <Image
        src={item?.image?.url}
        alt={item?.name}
        fill
        className="object-cover rounded-md"
      />
    </div>,
    item?.name,
    item?.product?.storage?.value || "",
    item?.product?.order_points?.value || "",
    item?.product?.per_order_limit?.value || "",
    item?.product?.bagging_score?.value || "",
    <TextField value={item?.quantity} type="number" readOnly />,
    <TextField
      value={item?.bagNo || ""}
      type="number"
      onChange={(v) => handleFullfillmentChange(item.id, "bagNo", v)}
      autoComplete="no"
    />,
    <div className="flex justify-center">
      <Checkbox
        checked={item?.fulfilments || false}
        onChange={(v) => handleFullfillmentChange(item.id, "fulfilments", v)}
      />
    </div>,
  ]);

  return (
    <Card sectioned>
      <form onSubmit={handleSave} className="space-y-4">
        <Text variant="headingLg" as="h1">
          Order Details
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <Text variant="headingMd" as="h2">
              Guest Details
            </Text>
            <div className="h-2" />
            <FormLayout>
              <TextField
                label="Registration No"
                value={order?.customer?.registration_no?.value || ""}
                readOnly
              />
              <TextField
                label="First name"
                value={`${order?.customer?.firstName || ""}`}
                readOnly
              />
              <TextField
                label="Last name"
                value={`${order?.customer?.lastName || ""}`}
                readOnly
              />
              <TextField
                label="Mobile"
                value={order?.customer?.phone || ""}
                readOnly
              />
              <TextField
                label="Zip Code"
                value={order?.customer?.addresses?.zip || ""}
                readOnly
              />
              <TextField
                label="Status"
                value={order?.customer?.guest_status?.value || ""}
                readOnly
              />
            </FormLayout>
          </Card>

          <Card>
            <Text variant="headingMd" as="h2">
              Pickup information
            </Text>
            <div className="h-2" />
            <FormLayout>
              <TextField
                label="Delivery Options"
                value={order?.delivery_option?.value || ""}
                readOnly
              />
              <TextField
                label="Pickup date time"
                value={
                  order?.pickup_date_time?.value
                    ? new Date(order?.pickup_date_time?.value).toDateString()
                    : ""
                }
                readOnly
              />
            </FormLayout>
            <div className="h-4" />
            <Text variant="headingMd" as="h2">
              Alternate Pickup Person
            </Text>
            <div className="h-2" />
            <FormLayout>
              <TextField
                label="First Name"
                value={order?.pickup_person_first_name?.value || ""}
                readOnly
              />
              <TextField
                label="Last Name"
                value={order?.pickup_person_last_name?.value || ""}
                readOnly
              />
              <TextField
                label="Mobile"
                value={order?.pickup_person_mobile?.value || ""}
                readOnly
              />
              <TextField
                label="Store Location"
                value={order?.store_location?.value || ""}
                readOnly
                multiline={3}
              />
              <TextField
                label="Substitute Preference Note"
                value={order?.substitute_preference_note?.value || ""}
                readOnly
                multiline={3}
              />
              <TextField
                label="Consent"
                value={
                  order?.consent?.value === "true"
                    ? "Yes"
                    : order?.consent?.value === "false"
                      ? "No"
                      : ""
                }
                readOnly
              />
              <TextField
                label="Arrival Message"
                value={order?.arrival_message?.value || ""}
                readOnly
              />
            </FormLayout>
          </Card>
        </div>
        <Layout>
          <Layout.Section oneHalf>
            <Card>
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "numeric",
                  "numeric",
                  "text",
                  "numeric",
                  "text",
                  "text",
                ]}
                headings={[
                  "Image",
                  "Product",
                  "Storage",
                  "Order Points",
                  "Order Limit",
                  "Baggage",
                  "Quantity",
                  "Bag No",
                  "Pick",
                ]}
                rows={rowMarkup}
                fixedFirstColumns
              />
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <Text variant="headingMd" as="h2">
            Edit Order Details
          </Text>
          <div className="h-2" />
          <FormLayout>
            <Select
              label="Custom Status"
              options={statusOptions}
              value={order.custom_order_status}
              onChange={(v) => handleInputChange("custom_order_status", v)}
              allowClear
            />
            {/* <MetaobjectSearch
              objectType="custom_order_status"
              label="Custom Status"
              onChange={(v) => handleInputChange("custom_order_status", v)}
              value={order.custom_order_status}
              error=""
            /> */}

            <TextField
              label="Note"
              value={order.note}
              multiline={3}
              onChange={(v) => handleInputChange("note", v)}
            />
          </FormLayout>
          <div className="flex pt-2">
            <Button variant="primary" submit disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Save
            </Button>
            <div className="w-2" />
            <Button variant="secondary">Print</Button>
          </div>
          {errors && (
            <div className="mt-4">
              <ul className="list-disc list-inside text-red-500">
                {errors.map((error, index) => (
                  <li key={index}>{error.message || error}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </form>
    </Card>
  );
}

export default OrderForm;
