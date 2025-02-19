// table.tsx
import { IndexTable, InlineStack, Text, Badge, Link } from "@shopify/polaris";

const Table = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "Race/Ethnicity",
      plural: "Races/Ethnicities",
    }}
    itemCount={data.length}
    headings={[
      { title: "Race/Ethnicity" },
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
          <Link url={`/app/raceethnicityid/${Id}`} rel="home">
            {row.race_ethnicity}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={row.status === "true" ? "success" : "warning"}>
          {row.status === "true" ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
