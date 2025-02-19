import {
  TextField,
  IndexTable,
  Card,
  IndexFilters,
  useSetIndexFiltersMode,
  useIndexResourceState,
  Text,
  ChoiceList,
  RangeSlider,
  Badge,
  useBreakpoints,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { useAppBridge, Modal } from "@shopify/app-bridge-react";
import OrderModal from "./model";
import { fetchGraphQL } from "../../lib/graphql";

const orderFieldQuery = `
                id
                name
                customer{
                    displayName
                }
                createdAt
                displayFinancialStatus
                currentTotalPriceSet{
                    presentmentMoney{
                        amount
                        currencyCode
                    }
                }
                `;

export default function Table({ customStatus }) {
  const shopify = useAppBridge();
  const [popUpOrderID, setPopUpOrderID] = useState("");
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const [itemStrings, setItemStrings] = useState(["All"]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [orderQuery, setOrderQuery] = useState("");

  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
  }));
  const [selected, setSelected] = useState(0);

  const sortOptions = [
    { label: "Order", value: "ORDER_NUMBER asc", directionLabel: "Ascending" },
    {
      label: "Order",
      value: "ORDER_NUMBER desc",
      directionLabel: "Descending",
    },
    { label: "Customer", value: "CUSTOMER_NAME asc", directionLabel: "A-Z" },
    { label: "Customer", value: "CUSTOMER_NAME desc", directionLabel: "Z-A" },
    { label: "Date", value: "CREATED_AT asc", directionLabel: "A-Z" },
    { label: "Date", value: "CREATED_AT desc", directionLabel: "Z-A" },
    { label: "Total", value: "TOTAL_PRICE asc", directionLabel: "Ascending" },
    { label: "Total", value: "TOTAL_PRICE desc", directionLabel: "Descending" },
  ];
  const [sortSelected, setSortSelected] = useState(["ORDER_NUMBER asc"]);
  const [queryValue, setQueryValue] = useState("");

  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => {
    setQueryValue("");
  };

  const resourceName = {
    singular: "order",
    plural: "orders",
  };

  const fetchOrders = async (q = "", sortKey = "", reverse = false) => {
    setLoading(true);
    const query = `
      query {
        orders(first: 250, query:"${q}", sortKey: ${sortKey}, reverse: ${reverse}) {
          edges {
            node {
              ${orderFieldQuery}
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    setOrders(data.orders.edges.map((edge) => edge.node));
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const status = customStatus.map((status) => status?.order_status_title);
    setItemStrings(["All", ...status]);
  }, []);

  useEffect(() => {
    var q = [];
    const srt = sortSelected[0].split(" ");

    if (!!queryValue) {
      q.push(queryValue);
    }
    if (selected !== 0) {
      q.push(`tag:'fcos:${itemStrings[selected]}'`);
    }

    fetchOrders(q.join(" AND "), srt[0], srt[1] === "desc" ? true : false);
  }, [selected, queryValue, sortSelected]);

  const rowMarkup = orders.map(
    (
      {
        id,
        name,
        createdAt,
        customer,
        currentTotalPriceSet,
        displayFinancialStatus,
        fulfillmentStatus,
      },
      index,
    ) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{new Date(createdAt).toDateString()}</IndexTable.Cell>
        <IndexTable.Cell>{customer?.displayName}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end" numeric>
            {currentTotalPriceSet?.presentmentMoney?.amount}{" "}
            {currentTotalPriceSet?.presentmentMoney?.currencyCode}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge progress="complete">{displayFinancialStatus}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div
            onClick={() => {
              setPopUpOrderID(id?.split("/")?.pop());
              shopify.modal.show("fillfilmtentd");
            }}
          >
            cliccc
          </div>{" "}
          {fulfillmentStatus}
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <>
      <Card padding="0">
        <IndexFilters
          loading={loading}
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          queryValue={queryValue}
          onQueryChange={(v) => {
            console.log("onQueryChange ", v);
            setQueryValue(v);
          }}
          cancelAction={{
            onAction: onHandleCancel,
            disabled: false,
            loading: false,
          }}
          queryPlaceholder="Searching in Selected"
          onQueryClear={() => setQueryValue("")}
          onSort={setSortSelected}
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          mode={mode}
          setMode={setMode}
          filters={[]}
          canCreateNewView={false}
        />
        <IndexTable
          condensed={useBreakpoints().smDown}
          resourceName={resourceName}
          itemCount={orders.length}
          headings={[
            { title: "Order" },
            { title: "Date" },
            { title: "Customer" },
            { title: "Total", alignment: "end" },
            { title: "Payment status" },
            { title: "Fulfillment status" },
          ]}
          selectable={false}
        >
          {rowMarkup}
        </IndexTable>
      </Card>

      <OrderModal id={popUpOrderID} customStatus={customStatus} />
    </>
  );
}
