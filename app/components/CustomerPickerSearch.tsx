import { fetchGraphQL } from "../lib/graphql";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  IndexTable,
  TextField,
  useBreakpoints,
  useIndexResourceState,
  Text,
  Scrollable,
  Thumbnail,
} from "@shopify/polaris";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { SearchIcon } from "@shopify/polaris-icons";

const customerFieldQuery = `
  id
  firstName
  lastName
  phone
  addresses {
    zip
  }
  registration_no: metafield(key: "registration_no", namespace: "registration") {
    value
  }
  service_model_block_status: metafield(key: "service_model_block_status", namespace: "registration") {
    value
  }
`;

export default function CustomerPickerSearch({
  label,
  title,
  onSelect,
  singleSelection = false,
}: any) {
  const shopify = useAppBridge();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(results as unknown as { [key: string]: unknown }[]);

  const updateResults = useCallback(async () => {
    setLoading(true);
    const gqlQuery = `
      query {
        customers(first: 50, query: "${query || ""}") {
          edges {
            node {
              ${customerFieldQuery}
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(gqlQuery);
    const fetchedCustomers = data.customers.edges.map(
      (edge: { node: any }) => edge.node,
    );
    setResults(fetchedCustomers || []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    clearSelection();
    updateResults();
  }, [query]);

  const rowMarkup = results.map(
    (
      res: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        registration_no: { value: string };
        addresses: [{ zip: string }];
      },
      index,
    ) => {
      let selected = selectedResources.includes(res.id);
      let disabled =
        singleSelection && selectedResources.length > 0 && !selected; // Disable if single selection and others are selected

      return (
        <IndexTable.Row
          key={res.id}
          id={res.id}
          position={index}
          selected={selected}
          disabled={disabled}
        >
          <IndexTable.Cell>
            {res.registration_no?.value || "N/A"}
          </IndexTable.Cell>
          <IndexTable.Cell>{res.firstName}</IndexTable.Cell>
          <IndexTable.Cell>{res.lastName}</IndexTable.Cell>
          <IndexTable.Cell>{res.phone || "N/A"}</IndexTable.Cell>
          <IndexTable.Cell>
            {res.addresses && res.addresses.length > 0
              ? res.addresses[0].zip
              : "N/A"}
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    },
  );
  const handleSelection = (selectionType: any, toggleType: any, id?: any) => {
    handleSelectionChange(selectionType, toggleType, id);
  };

  return (
    <>
      <Button
        onClick={() => shopify.modal.show("customer-picker-search")}
        fullWidth
      >
        {label}
      </Button>
      <Modal id="customer-picker-search" open={open} onHide={()=>setOpen(false)} onShow={()=>setOpen(true)}>
        <div className="w-full flex justify-center flex-col overflow-hidden">
          <div className="w-full p-2">
            <TextField
              label={""}
              value={query}
              onChange={setQuery}
              placeholder="Search Customers..."
              autoComplete="off"
              prefix={<SearchIcon className="w-5 h-5 text-gray-400" />}
            />
          </div>
          <Scrollable style={{ height: "320px" }}>
            <IndexTable
              condensed={useBreakpoints().smDown}
              onSelectionChange={handleSelection}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              resourceName={{
                singular: "customer",
                plural: "customers",
              }}
              itemCount={results.length}
              headings={[
                { title: "Registration ID", id: "registration-id" },
                { title: "First Name", id: "first-name" },
                { title: "Last Name", id: "last-name" },
                { title: "Mobile", id: "mobile" },
                { title: "Zip Code", id: "zip-code" },
              ]}
              loading={loading}
            >
              {rowMarkup}
            </IndexTable>
          </Scrollable>
        </div>
        <TitleBar title={title}>
          <button
            variant="primary"
            disabled={selectedResources?.length === 0}
            onClick={() => {
              // Prepare selected customers for the onSelect callback
              const selectedCustomers = results.filter((customer: any) =>
                selectedResources.includes(customer.id),
              );
              console.log("selectedCustomers",selectedCustomers)
              if (onSelect) onSelect(selectedCustomers);
              setOpen(false);
              clearSelection();
              setQuery("");
            }}
          >
            Select
          </button>
          <button onClick={() => setOpen(false)}>Cancel</button>
        </TitleBar>
      </Modal>
    </>
  );
}
