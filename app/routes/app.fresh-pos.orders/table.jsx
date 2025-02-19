import {
  TextField,
  IndexTable,
  Card,
  IndexFilters,
  useSetIndexFiltersMode,
  Text,
  RangeSlider,
  Badge,
  useBreakpoints,
  Spinner,
  Pagination,
  Button,
  Link,
} from "@shopify/polaris";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { fetchGraphQL } from "../../lib/graphql"; // Assuming you have this utility

export default function OrdersTable() {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [queryValue, setQueryValue] = useState("");
  const [sortSelected, setSortSelected] = useState(["UPDATED_AT desc"]);
  const [totalAmount, setTotalAmount] = useState([0, 1000]);
  const [financialStatus, setFinancialStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [startCursor, setStartCursor] = useState(null);
  const [endCursor, setEndCursor] = useState(null);
  const pageSize = 10;
  const { mode, setMode } = useSetIndexFiltersMode();
  const sortOptions = useMemo(
    () => [
      {
        label: "Order Number",
        value: "ORDER_NUMBER asc",
        directionLabel: "A-Z",
      },
      {
        label: "Order Number",
        value: "ORDER_NUMBER desc",
        directionLabel: "Z-A",
      },
      { label: "Created Date", value: "CREATED_AT asc", directionLabel: "A-Z" },
      {
        label: "Created Date",
        value: "CREATED_AT desc",
        directionLabel: "Z-A",
      },
      { label: "Updated Date", value: "UPDATED_AT asc", directionLabel: "A-Z" },
      {
        label: "Updated Date",
        value: "UPDATED_AT desc",
        directionLabel: "Z-A",
      },
      {
        label: "Total Amount",
        value: "TOTAL_PRICE asc",
        directionLabel: "Ascending",
      },
      {
        label: "Total Amount",
        value: "TOTAL_PRICE desc",
        directionLabel: "Descending",
      },
    ],
    [],
  );

  const resourceName = useMemo(
    () => ({
      singular: "order",
      plural: "orders",
    }),
    [],
  );
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleFinancialStatusRemove = useCallback(
    () => setFinancialStatus(""),
    [],
  );
  const handleTotalAmountRemove = useCallback(
    () => setTotalAmount([0, 1000]),
    [],
  );

  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
    handleFinancialStatusRemove();
    handleTotalAmountRemove();
  }, [
    handleQueryValueRemove,
    handleFinancialStatusRemove,
    handleTotalAmountRemove,
  ]);

  const fetchOrders = useCallback(
    async (
      q = "",
      sortKey = "UPDATED_AT",
      reverse = true,
      afterCursor = null,
      beforeCursor = null,
    ) => {
      setLoading(true);

      let variables = {
        query: q,
        sortKey: sortKey,
        reverse: reverse,
        after: afterCursor,
        before: beforeCursor,
        first: pageSize,
        last: null,
      };
      if (beforeCursor) {
        variables.first = null;
        variables.last = pageSize;
      }

      const query = `
              query Orders( $query: String, $sortKey: OrderSortKeys, $reverse: Boolean, $after: String, $before: String, $first: Int, $last: Int) {
                orders(first: $first, after: $after, last: $last, before: $before, query: $query, sortKey: $sortKey, reverse: $reverse) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                     cursor
                    node {
                      id
                      name
                      createdAt
                      updatedAt
                      currentSubtotalLineItemsQuantity
                      totalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      displayFinancialStatus
                      customer {
                        displayName
                      }
                      shippingAddress {
                        city
                        country
                      }
                      custom_order_status:metafield(key: "custom_order_status", namespace: "custom") {
                        value
                      }
                      custom_order_logs:metafield(key: "custom_order_logs", namespace: "custom") {
                        value
                      }
                      store_location:metafield(key: "store_location", namespace: "custom") {
                        value
                      }
                      delivery_option:metafield(key: "delivery_option", namespace: "custom") {
                        value
                      }
                      arrival_message:metafield(key: "arrival_message", namespace: "custom") {
                        value
                      }
                      pickup_person_first_name:metafield(key: "pickup_person_first_name_", namespace: "custom") {
                        value
                      }
                      pickup_person_last_name:metafield(key: "pickup_person_last_name", namespace: "custom") {
                        value
                      }
                      lineItems(first: 25) {
                        edges {
                          node {
                            id
                            name
                          }
                        }
                      }
                      displayFulfillmentStatus
                      tags
                      channelInformation {
                          channelDefinition {
                              handle
                              channelName
                          }
                      }
                      }
                  }
                }
                  ordersCount(query: $query){
                  count
                }
              }
            `;

      try {
        const data = await fetchGraphQL(query, variables, true);
        console.log("orders", data);
        setOrders(data.orders.edges.map((edge) => edge.node));
        setHasNextPage(data.orders.pageInfo.hasNextPage);
        setHasPreviousPage(data.orders.pageInfo.hasPreviousPage);
        setTotalOrderCount(data.ordersCount.count);
        setStartCursor(data.orders.pageInfo.startCursor);
        setEndCursor(data.orders.pageInfo.endCursor);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    var q = [];
    const srt = sortSelected[0].split(" ");

    if (!!queryValue) {
      q.push(queryValue);
    }
    if (!!financialStatus) {
      q.push(`financial_status:${financialStatus}`);
    }
    if (totalAmount) {
      q.push(`total_price:>${totalAmount[0]} total_price:<${totalAmount[1]}`);
    }

    fetchOrders(q.join(" AND "), srt[0], srt[1] === "desc" ? true : false);
    setCurrentPage(1);
  }, [queryValue, sortSelected, totalAmount, financialStatus, fetchOrders]);

  const handleFinancialStatusChange = useCallback(
    (value) => setFinancialStatus(value),
    [],
  );
  const handleTotalAmountChange = useCallback(
    (value) => setTotalAmount(value),
    [],
  );

  const handlePageChange = useCallback(
    (direction) => {
      const srt = sortSelected[0].split(" ");
      var q = [];
      const srtArray = sortSelected[0].split(" ");

      if (!!queryValue) {
        q.push(queryValue);
      }
      if (!!financialStatus) {
        q.push(`financial_status:${financialStatus}`);
      }
      if (totalAmount) {
        q.push(`total_price:>${totalAmount[0]} total_price:<${totalAmount[1]}`);
      }
      if (direction === "next") {
        fetchOrders(
          q.join(" AND "),
          srtArray[0],
          srtArray[1] === "desc" ? true : false,
          endCursor,
        );
        setCurrentPage((prev) => prev + 1);
      } else {
        fetchOrders(
          q.join(" AND "),
          srtArray[0],
          srtArray[1] === "desc" ? true : false,
          null,
          startCursor,
        );
        setCurrentPage((prev) => prev - 1);
      }
    },
    [
      endCursor,
      startCursor,
      queryValue,
      sortSelected,
      totalAmount,
      financialStatus,
      fetchOrders,
    ],
  );
  const rowMarkup = useMemo(
    () =>
      orders.map((order, index) => (
        <IndexTable.Row id={order.id} key={order.id} position={index}>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              <Link
                url={`/app/fresh-posid/orders/${order.id.split("/").pop()}`}
              >
                {order.name}
              </Link>
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            {order.createdAt && new Date(order.createdAt).toLocaleString()}
          </IndexTable.Cell>
          <IndexTable.Cell>{order.customer?.displayName || ""}</IndexTable.Cell>
          <IndexTable.Cell>
            {order?.lineItems?.edges?.length || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {order?.store_location?.value || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {order?.delivery_option?.value || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Badge
              tone={
                order?.custom_order_status?.value === "PAID"
                  ? "warning"
                  : "success"
              }
            >
              {order?.custom_order_status?.value}
            </Badge>
          </IndexTable.Cell>
          <IndexTable.Cell>
            {order?.arrival_message?.value || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {order?.pickup_person_first_name?.value || ""}{" "}
            {order?.pickup_person_last_name?.value || ""}
          </IndexTable.Cell>
        </IndexTable.Row>
      )),
    [orders],
  );

  const filters = useMemo(
    () => [
      // {
      //     key: "financialStatus",
      //     label: "Financial status",
      //     filter: (
      //         <TextField
      //             label="Financial Status"
      //             value={financialStatus}
      //             onChange={handleFinancialStatusChange}
      //             autoComplete="off"
      //             labelHidden
      //         />
      //     ),
      //     shortcut: true,
      // },
      {
        key: "totalAmount",
        label: "Total Amount",
        filter: (
          <RangeSlider
            label="Total amount is between"
            labelHidden
            value={totalAmount || [0, 1000]}
            min={0}
            max={1000}
            output
            step={1}
            onChange={handleTotalAmountChange}
          />
        ),
      },
    ],
    [
      financialStatus,
      totalAmount,
      handleFinancialStatusChange,
      handleTotalAmountChange,
    ],
  );

  const appliedFilters = useMemo(() => {
    const tempFilters = [];
    if (queryValue) {
      tempFilters.push({
        key: "query",
        label: `Search: ${queryValue}`,
        onRemove: handleQueryValueRemove,
      });
    }
    if (financialStatus) {
      tempFilters.push({
        key: "financialStatus",
        label: `Status: ${financialStatus}`,
        onRemove: handleFinancialStatusRemove,
      });
    }
    if (totalAmount) {
      tempFilters.push({
        key: "totalAmount",
        label: `Total amount between: ${totalAmount[0]} - ${totalAmount[1]}`,
        onRemove: handleTotalAmountRemove,
      });
    }
    return tempFilters;
  }, [
    queryValue,
    financialStatus,
    totalAmount,
    handleQueryValueRemove,
    handleFinancialStatusRemove,
    handleTotalAmountRemove,
  ]);

  return (
    <>
      <Card padding="0">
        <IndexFilters
          loading={loading}
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          queryValue={queryValue}
          onQueryChange={(v) => {
            setQueryValue(v);
          }}
          onQueryClear={handleQueryValueRemove}
          cancelAction={{
            onAction: () => {},
            disabled: false,
            loading: false,
          }}
          queryPlaceholder="Searching in Selected"
          onSort={setSortSelected}
          filters={filters}
          appliedFilters={appliedFilters}
          onClearAll={handleFiltersClearAll}
          mode={mode}
          setMode={setMode}
          tabs={[]}
          // selected={selected}
          // onSelect={setSelected}
          canCreateNewView={false}
        />
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <Spinner accessibilityLabel="Loading orders" size="large" />
          </div>
        )}
        {!loading && (
          <IndexTable
            resourceName={resourceName}
            itemCount={orders.length}
            headings={[
              { title: "Order No" },
              { title: "Date and Time" },
              { title: "Guest Name" },
              { title: "No of Items" },
              { title: "Store Location" },
              { title: "Delivery Option" },
              { title: "Custom order status" },
              { title: "Arrival Message" },
              { title: "Alternate Pick up" },
            ]}
            selectable={false}
          >
            {rowMarkup}
          </IndexTable>
        )}
        {!loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px",
              gap: "10px",
            }}
          >
            <span style={{ margin: "0 5px" }}>
              Page {currentPage} of {Math.ceil(totalOrderCount / pageSize)}
            </span>

            <Pagination
              label=""
              hasPrevious={hasPreviousPage}
              onPrevious={() => handlePageChange("previous")}
              hasNext={hasNextPage}
              onNext={() => handlePageChange("next")}
            />
          </div>
        )}
      </Card>
    </>
  );
}
