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
      singular: "Storage Page",
      plural: "Storage",
    }}
    itemCount={data.length}
    headings={[
      { title: "Storage Title" },
      { title: "Store Name" },
      { title: "Pos Name" },
      { title: "Storage Type" },
      { title: "Storage Size" },
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
          <Link url={`/app/storageid/${Id}`} rel="home">
            {row.storage_title || "no title"}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{row.store_name}</IndexTable.Cell>
      <IndexTable.Cell>{row.pos_name}</IndexTable.Cell>
      <IndexTable.Cell>{row.storage_type}</IndexTable.Cell>
      <IndexTable.Cell>{row.size}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          tone={row.status !== "false" && !!row.status ? "success" : "warning"}
        >
          {row.status !== "false" && !!row.status ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
