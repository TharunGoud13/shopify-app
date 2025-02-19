import { Link } from "@remix-run/react";
import {
  IndexTable,
  Badge,
  IndexFilters,
  type IndexFiltersProps,
  useSetIndexFiltersMode,
  Spinner,
} from "@shopify/polaris";
import { useState, useMemo } from "react";

interface Props {
  headings: any;
  orders: any;
}

export default function OrdersTable({ headings, orders }: Props) {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const ITEMS_PER_PAGE = 10;

  const sortOptions = [
    {
      label: "Order Number",
      value: "order asc" as const,
      directionLabel: "Lowest to Highest",
    },
    {
      label: "Order Number",
      value: "order desc" as const,
      directionLabel: "Highest to Lowest",
    },

    {
      label: "Created At",
      value: "date asc" as const,
      directionLabel: "Lowest to Highest",
    },
    {
      label: "Created At",
      value: "date desc" as const,
      directionLabel: "Highest to Lowest",
    },
    {
      label: "Updated At",
      value: "date asc" as const,
      directionLabel: "Lowest to Highest",
    },
    {
      label: "Updated At",
      value: "date desc" as const,
      directionLabel: "Highest to Lowest",
    },
    {
      label: "Total Amount",
      value: "totalAmount asc" as const,
      directionLabel: "Lowest to Highest",
    },
    {
      label: "Total Amount",
      value: "totalAmount desc" as const,
      directionLabel: "Highest to Lowest",
    },
  ];

  const [sortSelected, setSortSelected] = useState(["order asc"]);
  const [queryValue, setQueryValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { mode, setMode } = useSetIndexFiltersMode();

  const containsQuery = (field: any, searchString: string) => {
    if (field === null || field === undefined) return false;
    return field.toString().toLowerCase().includes(searchString);
  };

  const processedOrders = useMemo(() => {
    let result = [...orders];
    if (queryValue) {
      const searchString = queryValue.toLowerCase();
      result = result.filter((order: any) => {
        return (
          containsQuery(order.id, searchString) ||
          containsQuery(order.customer, searchString) ||
          containsQuery(order.paymentStatus, searchString) ||
          containsQuery(order.fulfillmentStatus, searchString)
        );
      });
    }

    const [field, direction] = sortSelected[0].split(" ");

    result.sort((a: any, b: any) => {
      let valueA = a[field];
      let valueB = b[field];

      // Handle special case for Status sorting
      if (field === "status") {
        if (direction === "asc") {
          return valueA === "ACTIVE" ? -1 : 1;
        } else {
          return valueA === "ACTIVE" ? 1 : -1;
        }
      }

      if (field === "created-at" || field === "updated-at") {
        const dateA = new Date(valueA).getTime();
        const dateB = new Date(valueA).getTime();
        if (direction === "asc") {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      }

      if (field === "inventory") {
        valueA = parseInt(valueA) || 0;
        valueB = parseInt(valueB) || 0;
        return direction === "asc" ? valueA - valueB : valueB - valueA;
      }

      valueA = (valueA || "").toString().toLowerCase();
      valueB = (valueB || "").toString().toLowerCase();

      if (direction === "asc") {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });

    return result;
  }, [orders, queryValue, sortSelected]);

  const totalPages = Math.ceil(processedOrders.length / ITEMS_PER_PAGE);

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedOrders, currentPage]);

  const handleQueryChange = (value: string) => {
    setQueryValue(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSortChange = (sortValue: string[]) => {
    setSortSelected(sortValue);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handlePaginationChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };

  const primaryAction: IndexFiltersProps["primaryAction"] = {
    type: "save",
    onAction: onHandleSave,
    disabled: false,
    loading: false,
  };

  const onHandleCancel = () => {};

  const rowMarkup = currentItems.map(
    (
      {
        order,
        customer,
        orderIndex,
        date,
        tags,
        channel,
        totalAmount,
        paymentStatus,
        items,
        fulfillmentStatus,
      }: any,
      index: number,
    ) => (
      <IndexTable.Row id={orderIndex} key={orderIndex} position={orderIndex}>
        <IndexTable.Cell>
          <Link to={`/app/fresh-pageid/${order}`}>{order}</Link>
        </IndexTable.Cell>
        <IndexTable.Cell>{customer}</IndexTable.Cell>
        <IndexTable.Cell>{date}</IndexTable.Cell>
        <IndexTable.Cell>{tags}</IndexTable.Cell>
        <IndexTable.Cell>{channel}</IndexTable.Cell>
        <IndexTable.Cell>{totalAmount}</IndexTable.Cell>
        <IndexTable.Cell>
          {paymentStatus === "PAID" ? (
            <Badge tone="success">Paid</Badge>
          ) : (
            <Badge tone="warning">Pending</Badge>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>{items}</IndexTable.Cell>
        <IndexTable.Cell>
          {fulfillmentStatus === "FULFILLED" ? (
            <Badge tone="success">FulFilled</Badge>
          ) : (
            <Badge tone="warning">UnFulFilled</Badge>
          )}
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <div>
      <IndexFilters
        tabs={[]}
        selected={0}
        sortOptions={sortOptions}
        sortSelected={sortSelected}
        queryValue={queryValue}
        queryPlaceholder="Search..."
        onQueryChange={handleQueryChange}
        onQueryClear={() => {
          setQueryValue("");
          setCurrentPage(1);
        }}
        onSort={handleSortChange}
        primaryAction={primaryAction}
        cancelAction={{
          onAction: onHandleCancel,
          disabled: false,
          loading: false,
        }}
        mode={mode}
        setMode={setMode}
        filters={[]}
        onClearAll={() => {
          setQueryValue("");
          setSortSelected(["product asc"]);
          setCurrentPage(1);
        }}
      />
      {!(processedOrders.length > 0) && (
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
      <IndexTable
        itemCount={processedOrders.length}
        headings={headings}
        selectable={false}
        pagination={{
          hasPrevious: currentPage > 1,
          hasNext: currentPage < totalPages,
          onPrevious: () => handlePaginationChange(currentPage - 1),
          onNext: () => handlePaginationChange(currentPage + 1),
        }}
      >
        {rowMarkup}
      </IndexTable>
    </div>
  );
}
