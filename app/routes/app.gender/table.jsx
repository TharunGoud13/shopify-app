import { IndexTable, Text, Badge, Link } from "@shopify/polaris";

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const Table = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "Gender",
      plural: "Genders",
    }}
    itemCount={data.length}
    headings={[
      { title: "Gender" },
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
          <Link url={`/app/genderid/${Id}`} rel="home">
            {row.gender}
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