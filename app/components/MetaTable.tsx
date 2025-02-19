import { Link } from "@remix-run/react";
import {
  IndexTable,
  Text,
  Badge,
  Thumbnail,
  IndexFilters,
  type IndexFiltersProps,
  useSetIndexFiltersMode,
  Spinner,
} from "@shopify/polaris";
import { useState, useMemo } from "react";

interface ProductProps {
  headings: any;
  orders: any;
}

export default function MetaTable({ headings, orders }: ProductProps) {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const ITEMS_PER_PAGE = 10;

  const sortOptions = [
    {
      label: "Products",
      value: "product asc" as const,
      directionLabel: "A - Z",
    },
    {
      label: "Products",
      value: "product desc" as const,
      directionLabel: "Z - A",
    },
    {
      label: "Category",
      value: "category asc" as const,
      directionLabel: "Ascending",
    },
    {
      label: "Category",
      value: "category desc" as const,
      directionLabel: "Descending",
    },
    {
      label: "Status",
      value: "status asc" as const,
      directionLabel: "Active",
    },
    {
      label: "Status",
      value: "status desc" as const,
      directionLabel: "InActive",
    },
    {
      label: "Inventory",
      value: "inventory asc" as const,
      directionLabel: "Lowest to Highest",
    },
    {
      label: "Inventory",
      value: "inventory desc" as const,
      directionLabel: "Highest to Lowest",
    },
  ];

  const [sortSelected, setSortSelected] = useState(["product asc"]);
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
          containsQuery(order.product, searchString) ||
          containsQuery(order.category, searchString) ||
          containsQuery(order.vendor, searchString) ||
          containsQuery(order.title, searchString)
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
        product,
        total,
        paymentStatus,
        fulfillmentStatus,
        title,
        vendor,
        category,
        inventory,
        status,
        images,
        productIndex,
      }: any,
      index: number,
    ) => (
      <IndexTable.Row
        id={productIndex}
        key={productIndex}
        position={productIndex}
      >
        <IndexTable.Cell>
          <Thumbnail source={images} alt={"product"} size="small" />
          <Link to={`/app/fresh-pageid/${productIndex}`}>{product}</Link>
        </IndexTable.Cell>

        <IndexTable.Cell>
          {status === "ACTIVE" ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="critical">InActive</Badge>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>{inventory} in stock</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end" numeric>
            {total}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{paymentStatus}</IndexTable.Cell>
        <IndexTable.Cell>{fulfillmentStatus}</IndexTable.Cell>
        <IndexTable.Cell>{title}</IndexTable.Cell>
        <IndexTable.Cell>{category}</IndexTable.Cell>
        <IndexTable.Cell>{vendor}</IndexTable.Cell>
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
        queryPlaceholder="Search products, categories, vendors..."
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
