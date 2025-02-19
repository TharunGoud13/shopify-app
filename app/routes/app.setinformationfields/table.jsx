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
      singular: "Set Information Field",
      plural: "Set Information Fields",
    }}
    itemCount={data.length}
    headings={[
      { title: "Title" },
      { title: "Description" },
      { title: "Remarks" },
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
          <Link url={`/app/setinformationfieldsid/${Id}`} rel="home">
            {row.title}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(row.description, { length: 50 })}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(row.remarks, { length: 50 })}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={(row.status !== "false" && row.status) ? "success" : "warning"}>
          {(row.status !== "false" && row.status) ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );  
};

export default Table;
