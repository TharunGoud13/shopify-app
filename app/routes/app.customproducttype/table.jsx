// CustomRolesTable.jsx
import { IndexTable, InlineStack, Text, Badge, Link } from "@shopify/polaris";

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const Table = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "Product Type",
      plural: "Product Types",
    }}
    itemCount={data.length}
    headings={[
      { title: "Product Type" },
      { title: "Display order" },
      { title: "Order limit" },
      { title: "Status" },
    ]}
    selectable={false}
  >
    {data.map((row) => (
      <TableRow key={row.id} row={row} />
    ))}
  </IndexTable>
);

const TableRow = ({ row }) => {
  const Id = row.id.split("/").pop();
  return (
    <IndexTable.Row id={row.id} position={row.id}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          <Link url={`/app/customproducttypeid/${Id}`} rel="home">
            {row.custom_product_type}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{row?.display_order || ""}</IndexTable.Cell>
      <IndexTable.Cell>{row?.order_limit || ""}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          tone={row.status !== "false" && row.status ? "success" : "warning"}
        >
          {row.status !== "false" && row.status ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
