import {
  Form,
  FormLayout,
  TextField,
  Button,
  Card,
  Text,
} from "@shopify/polaris";
import { useState } from "react";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";

export default function Email({}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = useSubmit();
  const data = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = data?.errors;

  function handleSubmit() {
    console.log("submit");
    submit({ email, password, type: "email" }, { method: "post" });
  }

  return (
    <Card>
        {errors ? (
          <Text variant="bodySm" tone="critical">
            {errors}
          </Text>
        ) : (
          <></>
        )}
        <div className="space-y-2">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="Enter your email"
            name="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            name="password"
            placeholder="Enter your password"
          />
          <Button
            // submit
            variant="primary"
            fullWidth
            // loading={isSubmitting}
            onClick={() => {
              handleSubmit()
            }}
          >
            Login with Email
          </Button>
        </div>
    </Card>
  );
}
