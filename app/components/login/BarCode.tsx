import { Form, FormLayout, TextField, Button, Card } from "@shopify/polaris";
import { ShopcodesIcon } from "@shopify/polaris-icons";
import { useState } from "react";

const Barcode = () => {
  const [barcode, setBarcode] = useState("");

  const handleSubmit = () => {
    // Handle barcode login logic here
    console.log("Login attempted with barcode:", barcode);
  };

  return (
    <Card>
      <Form onSubmit={handleSubmit}>
        <FormLayout>
          <TextField
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            autoComplete="off"
            placeholder="Enter your barcode to login"
          />
          <div className="flex border border-dashed border-gray-300 rounded-md p-4 flex-col items-center gap-2">
            <ShopcodesIcon className="h-20 w-20" />
            Scan QR code to login
          </div>
          <Button submit variant="primary" fullWidth>
            Login with Barcode
          </Button>
        </FormLayout>
      </Form>
    </Card>
  );
};

export default Barcode;
