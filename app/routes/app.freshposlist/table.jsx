import {
  IndexTable,
  InlineStack,
  Text,
  Badge,
  Link,
  Icon,
} from "@shopify/polaris";
import { EditIcon } from "@shopify/polaris-icons";
import { useNavigate } from "@remix-run/react";

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const Table = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "Fresh Pos List",
      plural: "Fresh Pos Lists",
    }}
    itemCount={data.length}
    headings={[
      { title: "Pos Name" },
      { title: "Pos Code" },
      { title: "Description" },
      { title: "Page URL" },
      { title: "Status" },
      { title: "Store Name" },
      { title: "Created User" },
      { title: "Zip Codes" },
    ]}
    selectable={false}
  >
    {data.map((row) => (
      <TableRow key={row.id} row={row} />
    ))}
  </IndexTable>
);

const TableRow = ({ row }) => {
  const navigate = useNavigate();
  const Id = row.id.split("/").pop();
  return (
    <IndexTable.Row id={row.id} position={row.id}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          <Link url={`/app/freshposlistid/${Id}`} rel="home">
            {row.pos_name}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{row.pos_code}</IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(row.description, { length: 50 })}
      </IndexTable.Cell>
      <IndexTable.Cell>{row.page_url}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          tone={row.status !== "false" && row.status ? "success" : "warning"}
        >
          {row.status !== "false" && row.status ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>{row.storename}</IndexTable.Cell>
      <IndexTable.Cell>{row.created_user}</IndexTable.Cell>
      <IndexTable.Cell>
        <div
          onClick={() => {
            navigate(`/app/freshposlistzipcodesid/${Id}`);
          }}
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          <Icon source={EditIcon} />
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
