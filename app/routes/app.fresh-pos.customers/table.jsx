import {
  TextField,
  IndexTable,
  Card,
  IndexFilters,
  useSetIndexFiltersMode,
  Text,
  Badge,
  useBreakpoints,
  Spinner,
  Link,
  Pagination,
  Button,
} from "@shopify/polaris";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { fetchGraphQL } from "../../lib/graphql";

export default function CustomersTable() {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [queryValue, setQueryValue] = useState("");
  const [sortSelected, setSortSelected] = useState(["UPDATED_AT desc"]);
  const [emailFilter, setEmailFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalCustomerCount, setTotalCustomerCount] = useState(0);
  const [startCursor, setStartCursor] = useState(null);
  const [endCursor, setEndCursor] = useState(null);
  const pageSize = 10;
  const { mode, setMode } = useSetIndexFiltersMode();
  const sortOptions = useMemo(
    () => [
      { label: "Name", value: "NAME asc", directionLabel: "A-Z" },
      { label: "Name", value: "NAME desc", directionLabel: "Z-A" },
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
    ],
    [],
  );

  const resourceName = useMemo(
    () => ({
      singular: "customer",
      plural: "customers",
    }),
    [],
  );

  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleEmailFilterRemove = useCallback(() => setEmailFilter(""), []);

  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
    handleEmailFilterRemove();
  }, [handleQueryValueRemove, handleEmailFilterRemove]);

  const fetchCustomers = useCallback(
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
      query Customers(
        $query: String
        $sortKey: CustomerSortKeys
        $reverse: Boolean
        $after: String
        $before: String
        $first: Int
        $last: Int
      ) {
        customers(
          first: $first
          after: $after
          last: $last
          before: $before
          query: $query
          sortKey: $sortKey
          reverse: $reverse
        ) {
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
                displayName
                email
                phone
                createdAt
                updatedAt
                numberOfOrders
                totalSpent: amountSpent{
                  amount
                  currencyCode
                }
                defaultAddress {
                  formatted
                  country
                  city
                  province
                }
                 tags
                state
            }
          }
        }
        customersCount(query: $query){
            count
          }
      }
      
    `;

      try {
        const data = await fetchGraphQL(query, variables, true);
        console.log("customers", data);
        setCustomers(data.customers.edges.map((edge) => edge.node));
        setHasNextPage(data.customers.pageInfo.hasNextPage);
        setHasPreviousPage(data.customers.pageInfo.hasPreviousPage);
        setTotalCustomerCount(data.customersCount.count);
        setStartCursor(data.customers.pageInfo.startCursor);
        setEndCursor(data.customers.pageInfo.endCursor);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    var q = [];
    const srt = sortSelected[0].split(" ");

    if (!!queryValue) {
      q.push(queryValue);
    }
    if (!!emailFilter) {
      q.push(`email:${emailFilter}`);
    }

    fetchCustomers(q.join(" AND "), srt[0], srt[1] === "desc" ? true : false);
    setCurrentPage(1); // Reset to the first page when filters change
  }, [queryValue, sortSelected, emailFilter, fetchCustomers]);

  const handleEmailFilterChange = useCallback(
    (value) => setEmailFilter(value),
    [],
  );

  const handlePageChange = useCallback(
    (direction) => {
      const srt = sortSelected[0].split(" ");
      var q = [];
      if (!!queryValue) {
        q.push(queryValue);
      }
      if (!!emailFilter) {
        q.push(`email:${emailFilter}`);
      }
      if (direction === "next") {
        fetchCustomers(
          q.join(" AND "),
          srt[0],
          srt[1] === "desc" ? true : false,
          endCursor,
        );
        setCurrentPage((prev) => prev + 1);
      } else {
        fetchCustomers(
          q.join(" AND "),
          srt[0],
          srt[1] === "desc" ? true : false,
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
      emailFilter,
      fetchCustomers,
    ],
  );

  const rowMarkup = useMemo(
    () =>
      customers.map((customer, index) => (
        <IndexTable.Row id={customer.id} key={customer.id} position={index}>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              <Link
                url={`/app/fresh-posid/customers/${customer.id.split("/").pop()}`}
              >
                {customer.displayName}
              </Link>
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{customer.email}</IndexTable.Cell>
          <IndexTable.Cell>{customer.phone}</IndexTable.Cell>
          <IndexTable.Cell>
            {customer.totalSpent.amount} {customer.totalSpent.currencyCode}
          </IndexTable.Cell>
          <IndexTable.Cell>{customer.numberOfOrders}</IndexTable.Cell>
          {/* <IndexTable.Cell>
            <Badge
              tone={
                customer.state === "ENABLED"
                  ? "success"
                  : customer.state === "DISABLED"
                    ? "critical"
                    : customer.state === "INVITED"
                      ? "info"
                      : customer.state === "DECLINED"
                        ? "attention"
                        : "new"
              }
              progress={
                customer.state === "ENABLED"
                  ? "complete"
                  : customer.state === "DISABLED"
                    ? "incomplete"
                    : customer.state === "INVITED"
                      ? "partiallyComplete"
                      : customer.state === "DECLINED"
                        ? "incomplete"
                        : "incomplete"
              }
            >
              {customer.state}
            </Badge>
          </IndexTable.Cell> */}

          <IndexTable.Cell>
            {customer.defaultAddress?.formatted}
          </IndexTable.Cell>
          <IndexTable.Cell>{customer.createdAt}</IndexTable.Cell>
          <IndexTable.Cell>{customer.updatedAt}</IndexTable.Cell>
          <IndexTable.Cell>
            {customer?.tags?.join(", ") || "N/A"}
          </IndexTable.Cell>
        </IndexTable.Row>
      )),
    [customers],
  );

  const filters = [
    {
      key: "email",
      label: "Email",
      filter: (
        <TextField
          label="Email"
          value={emailFilter}
          onChange={handleEmailFilterChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = useMemo(() => {
    const tempFilters = [];
    if (queryValue) {
      tempFilters.push({
        key: "query",
        label: `Search: ${queryValue}`,
        onRemove: handleQueryValueRemove,
      });
    }
    if (emailFilter) {
      tempFilters.push({
        key: "email",
        label: `Email: ${emailFilter}`,
        onRemove: handleEmailFilterRemove,
      });
    }
    return tempFilters;
  }, [
    queryValue,
    emailFilter,
    handleQueryValueRemove,
    handleEmailFilterRemove,
  ]);

  return (
    <>
      {/* <div className="flex justify-end my-2">
        <Button variant="primary" url="/app/fresh-posid/customers/new">Add Customer</Button>
      </div> */}
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
            <Spinner accessibilityLabel="Loading customers" size="large" />
          </div>
        )}
        {!loading && (
          <IndexTable
            resourceName={resourceName}
            itemCount={customers.length}
            headings={[
              { title: "Name" },
              { title: "Email" },
              { title: "Phone" },
              { title: "Total Spent" },
              { title: "Number of Orders" },
              // { title: "Status" },
              { title: "Default Address" },
              { title: "Created At" },
              { title: "Updated At" },
              { title: "Tags" },
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
              Page {currentPage} of {Math.ceil(totalCustomerCount / pageSize)}
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
