// CustomRolesTable.jsx
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

const CustomRolesTable = ({ userCustomRoles }) => (
  <IndexTable
    resourceName={{
      singular: "Custom Role",
      plural: "Custom Roles",
    }}
    itemCount={userCustomRoles.length}
    headings={[
      { title: "Role Title" },
      { title: "Permissions" },
      { title: "Status" },
      { title: "Description" },
    ]}
    selectable={false}
  >
    {userCustomRoles.map((role) => (
      <RoleTableRow key={role.id} role={role} />
    ))}
  </IndexTable>
);

const RoleTableRow = ({ role }) => {
  const navigate = useNavigate();
  const userId = role.user_id ? role.user_id.split("/").pop() : "";
  const Id = role.id.split("/").pop();
  return (
    <IndexTable.Row id={role.id} position={role.id}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          <Link url={`/app/customroleid/${Id}`}>{role.custom_role}</Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="4">
          <div
            onClick={() => {
              navigate(`/app/customrolepermissionid/${Id}`);
            }}
            style={{ cursor: "pointer", display: "inline-block" }}
          >
            <Icon source={EditIcon} />
          </div>

          {role.customrole_permissions
            ? role.customrole_permissions.map((perm, index) => (
                <Text key={index} as="span">
                  {index !== 0 ? ", " : ""}
                  {perm}
                </Text>
              ))
            : "No permissions"}
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          tone={role.status !== "false" && role.status ? "success" : "warning"}
        >
          {role.status !== "false" && role.status ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {truncate(role.description, { length: 50 })}
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default CustomRolesTable;
