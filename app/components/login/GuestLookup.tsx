import { Form, FormLayout, TextField, Button, Card } from "@shopify/polaris";
import { useState } from "react";

const GuestLookup = () => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleSubmit = () => {
    // Handle guest lookup logic here
    console.log("Guest lookup attempted with:", {
      name,
      phoneNumber,
      dateOfBirth: selectedDate,
    });
  };

  return (
    <Card>
      <Form onSubmit={handleSubmit}>
        <FormLayout>
          <TextField
            label="Full Name"
            value={name}
            onChange={setName}
            autoComplete="name"
            placeholder="Enter your full name"
          />

          <TextField
            label="Phone Number"
            type="number"
            value={phoneNumber}
            onChange={setPhoneNumber}
            autoComplete="number"
            placeholder="Enter your phone number"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Select date"
            />
          </div>

          <Button submit variant="primary" fullWidth>
            Get
          </Button>
        </FormLayout>
      </Form>
    </Card>
  );
};

export default GuestLookup;
