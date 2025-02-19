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
  Link,
  Button,
} from "@shopify/polaris";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { fetchGraphQL } from "../../lib/graphql";

export default function ProductsTable() {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [queryValue, setQueryValue] = useState("");
  const [sortSelected, setSortSelected] = useState(["UPDATED_AT desc"]);
  const [inventoryLevels, setInventoryLevels] = useState(null);
  const [productType, setProductType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [startCursor, setStartCursor] = useState(null);
  const [endCursor, setEndCursor] = useState(null);
  const pageSize = 10;
  const { mode, setMode } = useSetIndexFiltersMode();
  const sortOptions = useMemo(
    () => [
      { label: "Title", value: "TITLE asc", directionLabel: "A-Z" },
      { label: "Title", value: "TITLE desc", directionLabel: "Z-A" },
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
      singular: "product",
      plural: "products",
    }),
    [],
  );

  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleProductTypeRemove = useCallback(() => setProductType(""), []);
  const handleInventoryRemove = useCallback(() => setInventoryLevels(null), []);

  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
    handleProductTypeRemove();
    handleInventoryRemove();
  }, [handleQueryValueRemove, handleProductTypeRemove, handleInventoryRemove]);

  const fetchProducts = useCallback(
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
      query Products($query: String, $sortKey: ProductSortKeys, $reverse: Boolean, $after: String, $before: String, $first: Int, $last: Int) {
        products(first: $first, after: $after, last: $last, before: $before, query: $query, sortKey: $sortKey, reverse: $reverse) {
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
              title
              handle
              createdAt
              updatedAt
              productType
              status
              vendor
              category{
                name
              }
              featuredImage {
                url
              }
              totalInventory
              priceRangeV2 {
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              start_date:metafield(key: "start_date", namespace: "custom") {
                  value
              }
              end_date:metafield(key: "end_date", namespace: "custom") {
                  value
              }
              custom_product_type:metafield(key: "custom_product_type", namespace: "custom") {
                  value
              }
              storage:metafield(key: "storage", namespace: "custom") {
                  value
              }
              order_points:metafield(key: "order_points", namespace: "custom") {
                  value
              }
              per_order_limit:metafield(key: "per_order_limit", namespace: "custom") {
                  value
              }
              bagging_score:metafield(key: "bagging_score", namespace: "custom") {
                  value
              }
              units:metafield(key: "units", namespace: "custom") {
                  value
              }
              #channelPublicationCount: publicationCount(
              #  onlyPublished: false
              #  catalogType: "APP"
              #)
              #marketPublicationCount: publicationCount(
              #  onlyPublished: false
              #  catalogType: "MARKET"
              #)
              #companyLocationPublicationCount: publicationCount(
              #  onlyPublished: false
              #  catalogType: "COMPANY_LOCATION"
              #)
            }
          }
        }
        productsCount(query: $query){
          count
        }
      }
      
    `;

      try {
        const data = await fetchGraphQL(query, variables, true);
        console.log("products", data);
        setProducts(data.products.edges.map((edge) => edge.node));
        setHasNextPage(data.products.pageInfo.hasNextPage);
        setHasPreviousPage(data.products.pageInfo.hasPreviousPage);
        setTotalProductCount(data.productsCount.count);
        setStartCursor(data.products.pageInfo.startCursor);
        setEndCursor(data.products.pageInfo.endCursor);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    var q = [];
    const srt = sortSelected[0].split(" ");

    if (!!queryValue) {
      q.push(queryValue);
    }
    if (!!productType) {
      q.push(`product_type:${productType}`);
    }
    if (inventoryLevels) {
      q.push(
        `inventory_total:>${inventoryLevels[0]} inventory_total:<${inventoryLevels[1]}`,
      );
    }

    fetchProducts(q.join(" AND "), srt[0], srt[1] === "desc" ? true : false);
    setCurrentPage(1); // Reset to the first page when filters change
  }, [queryValue, sortSelected, inventoryLevels, productType, fetchProducts]);

  const handleProductTypeChange = useCallback(
    (value) => setProductType(value),
    [],
  );

  const handleInventoryChange = useCallback(
    (value) => setInventoryLevels(value),
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
      if (!!productType) {
        q.push(`product_type:${productType}`);
      }
      if (inventoryLevels) {
        q.push(
          `inventory_total:>${inventoryLevels[0]} inventory_total:<${inventoryLevels[1]}`,
        );
      }
      if (direction === "next") {
        fetchProducts(
          q.join(" AND "),
          srtArray[0],
          srtArray[1] === "desc" ? true : false,
          endCursor,
        );
        setCurrentPage((prev) => prev + 1);
      } else {
        fetchProducts(
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
      inventoryLevels,
      productType,
      fetchProducts,
    ],
  );

  const rowMarkup = useMemo(
    () =>
      products.map((product, index) => (
        <IndexTable.Row id={product.id} key={product.id} position={index}>
          <IndexTable.Cell>
            {product.featuredImage?.url && (
              <img
                src={product.featuredImage.url}
                alt={product.title}
                style={{ maxWidth: "50px", maxHeight: "50px" }}
              />
            )}
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              <Link
                url={`/app/fresh-posid/products/${product.id.split("/").pop()}`}
              >
                {product.title}
              </Link>
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{product?.units?.value || ""}</IndexTable.Cell>
          <IndexTable.Cell>{product?.custom_product_type?.value || ""}</IndexTable.Cell>
          <IndexTable.Cell>
            <Badge
              tone={
                product.status === "ACTIVE"
                  ? "success"
                  : product.status === "DRAFT"
                    ? ""
                    : "warning"
              }
            >
              {product.status}
            </Badge>
          </IndexTable.Cell>
          {/* <IndexTable.Cell>{product?.start_date?.value || ""}</IndexTable.Cell>
          <IndexTable.Cell>{product?.end_date?.value || ""}</IndexTable.Cell> */}
          <IndexTable.Cell>{product?.totalInventory || ""}</IndexTable.Cell>
          <IndexTable.Cell>{product?.vendor || ""}</IndexTable.Cell>
          <IndexTable.Cell>{product?.category?.name || "N/A"}</IndexTable.Cell>
          <IndexTable.Cell>
            {product.channelPublicationCount || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>{product?.storage?.value || ""}</IndexTable.Cell>
          <IndexTable.Cell>
            {product?.per_order_limit?.value || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {product?.order_points?.value || ""}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {product?.bagging_score?.value || ""}
          </IndexTable.Cell>
        </IndexTable.Row>
      )),
    [products],
  );

  const filters = [
    {
      key: "productType",
      label: "Product type",
      filter: (
        <TextField
          label="Product Type"
          value={productType}
          onChange={handleProductTypeChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
    {
      key: "inventory",
      label: "Inventory",
      filter: (
        <RangeSlider
          label="Inventory is between"
          labelHidden
          value={inventoryLevels || [0, 1000]}
          min={0}
          max={1000}
          output
          step={1}
          onChange={handleInventoryChange}
        />
      ),
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
    if (productType) {
      tempFilters.push({
        key: "productType",
        label: `Type: ${productType}`,
        onRemove: handleProductTypeRemove,
      });
    }
    if (inventoryLevels) {
      tempFilters.push({
        key: "inventory",
        label: `Inventory between: ${inventoryLevels[0]} - ${inventoryLevels[1]}`,
        onRemove: handleInventoryRemove,
      });
    }
    return tempFilters;
  }, [
    queryValue,
    productType,
    inventoryLevels,
    handleQueryValueRemove,
    handleProductTypeRemove,
    handleInventoryRemove,
  ]);

  return (
    <>
      <div className="flex justify-end my-2">
        <Button variant="primary" url="/app/fresh-posid/products/new">
          Add Product
        </Button>
      </div>
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
            <Spinner accessibilityLabel="Loading products" size="large" />
          </div>
        )}
        {!loading && (
          <IndexTable
            // condensed={useBreakpoints().smDown}
            resourceName={resourceName}
            itemCount={products.length}
            headings={[
              { title: "" },
              { title: "Product" },
              { title: "Units" },
              { title: "Product Type" },
              { title: "Status" },
              // { title: "Start Date" },
              // { title: "End Date" },
              { title: "Inventory" },
              { title: "Vendor" },
              { title: "Category" },
              { title: "Sales channels" },
              { title: "Storage" },
              { title: "Order Limit" },
              { title: "Order Points" },
              { title: "Bagging score" },
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
              Page {currentPage} of {Math.ceil(totalProductCount / pageSize)}
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
