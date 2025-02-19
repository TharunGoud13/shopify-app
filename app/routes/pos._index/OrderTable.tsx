import { Link } from "@remix-run/react";
import {
  IndexTable,
  IndexFilters,
  type IndexFiltersProps,
  useSetIndexFiltersMode,
  Spinner,
  // Badge,
} from "@shopify/polaris";
import { useState, useMemo } from "react";

interface Props {
  headings: any;
  orders: any;
}

export default function OrderTable({ headings, orders }: Props) {
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
    // {
    //   label: "Updated At",
    //   value: "date asc" as const,
    //   directionLabel: "Lowest to Highest",
    // },
    // {
    //   label: "Updated At",
    //   value: "date desc" as const,
    //   directionLabel: "Highest to Lowest",
    // },
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
          containsQuery(order.order, searchString) ||
          containsQuery(order.date, searchString) ||
          containsQuery(order.guestName, searchString) ||
          containsQuery(order.noOfItems, searchString) ||
          containsQuery(order.storeLocation, searchString) ||
          containsQuery(order.deliveryOption, searchString) ||
          containsQuery(order.customOrderStatus, searchString) ||
          containsQuery(order.arrivalMessage, searchString) ||
          containsQuery(order.alternatePickup, searchString)
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

  // id: orderNode.id,
  //               order: `#${orderNode.orderNumber}`,
  //               date: new Date(orderNode.processedAt).toLocaleString(),
  //               noOfItems: totalItems,
  //               items: items,
  //               financialStatus: orderNode.financialStatus,
  //               fulfillmentStatus: orderNode.fulfillmentStatus,
  //               totalAmount:

  const rowMarkup = currentItems.map(
    (
      {
        order,
        date,
        noOfItems,
        items,
        totalItems,
        financialStatus,
        fulfillmentStatus,
        totalAmount,
      }: any,
      index: number,
    ) => (
      <IndexTable.Row id={order} key={order} position={order}>
        <IndexTable.Cell>
          <Link to={`/app/fresh-pageid/${order}`}>{order}</Link>
        </IndexTable.Cell>
        <IndexTable.Cell>{new Date(date).toLocaleDateString()}</IndexTable.Cell>
        <IndexTable.Cell>{items}</IndexTable.Cell>
        <IndexTable.Cell>{noOfItems}</IndexTable.Cell>
        <IndexTable.Cell>{totalItems}</IndexTable.Cell>
        <IndexTable.Cell>{financialStatus}</IndexTable.Cell>
        <IndexTable.Cell>{fulfillmentStatus}</IndexTable.Cell>
        <IndexTable.Cell>{totalAmount}</IndexTable.Cell>
        {/* <IndexTable.Cell>
          {customOrderStatus === "PENDING" ? (
            <Badge tone="warning">Pending</Badge>
          ) : (
            <Badge tone="success">Paid</Badge>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>{arrivalMessage}</IndexTable.Cell>
        <IndexTable.Cell>{alternatePickup}</IndexTable.Cell> */}
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
