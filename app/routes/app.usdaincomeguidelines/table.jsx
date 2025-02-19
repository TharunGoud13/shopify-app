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
      singular: "Guideline",
      plural: "Guidelines",
    }}
    itemCount={data.length}
    headings={[
      { title: "No. of People in Household" },
      { title: "Annual Income" },
      { title: "Monthly Income" },
      { title: "Weekly Income" },
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
          <Link url={`/app/usdaincomeguidelinesid/${Id}`} rel="home">
            {row.no_of_people_in_house_hold}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{row.annual}</IndexTable.Cell>
      <IndexTable.Cell>{row.monthly}</IndexTable.Cell>
      <IndexTable.Cell>{row.weekly}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={row.status === "true" ? "success" : "warning"}>
          {row.status === "true" ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
