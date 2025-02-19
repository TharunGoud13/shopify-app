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
      singular: "Custom Order Status",
      plural: "Custom Order Status",
    }}
    itemCount={data.length}
    headings={[
      { title: "Status datetime" },
      { title: "Order Id" },
      { title: "Order Number" },
      { title: "Customer Id" },
      { title: "Customer Name" },
      { title: "Order Status" },
      { title: "Colour Code" },
      { title: "Status Icon" },
      { title: "Message To Admin" },
      { title: "Message To Customer" },
      { title: "Store Name" },
      { title: "Location" },
      { title: "Pickup address" },
      { title: "Remarks" },
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
      {/* <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          <Link url={`/app/customorderstatusid/${Id}`} rel="home">
            {row.order_status_title}
          </Link>
        </Text>
      </IndexTable.Cell> */}
      <IndexTable.Cell>{row.status_date_time}</IndexTable.Cell>
      <IndexTable.Cell>{row.order_ref_id}</IndexTable.Cell>
      <IndexTable.Cell>{row.order_ref_no}</IndexTable.Cell>
      <IndexTable.Cell>{row.customer_ref_id}</IndexTable.Cell>
      <IndexTable.Cell>{row.customer_name}</IndexTable.Cell>
      <IndexTable.Cell>{row.custom_order_status}</IndexTable.Cell>
      <IndexTable.Cell>{row.color_code}</IndexTable.Cell>
      <IndexTable.Cell>{row.status_icon}</IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(row.message_to_admin, { length: 50 })}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(row.message_to_customer, { length: 50 })}
      </IndexTable.Cell>
      <IndexTable.Cell>{row.pick_up_location}</IndexTable.Cell>
      <IndexTable.Cell>{row.pick_up_address}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default Table;
