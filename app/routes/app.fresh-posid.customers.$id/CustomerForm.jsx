// app/fresh-posid/customers/$id/CustomerForm.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  TextField,
  Select,
  FormLayout,
  Button,
  Text,
} from "@shopify/polaris";
import { Loader2 } from "lucide-react";

function CustomerForm({ initialCustomer = {}, onSave, loading, errors }) {
  const initialAddress = initialCustomer.addresses?.[0] || {};
  const [customer, setCustomer] = useState(initialCustomer);
  const [address, setAddress] = useState(initialAddress);

  const errorsData = errors
    ? errors.reduce((acc, err) => ({ ...acc, [err.field]: err.message }), {})
    : {};
  const handleInputChange = useCallback((field, value) => {
    if (field === "tags") {
      setCustomer((prev) => ({ ...prev, [field]: value }));
      return;
    }
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressChange = useCallback((field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(
    (event) => {
      console.log("country", address.countryCode);
      event.preventDefault();

      const input = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        locale: customer.locale,
        note: customer.note,
        tags: customer.tags.split(",").map((tag) => tag.trim()),
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        provinceCode: address.provinceCode,
        zip: address.zip,
        countryCode: address.countryCode,
      };
      onSave(input);
    },
    [onSave, customer, address],
  );

  const countryCodes = [
    { label: "United States", value: "US" },
    { label: "Canada", value: "CA" },
    { label: "United Kingdom", value: "GB" },
    { label: "Australia", value: "AU" },
    { label: "India", value: "IN" },
  ];

  useEffect(() => {
    setCustomer(initialCustomer);
    setAddress(initialAddress);
  }, [initialCustomer]);
  return (
    <Card sectioned>
      <Text variant="headingMd" as="h2">
        {customer.id ? "Edit Customer" : "Create Customer"}
      </Text>
      <pre>{JSON.stringify(errors, null, 2)}</pre>
      <form onSubmit={handleSave}>
        <FormLayout>
          <Select
            label="Status"
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
            value={customer.status}
            onChange={(v) => handleInputChange("status", v)}
            error={errorsData?.status}
          />
          <TextField
            label="First Name"
            value={customer.firstName}
            onChange={(v) => handleInputChange("firstName", v)}
            error={errorsData?.firstName}
          />
          <TextField
            label="Last Name"
            value={customer.lastName}
            onChange={(v) => handleInputChange("lastName", v)}
            error={errorsData?.lastName}
          />
          <Select
            label="Gender"
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Other", value: "other" },
            ]}
            value={customer.gender}
            onChange={(v) => handleInputChange("gender", v)}
            error={errorsData?.gender}
          />
          <TextField
            label="Email"
            value={customer.email}
            type="email"
            onChange={(v) => handleInputChange("email", v)}
            error={errorsData?.email}
          />
          <TextField
            label="Phone Number"
            value={customer.phone}
            onChange={(v) => handleInputChange("phone", v)}
            error={errorsData?.phone}
          />

          <TextField
            label="Address 1"
            value={address.address1}
            onChange={(v) => handleAddressChange("address1", v)}
            error={errorsData?.address1}
          />
          <TextField
            label="Address 2"
            value={address.address2}
            onChange={(v) => handleAddressChange("address2", v)}
            error={errorsData?.address2}
          />
          <TextField
            label="City"
            value={address.city}
            onChange={(v) => handleAddressChange("city", v)}
            error={errorsData?.city}
          />
          <TextField
            label="State"
            value={address.provinceCode}
            onChange={(v) => handleAddressChange("provinceCode", v)}
            error={errorsData?.state}
          />
          <TextField
            label="Zip Code"
            value={address.zip}
            onChange={(v) => handleAddressChange("zip", v)}
            error={errorsData?.zip}
          />
          <Select
            label="Country"
            options={countryCodes}
            value={address.countryCode || "US"}
            onChange={(v) => handleAddressChange("countryCode", v)}
            error={errorsData?.countryCode}
          />
          <TextField
            label="Tags"
            value={customer.tags}
            onChange={(v) => handleInputChange("tags", v)}
            error={errorsData?.tags}
          />
          <Select
            label="Language"
            options={[
              { label: "English", value: "en" },
              { label: "French", value: "fr" },
              { label: "Spanish", value: "es" },
              { label: "Arabic", value: "ar" },
              { label: "Chinese", value: "zh" },
              { label: "German", value: "de" },
            ]}
            value={customer.locale}
            onChange={(v) => handleInputChange("locale", v)}
            error={errorsData?.locale}
          />
          <TextField
            label="Note"
            value={customer.note}
            multiline={3}
            onChange={(v) => handleInputChange("note", v)}
            error={errorsData?.note}
          />

          <Button primary submit disabled={loading}>
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

export default CustomerForm;
