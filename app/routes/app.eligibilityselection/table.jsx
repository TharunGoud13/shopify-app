import { IndexTable, Text, Badge, Link } from "@shopify/polaris";

const Table = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "Criteria",
      plural: "Criteria",
    }}
    itemCount={data.length}
    headings={[
      { title: "Eligibility Criteria" },
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
          <Link url={`/app/eligibilityselectionid/${Id}`} rel="home">
            {row.eligibility_criteria}
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