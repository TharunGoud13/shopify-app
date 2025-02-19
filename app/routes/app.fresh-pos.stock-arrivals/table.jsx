import {
  TextField,
  IndexTable,
  Card,
  IndexFilters,
  useSetIndexFiltersMode,
  Text,
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
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [queryValue, setQueryValue] = useState("");
  const [sortSelected, setSortSelected] = useState(["updated_at desc"]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalLogCount, setTotalLogCount] = useState(0);
  const [startCursor, setStartCursor] = useState(null);
  const [endCursor, setEndCursor] = useState(null);
  const pageSize = 10;
  const { mode, setMode } = useSetIndexFiltersMode();
  const sortOptions = useMemo(
    () => [
      { label: "Id", value: "id asc", directionLabel: "A-Z" },
      { label: "Id", value: "id desc", directionLabel: "Z-A" },
      { label: "Updated Date", value: "updated_at asc", directionLabel: "A-Z" },
      {
        label: "Updated Date",
        value: "updated_at desc",
        directionLabel: "Z-A",
      },
    ],
    [],
  );

  const resourceName = useMemo(
    () => ({
      singular: "Arrival",
      plural: "Arrivals",
    }),
    [],
  );

  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);

  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
  }, [handleQueryValueRemove]);

  const fetchInventoryLogs = useCallback(
    async (
      q = "",
      sortKey = "updated_at",
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
            query Metaobjects(
            $query: String
            $sortKey: String
            $reverse: Boolean
            $after: String
            $before: String
            $first: Int
            $last: Int
            ) {
            metaobjects(
                type: "inventory_logs"
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
                    updatedAt
                    fields {
                    key
                    value
                    jsonValue
                    }
                }
                }
            }
            }
            `;

      try {
        const response = await fetchGraphQL(query, variables, true);

        const data = response.metaobjects;
        if (data) {
          const logs = data.edges.map((edge) => {
            const fields = edge.node.fields.reduce((acc, field) => {
              acc[field.key] = field.jsonValue;
              return acc;
            }, {});
            return {
              id: edge.node.id,
              updatedAt: edge.node.updatedAt,
              ...fields,
            };
          });

          setInventoryLogs(logs);
          setHasNextPage(data.pageInfo.hasNextPage);
          setHasPreviousPage(data.pageInfo.hasPreviousPage);
          setTotalLogCount(data.edges.length); // total count
          setStartCursor(data.pageInfo.startCursor);
          setEndCursor(data.pageInfo.endCursor);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchInventoryLogs();
  }, [fetchInventoryLogs]);

  useEffect(() => {
    var q = [];
    const srt = sortSelected[0].split(" ");

    if (!!queryValue) {
      q.push(`id:${queryValue}`);
    }

    fetchInventoryLogs(
      q.join(" AND "),
      srt[0],
      srt[1] === "desc" ? true : false,
    );
    setCurrentPage(1); // Reset to the first page when filters change
  }, [queryValue, sortSelected, fetchInventoryLogs]);

  const handlePageChange = useCallback(
    (direction) => {
      const srt = sortSelected[0].split(" ");
      var q = [];
      const srtArray = sortSelected[0].split(" ");

      if (!!queryValue) {
        q.push(`id:${queryValue}`);
      }

      if (direction === "next") {
        fetchInventoryLogs(
          q.join(" AND "),
          srtArray[0],
          srtArray[1] === "desc" ? true : false,
          endCursor,
        );
        setCurrentPage((prev) => prev + 1);
      } else {
        fetchInventoryLogs(
          q.join(" AND "),
          srtArray[0],
          srtArray[1] === "desc" ? true : false,
          null,
          startCursor,
        );
        setCurrentPage((prev) => prev - 1);
      }
    },
    [endCursor, startCursor, queryValue, sortSelected, fetchInventoryLogs],
  );

  const rowMarkup = useMemo(
    () =>
      inventoryLogs.map((log, index) => {
        const id = log.id?.split("/").pop() || "";
        return (
          <IndexTable.Row id={log.id} key={log.id} position={index}>
            <IndexTable.Cell>
              <Link url={`/app/fresh-posid/stock-arrivals/${id}`}>
                <Text variant="bodyMd" fontWeight="bold" as="span">
                  {id}
                </Text>
              </Link>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {new Date(log.updatedAt).toLocaleString()}
            </IndexTable.Cell>
            <IndexTable.Cell>{log.movement_type}</IndexTable.Cell>
            <IndexTable.Cell>{log.narration}</IndexTable.Cell>
          </IndexTable.Row>
        );
      }),
    [inventoryLogs],
  );

  const filters = [
    {
      key: "id",
      label: "Search by ID",
      filter: (
        <TextField
          label="Search by ID"
          value={queryValue}
          onChange={(v) => {
            setQueryValue(v);
          }}
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
    return tempFilters;
  }, [queryValue, handleQueryValueRemove]);

  return (
    <>
      <div className="flex justify-end my-2">
        <Button variant="primary" url="/app/fresh-posid/stock-arrivals/new">
          Add Arrival
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
            resourceName={resourceName}
            itemCount={inventoryLogs.length}
            headings={[
              { title: "ID" },
              { title: "Date" },
              { title: "Movement Type" },
              { title: "Narration" },
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
              Page {currentPage} of {Math.ceil(totalLogCount / pageSize)}
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
