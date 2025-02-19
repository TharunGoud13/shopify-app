import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { json, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import {
  Page,
  Banner,
  IndexTable,
  InlineStack,
  Text,
  Badge,
  Link,
  Button as PButton,
  Select as PSelect,
  TextField as PTextField,
  Checkbox as PCheckbox,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import MembersTable from "./MembersTable";
import AccountForm from "./AccountForm";
import StateSelect from "./StateSelect";

const situations = [
  "In need of emergency food",
  "Meets the income guidelines",
  "Participates in SNAP, WIC, FDPIR, or has a child receiving free/reduced meals at school",
  "None of the above",
];

const genderOptions = ["Male", "Female", "Prefer not to say"];

const languageOptions = [
  "English",
  "Spanish",
  "Chinese",
  "Vietnamese",
  "Korean",
  "Other",
];

const householdSizes = Array.from({ length: 10 }, (_, i) => i + 1);

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  const incomeDataResponse = await admin.graphql(
    `{
      metaobjects(type: "usda_income_guidelines", first: 250) {
        edges {
          node {
            id
            fields {
              key
              value
              jsonValue
            }
          }
        }
      }
    }`,
  );
  const jsonIncomeDataResponse = await incomeDataResponse.json();

  const raceEthnicityDataResponse = await admin.graphql(
    `{
      metaobjects(type: "race_ethnicity", first: 250) {
        edges {
          node {
            id
            fields {
              key
              value
              jsonValue
            }
          }
        }
      }
    }`,
  );
  const jsonRaceEthnicityDataResponse = await raceEthnicityDataResponse.json();

  const posZipCodesDataResponse = await admin.graphql(
    `{
      metaobjects(type: "pos_zip_codes", first: 250) {
        edges {
          node {
            id
            fields {
              key
              value
              jsonValue
            }
          }
        }
      }
    }`,
  );
  const jsonPosZipCodesDataResponse = await posZipCodesDataResponse.json();

  if (params.id === "new") {
    return json({
      registration_status: "true",
      onboard_status: "false",
      registration_no: "",
      first_name: "",
      last_name: "",
      gender: "Male",
      race_ethnicity: [],
      usda_eligibility_status: "",
      date_of_birth: "",
      total_no_of_people_in_household: "1",
      preferred_language: "English",
      street_address_line_1: "",
      street_address_line_2: "",
      city: "",
      state: "Alabama",
      zip_code: "",
      cell_phone: "",
      email: "",
      consent: false,
      digital_id_consent: false,
      location: "",
      remarks: "",
      members: [],
      status_comment: "",
      service_model: ["Curbside", "Locker", "Store"],
      service_model_block: [],
      incomeData: jsonIncomeDataResponse.data.metaobjects.edges.map((edge) => {
        const fields = edge.node.fields.reduce((acc, field) => {
          acc[field.key] = field.jsonValue;
          return acc;
        }, {});
        return {
          id: edge.node.id,
          handle: edge.node.handle,
          ...fields,
        };
      }),
      race_ethnicity_options:
        jsonRaceEthnicityDataResponse.data.metaobjects.edges.map((edge) => {
          const fields = edge.node.fields.reduce((acc, field) => {
            acc[field.key] = field.jsonValue;
            return acc;
          }, {});
          return {
            id: edge.node.id,
            handle: edge.node.handle,
            ...fields,
          };
        }),
      pos_zip_codes: jsonPosZipCodesDataResponse.data.metaobjects.edges.map(
        (edge) => {
          const fields = edge.node.fields.reduce((acc, field) => {
            acc[field.key] = field.jsonValue;
            return acc;
          }, {});
          return fields?.zip_code;
        },
      ),
    });
  }

  const dataResponse = await admin.graphql(
    `{
      metaobject(id: "gid://shopify/Metaobject/${params.id}") {
        id
        handle
        fields {
          key
          value
          jsonValue
        }
      }
    }`,
  );

  const jsonDataResponse = await dataResponse.json();

  const metaobject = jsonDataResponse?.data?.metaobject?.fields?.reduce(
    (acc, field) => {
      acc[field.key] = field.jsonValue || "";
      return acc;
    },
    {},
  );

  metaobject["id"] = jsonDataResponse?.data?.metaobject?.id;
  // metaobject["registration_no"] = jsonDataResponse?.data?.metaobject?.id
  //   ?.split("/")
  //   .pop();
  metaobject["members"] = [];
  metaobject["incomeData"] = jsonIncomeDataResponse.data.metaobjects.edges.map(
    (edge) => {
      const fields = edge.node.fields.reduce((acc, field) => {
        acc[field.key] = field.jsonValue;
        return acc;
      }, {});
      return {
        id: edge.node.id,
        handle: edge.node.handle,
        ...fields,
      };
    },
  );
  metaobject["race_ethnicity_options"] =
    jsonRaceEthnicityDataResponse.data.metaobjects.edges.map((edge) => {
      const fields = edge.node.fields.reduce((acc, field) => {
        acc[field.key] = field.jsonValue;
        return acc;
      }, {});
      return {
        id: edge.node.id,
        handle: edge.node.handle,
        ...fields,
      };
    });

  metaobject["pos_zip_codes"] =
    jsonPosZipCodesDataResponse.data.metaobjects.edges.map((edge) => {
      const fields = edge.node.fields.reduce((acc, field) => {
        acc[field.key] = field.jsonValue;
        return acc;
      }, {});
      return fields.zip_code;
    });

  return json(metaobject);
}

export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const formData = Object.fromEntries(await request.formData());

  const actionType = formData.action || "save";

  if (actionType === "delete" && params.id) {
    const response = await admin.graphql(
      `#graphql
      mutation DeleteMetaobject($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Metaobject/${params.id}`,
        },
      },
    );

    const jsonResponse = await response.json();

    const { userErrors } = jsonResponse.data.metaobjectDelete;
    if (userErrors && userErrors.length) {
      return json(
        {
          errors: userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    return redirect("/app/registration");
  }

  const data = {
    registration_status: formData.registration_status,
    onboard_status: formData.onboard_status,
    registration_no: formData.registration_no,
    first_name: formData.first_name,
    last_name: formData.last_name,
    gender: formData.gender,
    race_ethnicity: formData.race_ethnicity,
    usda_eligibility_status: formData.usda_eligibility_status,
    date_of_birth: formData.date_of_birth,
    total_no_of_people_in_household: formData.total_no_of_people_in_household,
    preferred_language: formData.preferred_language,
    street_address_line_1: formData.street_address_line_1,
    street_address_line_2: formData.street_address_line_2,
    city: formData.city,
    state: formData.state,
    zip_code: formData.zip_code,
    cell_phone: formData.cell_phone,
    email: formData.email,
    consent: formData.consent === "true",
    digital_id_consent: formData.digital_id_consent === "true",
    location: formData.location,
    remarks: formData.remarks,
    status_comment: formData.status_comment,
    service_model: formData.service_model,
    service_model_block: formData.service_model_block,
  };

  // Validate required fields
  console.log(
    "amlll",
    data.race_ethnicity,
    data.service_model,
    data.service_model_block,
  );
  const errors = {};
  if (!data.first_name) errors.first_name = "First Name is required";
  if (!data.last_name) errors.last_name = "Last Name is required";
  if (!data.gender) errors.gender = "Gender is required";
  if (!data.preferred_language)
    errors.preferred_language = "Preferred language is required";
  if (!data.total_no_of_people_in_household)
    errors.total_no_of_people_in_household = "this field is required";
  if (!data.street_address_line_1)
    errors.street_address_line_1 = "address is required";
  if (!data.city) errors.city = "city is required";
  if (!data.state) errors.state = "state is required";
  if (!data.zip_code) errors.zip_code = "zip_code is required";
  if (!data.service_model?.length)
    errors.service_model = "service_model is required";
  if (!data.registration_status)
    errors.registration_status = "registration_status  is required";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });

  // Update or create logic
  if (params.id === "new") {
    const response = await admin.graphql(
      `#graphql
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            fields {
              key
              value
              jsonValue
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          metaobject: {
            type: "registration",
            fields: Object.entries(data).map(([key, value]) => ({
              key,
              value: typeof value === "boolean" ? String(value) : value,
            })),
          },
        },
      },
    );

    const jsonResponse = await response.json();

    const { userErrors } = jsonResponse.data.metaobjectCreate;
    if (userErrors && userErrors.length) {
      return json(
        {
          errors: userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    const NewRecordID = jsonResponse.data.metaobjectCreate.metaobject.id
      ? jsonResponse.data.metaobjectCreate.metaobject.id.split("/").pop()
      : "";
    return redirect(
      `/app/registrationid/${NewRecordID}?successMessage=Record created successfully`,
    );
  }

  if (params.id !== "new") {
    const response = await admin.graphql(
      `#graphql
      mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            fields {
                  key
                  value
                  jsonValue
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          id: "gid://shopify/Metaobject/" + params.id,
          metaobject: {
            fields: Object.entries(data).map(([key, value]) => ({
              key,
              value: typeof value === "boolean" ? String(value) : value,
            })),
          },
        },
      },
    );

    const jsonResponse = await response.json();

    // Handle GraphQL errors
    const { userErrors } = jsonResponse.data.metaobjectUpdate;
    if (userErrors && userErrors.length) {
      return json(
        {
          errors: userErrors.reduce(
            (acc, err) => ({ ...acc, [err.field]: err.message }),
            {},
          ),
        },
        { status: 422 },
      );
    }

    return redirect(
      `/app/registrationid/${params.id}?successMessage=Record updated successfully`,
    );
  }

  return redirect(`/app/registrationid/${params.id}`);
}

export default function TabbedForm() {
  let errors = useActionData()?.errors || {};
  const data = useLoaderData();
  const [formState, setFormState] = useState(data);
  const [cleanFormState, setCleanFormState] = useState(data);
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState("");
  const shopify = useAppBridge();
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);
  const submit = useSubmit();
  const navigate = useNavigate();
  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";

  const [activeTab, setActiveTab] = useState("household");

  let raceEthnicity;
  try {
    raceEthnicity = JSON.parse(data.race_ethnicity);
  } catch (error) {
    raceEthnicity = Array.isArray(data.race_ethnicity)
      ? data.race_ethnicity
      : [];
  }

  let serviceModel;
  try {
    serviceModel = JSON.parse(data.service_model);
  } catch (error) {
    serviceModel = Array.isArray(data.service_model) ? data.service_model : [];
  }

  let serviceModelBlock;
  try {
    serviceModelBlock = JSON.parse(data.service_model_block);
  } catch (error) {
    serviceModelBlock = Array.isArray(data.service_model_block)
      ? data.service_model_block
      : [];
  }

  const [headOfHouseHoldData, setHeadOfHouseHoldData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    street_address_line_1: "",
    street_address_line_2: "",
    city: "",

    zip_code: "",
    cell_phone: "",
    status_comment: "",
    status: "true",
    ...data,
    state: data?.state || "Alabama",
    gender: data?.gender || "Male",
    preferred_language: data?.preferred_language || "English",
    total_no_of_people_in_household:
      data?.total_no_of_people_in_household || "1",
    race_ethnicity: Array.isArray(raceEthnicity) ? raceEthnicity : [],
    service_model: Array.isArray(serviceModel) ? serviceModel : [],
    service_model_block: Array.isArray(serviceModelBlock)
      ? serviceModelBlock
      : [],
  });

  useEffect(() => {
    const errorsLength = Object.keys(errors).length;

    if (errorsLength) {
      const errorMessages = Object.entries(errors)
        .map(([key, message]) => `${key}: ${message}`)
        .join(", ");

      shopify.toast.show(`There are errors: ${errorMessages}`, {
        isError: true,
      });
    }
  }, [errors, shopify]);

  useEffect(() => {
    const message = searchParams.get("successMessage");
    if (message) {
      setSuccessMessage(message);
      searchParams.delete("successMessage");
      navigate(
        {
          pathname: window.location.pathname,
          search: searchParams.toString(),
        },
        { replace: true },
      );
    }
  }, [searchParams, navigate]);

  const handleHeadOfHouseHoldChange = (field, value) => {
    setHeadOfHouseHoldData({ ...headOfHouseHoldData, [field]: value });
  };

  const handleHeadOfHouseHoldEthnicityChange = (ethnicity) => {
    const selectedEth = headOfHouseHoldData.race_ethnicity;

    try {
      if (selectedEth.includes(ethnicity)) {
        setHeadOfHouseHoldData({
          ...headOfHouseHoldData,
          race_ethnicity: selectedEth.filter((e) => e !== ethnicity),
        });
      } else {
        setHeadOfHouseHoldData({
          ...headOfHouseHoldData,
          race_ethnicity: [...selectedEth, ethnicity],
        });
      }
    } catch (error) {
      console.error(error);
      setHeadOfHouseHoldData({
        ...headOfHouseHoldData,
        race_ethnicity: [ethnicity],
      });
    }
  };
  const handleServiceModelChange = (model) => {
    const selected = headOfHouseHoldData.service_model;
    const newModels = selected.includes(model)
      ? selected.filter((m) => m !== model)
      : [...selected, model];

    setHeadOfHouseHoldData({
      ...headOfHouseHoldData,
      service_model: newModels,
    });
  };

  const handleServiceModelBlockChange = (model) => {
    const selected = headOfHouseHoldData.service_model_block;
    const newModels = selected.includes(model)
      ? selected.filter((m) => m !== model)
      : [...selected, model];

    setHeadOfHouseHoldData({
      ...headOfHouseHoldData,
      service_model_block: newModels,
    });
  };

  const validateZipCode = () => {
    const { zip_code } = headOfHouseHoldData;
    if (!zip_code) return false;
    console.log(`Zip Code: ${zip_code}`, data.pos_zip_codes);
    // const validZipCodes = data?.pos_zip_codes?.map((item) => item.zip_code);
    return data?.pos_zip_codes?.includes(zip_code);
  };

  const saveHeadOfHouseHold = async () => {
    if (!validateZipCode()) {
      shopify.toast.show(`Zip Code is not valid`, {
        isError: true,
      });
      setHeadOfHouseHoldData({
        ...headOfHouseHoldData,
        zip_code: "",
      });

      errors.zip_code = "Zip Code is not valid";

      return;
    }

    // Simulate save
    const registrationData = {
      ...formState,
      ...headOfHouseHoldData,
      race_ethnicity: JSON.stringify(headOfHouseHoldData?.race_ethnicity),
      service_model: JSON.stringify(headOfHouseHoldData.service_model),
      service_model_block: JSON.stringify(
        headOfHouseHoldData.service_model_block,
      ),
    };

    console.log("registrationData", registrationData);
    submit(registrationData, { method: "post" });
    setCleanFormState({ ...registrationData });

    if (formState?.id === undefined || formState?.id === null) {
      //redirect to new id after the record has been created
      // await  router.push(`/app/registrationid/${NewRecordID}`)
    } else {
      // navigate(`/app/registrationid/${formState?.id}`)
    }

    // setActiveTab("members");
  };

  return (
    <Page
      backAction={{ content: "Registrations", url: "/app/registration" }}
      title={formState.id ? "Edit Registration" : "Add Registration"}
    >
      {!!successMessage && successMessage !== "" && (
        <>
          <Banner
            title={successMessage}
            tone="success"
            onDismiss={() => setSuccessMessage("")}
          />
          <div style={{ height: "20px" }}></div>
        </>
      )}
      {Object.keys(errors).length > 0 && (
        <>
          <Banner title="Errors in the form" tone="critical">
            {Object.entries(errors).map(([key, message]) => (
              <p key={key}>{`${key.replace(/_/g, " ")}: ${message}`}</p>
            ))}
          </Banner>
          <div style={{ height: "20px" }}></div>
        </>
      )}
      <div className="w-full max-w-4xl mx-auto px-4 pb-4 md:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full overflow-x-auto flex whitespace-nowrap">
            <TabsTrigger value="household" className="flex-shrink-0">
              Head of Household
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-shrink-0">
              Members
            </TabsTrigger>
            <TabsTrigger value="account" className="flex-shrink-0">
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="household">
            <div className="space-y-2">
              <div className="mb-4">
                <PSelect
                  label="Eligibility Selection"
                  options={situations.map((situation, index) => ({
                    label: situation,
                    value: situation,
                  }))}
                  onChange={(value) =>
                    handleHeadOfHouseHoldChange(
                      "usda_eligibility_status",
                      value,
                    )
                  }
                  value={headOfHouseHoldData.usda_eligibility_status}
                  error={errors.usda_eligibility_status}
                />
              </div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-4">
                  Income Guidelines
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <IndexTable
                    resourceName={{
                      singular: "Income Guideline",
                      plural: "Income Guidelines",
                    }}
                    itemCount={(data?.incomeData || []).length}
                    headings={[
                      { title: "# of people in household" },
                      { title: "Annual" },
                      { title: "Monthly" },
                      { title: "Weekly" },
                    ]}
                    selectable={false}
                  >
                    {(data?.incomeData || []).map((row) => (
                      <IndexTable.Row id={row.id} position={row.id}>
                        <IndexTable.Cell>
                          {row.no_of_people_in_house_hold}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          ${row.annual.toLocaleString()}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          ${row.monthly.toLocaleString()}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          ${row.weekly.toLocaleString()}
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                </div>
              </div>
              <PTextField
                label="Registration No"
                value={headOfHouseHoldData.registration_no}
                onChange={(value) =>
                  handleHeadOfHouseHoldChange("registration_no", value)
                }
                error={errors.registration_no}
                readOnly={true}
              />

              <h2 className="text-xl font-semibold mb-4">
                Head of Household Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PTextField
                    label="First name"
                    value={headOfHouseHoldData.first_name}
                    onChange={(value) =>
                      handleHeadOfHouseHoldChange("first_name", value)
                    }
                    error={errors.first_name}
                  />
                </div>
                <div className="space-y-2">
                  <PTextField
                    label="Last name"
                    value={headOfHouseHoldData.last_name}
                    onChange={(value) =>
                      handleHeadOfHouseHoldChange("last_name", value)
                    }
                    error={errors.last_name}
                  />
                </div>
              </div>
              <PTextField
                label="Email"
                value={headOfHouseHoldData.email}
                onChange={(value) =>
                  handleHeadOfHouseHoldChange("email", value)
                }
                error={errors.email}
              />
              <div className="space-y-2">
                <div>
                  <Label className="text-gray-700">Race/Ethnicity</Label>
                  <p className="text-sm text-gray-500">Check all that apply.</p>
                </div>
                <div className="space-y-0">
                  {(data.race_ethnicity_options || []).map(
                    ({ race_ethnicity: ethnicity }) => (
                      <div
                        key={ethnicity}
                        className="flex items-center space-x-2"
                      >
                        <PCheckbox
                          label={ethnicity}
                          checked={headOfHouseHoldData.race_ethnicity.includes(
                            ethnicity,
                          )}
                          onChange={(checked) =>
                            handleHeadOfHouseHoldEthnicityChange(ethnicity)
                          }
                        />
                      </div>
                    ),
                  )}
                  {errors?.race_ethnicity && (
                    <div className="text-red-500">{errors?.race_ethnicity}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob" className="text-gray-700">
                  Date of birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  placeholder="dd/mm/yyyy"
                  value={headOfHouseHoldData.date_of_birth}
                  onChange={(e) =>
                    handleHeadOfHouseHoldChange("date_of_birth", e.target.value)
                  }
                  className="w-full md:w-[300px]"
                />
              </div>

              <PSelect
                label="Gender"
                options={genderOptions.map((option, index) => ({
                  label: option,
                  value: option,
                }))}
                onChange={(value) =>
                  handleHeadOfHouseHoldChange("gender", value)
                }
                value={headOfHouseHoldData.gender}
                error={errors.gender}
              />

              <PSelect
                label="Preferred Language"
                options={languageOptions.map((option, index) => ({
                  label: option,
                  value: option,
                }))}
                onChange={(value) =>
                  handleHeadOfHouseHoldChange("preferred_language", value)
                }
                value={headOfHouseHoldData.preferred_language}
                error={errors.preferred_language}
              />

              <PSelect
                label="Total number of people in household"
                options={householdSizes.map((size, index) => ({
                  label: size,
                  value: size.toString(),
                }))}
                onChange={(value) =>
                  handleHeadOfHouseHoldChange(
                    "total_no_of_people_in_household",
                    value,
                  )
                }
                value={headOfHouseHoldData.total_no_of_people_in_household.toString()}
                error={errors.total_no_of_people_in_household}
              />
              <div className="space-y-2 mt-8">
                <h3 className="text-xl font-semibold mb-4">
                  Contact Information
                </h3>

                <PTextField
                  label="Street Address Line 1 (with unit #)"
                  value={headOfHouseHoldData.street_address_line_1}
                  onChange={(value) =>
                    handleHeadOfHouseHoldChange("street_address_line_1", value)
                  }
                  error={errors.street_address_line_1}
                />

                <PTextField
                  label="Street Address Line 2"
                  value={headOfHouseHoldData.street_address_line_2}
                  onChange={(value) =>
                    handleHeadOfHouseHoldChange("street_address_line_2", value)
                  }
                  error={errors.street_address_line_2}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PTextField
                    label="City"
                    value={headOfHouseHoldData.city}
                    onChange={(value) =>
                      handleHeadOfHouseHoldChange("city", value)
                    }
                    error={errors.city}
                  />
                  <StateSelect
                    value={headOfHouseHoldData.state}
                    onChange={(value) =>
                      handleHeadOfHouseHoldChange("state", value)
                    }
                    error={errors.state}
                  />
                  <PTextField
                    label="Zip Code"
                    value={headOfHouseHoldData.zip_code}
                    onChange={(value) =>
                      handleHeadOfHouseHoldChange("zip_code", value)
                    }
                    error={errors.zip_code}
                  />
                </div>
                <PTextField
                  label="Cell Phone"
                  value={headOfHouseHoldData.cell_phone}
                  placeholder="(123)123-1232"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  onChange={(value) => {
                    const sanitizedValue = value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    handleHeadOfHouseHoldChange("cell_phone", sanitizedValue);
                  }}
                  error={errors.cell_phone}
                />
                <PSelect
                  label="Registration Status"
                  options={[
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                    { label: "Draft", value: "draft" },
                    { label: "Blocked", value: "blocked" },
                  ]}
                  onChange={(value) =>
                    handleHeadOfHouseHoldChange("registration_status", value)
                  }
                  value={
                    !!headOfHouseHoldData.registration_status &&
                    headOfHouseHoldData.registration_status !== "false"
                      ? headOfHouseHoldData.registration_status
                      : "false"
                  }
                />
                <div className="space-y-2">
                  <div>
                    <Label className="text-gray-700">Service Model</Label>
                    <p className="text-sm text-gray-500">
                      Check all that apply.
                    </p>
                  </div>
                  <div className="space-y-0">
                    {["Curbside", "Locker", "Store"].map((model) => (
                      <div key={model} className="flex items-center space-x-2">
                        <PCheckbox
                          label={model}
                          checked={headOfHouseHoldData.service_model.includes(
                            model,
                          )}
                          onChange={(checked) =>
                            handleServiceModelChange(model)
                          }
                        />
                      </div>
                    ))}
                    {errors?.service_model && (
                      <div className="text-red-500">
                        {errors?.service_model}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-gray-700">Service Model Block</Label>
                    <p className="text-sm text-gray-500">
                      Check all that apply.
                    </p>
                  </div>
                  <div className="space-y-0">
                    {["Curbside", "Locker", "Store"].map((model) => (
                      <div key={model} className="flex items-center space-x-2">
                        <PCheckbox
                          label={model}
                          checked={headOfHouseHoldData.service_model_block.includes(
                            model,
                          )}
                          onChange={(checked) =>
                            handleServiceModelBlockChange(model)
                          }
                        />
                      </div>
                    ))}
                    {errors?.service_model_block && (
                      <div className="text-red-500">
                        {errors?.service_model_block}
                      </div>
                    )}
                  </div>
                </div>
                <PTextField
                  label="Status Comment"
                  value={headOfHouseHoldData.status_comment}
                  onChange={(value) =>
                    handleHeadOfHouseHoldChange("status_comment", value)
                  }
                  error={errors.status_comment}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <PButton
                variant="primary"
                type="button"
                className="w-full sm:w-auto"
                onClick={saveHeadOfHouseHold}
                loading={isSaving}
                disabled={isSaving}
              >
                Save
              </PButton>
              {formState.id && (
                <PButton
                  variant="destructive"
                  className="ml-2"
                  onClick={() =>
                    submit({ action: "delete" }, { method: "post" })
                  }
                  loading={isSaving && nav.formData?.get("action") === "delete"}
                >
                  Delete
                </PButton>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <MembersTable
              registrationId={data?.id?.split("/").pop()}
              raceEthnicityOptions={data.race_ethnicity_options}
            />
          </TabsContent>

          <TabsContent value="account">
            <AccountForm
              registrationNo={formState?.id?.split("/").pop()}
              firstName={headOfHouseHoldData?.first_name}
              lastName={headOfHouseHoldData?.last_name}
              email={headOfHouseHoldData.email}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}
