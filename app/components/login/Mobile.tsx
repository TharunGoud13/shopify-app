import { useSubmit, useActionData, useNavigation } from "@remix-run/react";
import { Form, FormLayout, TextField, Button, Card, Text } from "@shopify/polaris";
import { useState } from "react";

const Mobile = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const submit = useSubmit();
  const data = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = data?.errors;

  const handleSubmit = () => {
    submit(
      { mobileNumber, password, type: "mobileNumber" },
      { method: "post" },
    );
  };

  return (
    <Card>
      {errors && (
        <Text variant="bodySm" tone="critical">
          {errors}
        </Text>
      )}
      <div className="space-y-2">
        <TextField
          label="Mobile Number"
          type="number"
          value={mobileNumber}
          onChange={setMobileNumber}
          autoComplete="tel"
          placeholder="Enter your mobile number"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Enter your password"
        />
        <Button
          onClick={handleSubmit}
          variant="primary"
          fullWidth
          loading={isSubmitting}
        >
          Login with Mobile
        </Button>
      </div>
    </Card>
  );
};

export default Mobile;
