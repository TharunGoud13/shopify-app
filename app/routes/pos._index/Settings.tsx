import React, { useState, useEffect } from "react";
import { TextField as PTextField, Button as PButton } from "@shopify/polaris";
import { fetchGraphQL } from "../../lib/graphql";

interface ProfileProps {
  registrationNo: string;
  firstName: string;
  lastName: string;
  email: string;
}
const Profile = ({
  registrationNo,
  firstName,
  lastName,
  email,
}: ProfileProps) => {
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);

  console.log("customerData----", customerData);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!email) return;
      setLoading(true);
      setError(null);
      try {
        const customerCheckQuery = `#graphql
            query Customers($query: String!) {
              customers(first: 1, query: $query) {
                edges {
                  node {
                    id
                     note
                     firstName
                     lastName
                     phone
                    metafields(first: 10) {
                        edges {
                          node {
                            key
                            value
                            namespace
                          }
                        }
                      }
                  }
                }
              }
            }
          `;

        const customerCheckVariables = {
          query: `email:"${email}"`,
        };
        const customerCheckResult = await fetchGraphQL(
          customerCheckQuery,
          customerCheckVariables,
          true,
        );
        console.log("customerCheckResult----", customerCheckResult);
        if (customerCheckResult?.customers?.edges?.length > 0) {
          const customer = customerCheckResult.customers.edges[0].node;
          console.log("customer----", customer);
          setCustomerData(customer);
          setPhone(customer?.phone || "");
          setNote(customer?.note || "");
        } else {
          setCustomerData(null);
        }
      } catch (error) {
        console.error("Failed to fetch customer", error);
        setError("Failed to fetch customer");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [email]);

  const formatPhoneNumber = (phoneNumber: string) => {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");

    // Ensure the number starts with a plus sign
    // This assumes US/Canada numbers. Adjust the logic if you need different country codes
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    } else if (digits.length === 11) {
      return `+${digits}`;
    }
    return null;
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s\-()]/g, "");
    setPhone(cleaned);
  };

  const handleCreateOrUpdateCustomer = async () => {
    setLoading(true);
    setError(null);
    if (!registrationNo) {
      setLoading(false);
      return;
    }
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      setError("Please enter a valid 10-digit phone number");
      setLoading(false);
      return;
    }
    try {
      let customerId = null;
      // Check if a customer with this registration number already exists via metafield
      if (customerData?.id) {
        customerId = customerData.id;
      }
      const customerInput = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        note: note,
        phone: formattedPhone,
        metafields: [
          {
            namespace: "registration",
            key: "registration_no",
            type: "single_line_text_field",
            value: registrationNo,
          },
        ],
      };

      let mutation;
      let variables;

      if (customerId) {
        mutation = `#graphql
            mutation CustomerUpdate($input: CustomerInput!) {
              customerUpdate(input: $input) {
                customer {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;
        variables = {
          input: {
            id: customerId,
            ...customerInput,
          },
        };
      } else {
        mutation = `#graphql
           mutation CustomerCreate($input: CustomerInput!) {
                customerCreate(input: $input) {
                  customer {
                      id
                  }
                  userErrors {
                   field
                    message
                  }
                }
              }
             `;
        variables = { input: customerInput };
      }

      const response = await fetchGraphQL(mutation, variables, true);
      const { userErrors } = customerId
        ? response?.customerUpdate
        : response?.customerCreate;

      console.log("response----", response);

      if (userErrors && userErrors.length) {
        setError(
          userErrors
            .map((err: any) => `${err.field}: ${err.message}`)
            .join(", "),
        );
        return;
      }
    } catch (error) {
      console.log(error);
      setError("Failed to create/update customer account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-10">
      {error && <div className="text-red-500">{error}</div>}
      <h2 className="text-2xl font-bold">Profile</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <PTextField
            autoComplete="off"
            label="First Name"
            value={customerData?.firstName || firstName}
            disabled={true}
          />
          <PTextField
            autoComplete="off"
            label="Last Name"
            value={customerData?.lastName || lastName}
            disabled={true}
          />
          <PTextField
            autoComplete="email"
            label="Email"
            value={email}
            disabled={true}
          />
          <PTextField
            autoComplete="off"
            label="Mobile"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            disabled={false}
          />
        </div>

        <PTextField
          autoComplete="off"
          label="Note"
          value={note}
          onChange={(value) => setNote(value)}
        />

        <div className="space-y-2">
          <PTextField
            autoComplete="off"
            label="Password"
            placeholder="Create Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              const val = value;
              if (val.length < 5 || val.length > 40) {
                setPasswordError(
                  "Password must be between 5 and 40 characters long",
                );
              } else if (!/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[A-Z])/.test(val)) {
                setPasswordError(
                  "Password must contain at least one number, one symbol, and one uppercase letter",
                );
              } else {
                setPasswordError("");
              }
            }}
            type="password"
            error={passwordError}
          />
          <p className="text-sm text-gray-500">
            Passwords must be between 5 and 40 characters long. Must contain at
            least one number, one symbol, and one uppercase letter. Must be
            unique.
          </p>
        </div>

        <div className="space-y-2">
          <PTextField
            autoComplete="off"
            label="Confirm Password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(value) => setConfirmPassword(value)}
            type="password"
          />
        </div>

        <div className="space-y-2">
          <PTextField
            autoComplete="off"
            label="Create 4-digit PIN"
            placeholder="Create 4-digit PIN"
            value={pin}
            onChange={(value) => {
              const val = value.replace(/\D/g, "");
              if (val.length <= 4) {
                setPin(val);
                setPinError(val.length === 4 ? "" : "PIN must be 4 digits");
              }
            }}
            type="password"
            error={pinError}
          />
          <p className="text-sm text-gray-500">
            This must be a 4-digit numeric PIN.
          </p>
        </div>

        <div className="space-y-2">
          <PTextField
            autoComplete="off"
            label="Confirm 4-digit PIN"
            placeholder="Confirm 4-digit PIN"
            value={confirmPin}
            onChange={(value) => {
              const val = value.replace(/\D/g, "");
              if (val.length <= 4) {
                setConfirmPin(val);
              }
            }}
            type="password"
          />
        </div>
        <div className="flex justify-end mt-8">
          <PButton
            variant="primary"
            onClick={handleCreateOrUpdateCustomer}
            loading={loading}
            disabled={loading}
          >
            Save
          </PButton>
        </div>
      </div>
    </div>
  );
};

export default Profile;
