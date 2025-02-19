// table.tsx
import { IndexTable, InlineStack, Text, Badge, Link } from "@shopify/polaris";

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const Table = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "API Setting",
      plural: "API Settings",
    }}
    itemCount={data.length}
    headings={[
      { title: "API Name" },
      { title: "API Type" },
      { title: "Description" },
      { title: "API URL" },
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
          <Link url={`/app/freshapisettingsid/${Id}`} rel="home">
            {row.api_name}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{row.api_type}</IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(row.description, { length: 50 })}
      </IndexTable.Cell>
      <IndexTable.Cell>{row.api_url}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={(row.status !== "false" && row.status) ? "success" : "warning"}>
          {(row.status !== "false" && row.status) ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
