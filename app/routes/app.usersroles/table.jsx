// table.tsx
import {
  IndexTable,
  InlineStack,
  Text,
  Avatar,
  Badge,
} from "@shopify/polaris";

const StaffRolesTable = ({ staffMembers, assignedRoles }) => (
  <IndexTable
    resourceName={{
      singular: "Staff Member",
      plural: "Staff Members",
    }}
    itemCount={staffMembers.length}
    headings={[
      { title: "Avatar" },
      { title: "Name" },
      { title: "Email" },
      { title: "Phone" },
      { title: "Assigned Roles" },
    ]}
    selectable={false}
  >
    {staffMembers.map((staff) => (
      <StaffTableRow key={staff.id} staff={staff} assignedRoles={assignedRoles} />
    ))}
  </IndexTable>
);

const StaffTableRow = ({ staff, assignedRoles }) => {
  // Find assigned roles for the current staff member
  const roles = assignedRoles
    .filter((role) => role.shopifyuserid === staff.id)
    .map((role) => role.assigned_roles)
    .flat();

  return (
    <IndexTable.Row id={staff.id} position={staff.id}>
      <IndexTable.Cell>
        <Avatar
          size="small"
          source={staff.avatar?.url}
          name={staff.name}
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold">
          {staff.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text>{staff.email || "N/A"}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text>{staff.phone || "N/A"}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="2">
          {roles.length > 0 ? (
            roles.map((role, index) => (
              <Badge key={index} status="info">
                {role}
              </Badge>
            ))
          ) : (
            <Text>No roles assigned</Text>
          )}
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default StaffRolesTable;
