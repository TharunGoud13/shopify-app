import { IndexTable, InlineStack, Text, Badge, Link } from "@shopify/polaris";

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const RegistrationTable = ({ data }) => (
  <IndexTable
    resourceName={{
      singular: "Registration",
      plural: "Registrations",
    }}
    itemCount={data.length}
    headings={[
      { title: "Registration No" },
      { title: "First Name" },
      { title: "Last Name" },
      { title: "Race Ethnicity" },
      { title: "DOB" },
      { title: "Gender" },
      { title: "Language" },
      { title: "No. of House Hold" },
      { title: "Email" },
      { title: "Mobile" },
      { title: "Location" },
      { title: "City" },
      { title: "Zip Code" },
      { title: "Registration Status" },
    ]}
    selectable={false}
  >
    {data.map((row) => (
      <RegistrationTableRow key={row.id} row={row} />
    ))}
  </IndexTable>
);

const RegistrationTableRow = ({ row }) => {
  const Id = row.id.split("/").pop();
  return (
    <IndexTable.Row id={row.id} position={row.id}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          <Link url={`/app/registrationid/${Id}`} rel="home">
            {/* {row.registration_no ? row.registration_no : "_"} */}
            {Id}
          </Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{row.first_name}</IndexTable.Cell>
      <IndexTable.Cell>{row.last_name}</IndexTable.Cell>
      <IndexTable.Cell>
        {(() => {
          try {
            return Array.isArray(row.race_ethnicity)
              ? row.race_ethnicity.join(", ")
              : row.race_ethnicity.race_ethnicity;
          } catch (error) {
            return row.race_ethnicity;
          }
        })()}
      </IndexTable.Cell>
      <IndexTable.Cell>{row.date_of_birth}</IndexTable.Cell>
      <IndexTable.Cell>{row.gender}</IndexTable.Cell>
      <IndexTable.Cell>{row?.preferred_language || ""}</IndexTable.Cell>
      <IndexTable.Cell>
        {row?.total_no_of_people_in_household || ""}
      </IndexTable.Cell>
      <IndexTable.Cell>{row.email}</IndexTable.Cell>
      <IndexTable.Cell>{row.cell_phone}</IndexTable.Cell>
      <IndexTable.Cell>{row.location}</IndexTable.Cell>
      <IndexTable.Cell>{row.city}</IndexTable.Cell>
      <IndexTable.Cell>{row.zip_code}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          tone={row.registration_status === "true" ? "success" : "warning"}
        >
          {row.registration_status === "true" ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default RegistrationTable;
