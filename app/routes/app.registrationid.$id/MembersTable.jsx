// MembersTable.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Pencil } from "lucide-react";
import {
  Button as PButton,
  Checkbox as PCheckbox,
  IndexTable,
  TextField as PTextField,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { fetchGraphQL } from "../../lib/graphql";
import { useAppBridge } from "@shopify/app-bridge-react";

const defaultMember = {
  id: "",
  firstName: "",
  lastName: "",
  ethnicities: [],
  dateOfBirth: "",
};

const MembersTable = ({ registrationId, raceEthnicityOptions }) => {
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState(defaultMember);
  const [editingMember, setEditingMember] = useState(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [version, setVersion] = useState(0);
  const shopify = useAppBridge();

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const fetchMembers = useCallback(async () => {
    if (!registrationId) {
      shopify.toast.show(`There no registrationId`, {
        isError: true,
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = `
             query Metaobjects($query: String, $type: String!) {
                metaobjects(query: $query, type: $type, first: 250) {
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
              }
            `;
      const variables = {
        query: `display_name:${registrationId}`,
        type: "house_hold_member",
      };

      const data = await fetchGraphQL(query, variables, true);

      if (data?.metaobjects?.edges) {
        const fetchedMembers = data.metaobjects.edges.map((edge) => {
          return edge.node.fields.reduce(
            (acc, field) => {
              if (field.key === "race_ethnicity") {
                acc[field.key] = field.jsonValue
                  ? field.jsonValue
                  : [];
              } else {
                acc[field.key] = field.jsonValue;
              }

              return acc;
            },
            { id: edge.node.id },
          );
        });

        setMembers(fetchedMembers);
      } else {
        setMembers([]);
      }
    } catch (e) {
      console.error("Failed to fetch members", e);
      setError("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [registrationId, version]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateNewMember = (field, value) => {
    if (field === "ethnicities") {
      const ethnicities = newMember?.ethnicities || [];
      if (ethnicities?.includes(value)) {
        setNewMember({
          ...newMember,
          ethnicities: ethnicities.filter((e) => e !== value),
        });
      } else {
        setNewMember({ ...newMember, ethnicities: [...ethnicities, value] });
      }
    } else {
      setNewMember({ ...newMember, [field]: value });
    }
  };

  const updateEditingMember = (field, value) => {
    if (editingMember) {
      if (field === "race_ethnicity") {
        const race_ethnicity = editingMember.race_ethnicity || [];
        if (race_ethnicity?.includes(value)) {
          setEditingMember({
            ...editingMember,
            race_ethnicity: race_ethnicity.filter((e) => e !== value),
          });
        } else {
          setEditingMember({
            ...editingMember,
            race_ethnicity: [...race_ethnicity, value],
          });
        }
      } else {
        setEditingMember({ ...editingMember, [field]: value });
      }
    }
  };

  const addMember = async () => {
    if (!registrationId) {
      shopify.toast.show(`There no registrationId`, {
        isError: true,
      });
      return;
    }

    setErrors({});

    if (!newMember.firstName) {
      shopify.toast.show(`firstName is required`, {
        isError: true,
      });

      setErrors((prev) => ({ ...prev, firstName: "firstName is required" }));
      return;
    }

    if (!newMember.lastName) {
      shopify.toast.show(`lastName is required`, {
        isError: true,
      });
      setErrors((prev) => ({ ...prev, lastName: "lastName is required" }));
      return;
    }

    if (newMember.ethnicities?.length < 1) {
      shopify.toast.show(`Race/Ethnicity is required`, {
        isError: true,
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchGraphQL(
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
                    }
                    `,
        {
          metaobject: {
            type: "house_hold_member",
            fields: Object.entries({
              registration_no: registrationId,
              first_name: newMember.firstName,
              last_name: newMember.lastName,
              race_ethnicity: JSON.stringify(newMember.ethnicities),
              date_of_birth: newMember.dateOfBirth || "",
              house_hold_no: "1", //TODO: need to update later
            }).map(([key, value]) => ({
              key,
              value: typeof value === "boolean" ? String(value) : value,
            })),
          },
        },
        true,
      );
      const jsonResponse = await response;
      const { userErrors } = jsonResponse.metaobjectCreate;

      if (userErrors && userErrors.length) {
        setError(userErrors.map((err) => `${err.field}: ${err.message}`));
        return;
      }

      setVersion((prev) => prev + 1);
      fetchMembers();

      setNewMember(defaultMember);
      setIsAddMemberDialogOpen(false);
      await delay(4000);
      fetchMembers();
    } catch (e) {
      console.error("Failed to add member", e);
      setError("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (member) => {
    setEditingMember(member);
  };

  const updateMember = async () => {
    if (!editingMember?.id) return;

    setErrors({});

    if (!editingMember.first_name) {
      shopify.toast.show(`firstName is required`, {
        isError: true,
      });

      setErrors((prev) => ({ ...prev, first_name: "firstName is required" }));
      return;
    }

    if (!editingMember.last_name) {
      shopify.toast.show(`lastName is required`, {
        isError: true,
      });
      setErrors((prev) => ({ ...prev, last_name: "lastName is required" }));
      return;
    }

    if (editingMember.race_ethnicity?.length < 1) {
      shopify.toast.show(`Race/Ethnicity is required`, {
        isError: true,
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchGraphQL(
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
                  }
                 `,
        {
          id: editingMember.id,
          metaobject: {
            fields: Object.entries({
              first_name: editingMember.first_name,
              last_name: editingMember.last_name,
              race_ethnicity: editingMember.race_ethnicity
                ? JSON.stringify(editingMember.race_ethnicity)
                : "",
              date_of_birth: editingMember.date_of_birth || "",
            }).map(([key, value]) => ({
              key,
              value: typeof value === "boolean" ? String(value) : value,
            })),
          },
        },
        true,
      );

      const jsonResponse = await response;

      const { userErrors } = jsonResponse.metaobjectUpdate;
      if (userErrors && userErrors.length) {
        setError(userErrors.map((err) => `${err.field}: ${err.message}`));
        return;
      }

      fetchMembers();
      setEditingMember(null);
    } catch (e) {
      console.error("Failed to update member", e);
      setError("Failed to update member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="text-red-500">{error}</div>}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Household Members</h2>
        <Dialog
          open={isAddMemberDialogOpen}
          onOpenChange={(v) => {
            setIsAddMemberDialogOpen(v);
            setError(null);
          }}
        >
          <DialogTrigger asChild>
            <PButton variant="primary" icon={PlusIcon} disabled={loading}>
              Add Member
            </PButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Household Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PTextField
                    label="First name"
                    value={newMember.firstName}
                    onChange={(value) => updateNewMember("firstName", value)}
                    error={errors?.firstName}
                  />
                </div>
                <div className="space-y-2">
                  <PTextField
                    label="Last name"
                    value={newMember.lastName}
                    onChange={(value) => updateNewMember("lastName", value)}
                    error={errors?.lastName}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Race/Ethnicity</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Check all that apply.
                  </p>
                </div>
                <div className="space-y-0">
                  {(raceEthnicityOptions || []).map(
                    ({ race_ethnicity: ethnicity }) => (
                      <div
                        key={ethnicity}
                        className="flex aitems-center space-x-2"
                      >
                        <PCheckbox
                          label={ethnicity}
                          checked={(newMember?.ethnicities || []).includes(
                            ethnicity,
                          )}
                          onChange={(checked) => {
                            updateNewMember("ethnicities", ethnicity);
                          }}
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-dob" className="text-gray-700">
                  Date of Birth<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-dob"
                  type="date"
                  placeholder="dd/mm/yyyy"
                  value={newMember.dateOfBirth}
                  onChange={(e) =>
                    updateNewMember("dateOfBirth", e.target.value)
                  }
                  className="w-full md:w-[300px]"
                />
              </div>
              <div className="flex justify-end mt-6">
                <PButton
                  variant="primary"
                  onClick={addMember}
                  className="w-full sm:w-auto"
                  loading={loading}
                  disabled={loading}
                >
                  Add Member
                </PButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Member List */}
      <IndexTable
        resourceName={{
          singular: "Household Member",
          plural: "Household Members",
        }}
        itemCount={members.length}
        headings={[
          { title: "First Name" },
          { title: "Last Name" },
          { title: "Race/Ethnicity" },
          { title: "Date of Birth" },
          { title: "Actions" },
        ]}
        selectable={false}
      >
        {(members || []).map((member) => (
          <IndexTable.Row id={member.id} key={member.id}>
            <IndexTable.Cell>{member.first_name}</IndexTable.Cell>
            <IndexTable.Cell>{member.last_name}</IndexTable.Cell>
            <IndexTable.Cell>
              {member.race_ethnicity?.join(", ")}
            </IndexTable.Cell>
            <IndexTable.Cell>{member.date_of_birth}</IndexTable.Cell>
            <IndexTable.Cell>
              <Dialog
                open={editingMember}
                onOpenChange={(v) => {
                  setError(null);
                  if (!v) setEditingMember(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(member)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Household Member</DialogTitle>
                  </DialogHeader>
                  {error && <div className="text-red-500">{error}</div>}
                  {editingMember && (
                    <div className="space-y-6">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <PTextField
                              label="First name"
                              value={editingMember.first_name}
                              onChange={(value) =>
                                updateEditingMember("first_name", value)
                              }
                              error={errors?.first_name}
                            />
                          </div>
                          <div className="space-y-2">
                            <PTextField
                              label="Last name"
                              value={editingMember.last_name}
                              onChange={(value) =>
                                updateEditingMember("last_name", value)
                              }
                              error={errors?.last_name}
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-gray-700">
                              Race/Ethnicity
                              <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-sm text-gray-500 mt-1">
                              Check all that apply.
                            </p>
                          </div>
                          <div className="space-y-3">
                            {(raceEthnicityOptions || []).map(
                              ({ race_ethnicity: ethnicity }) => (
                                <div
                                  key={ethnicity}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`edit-ethnicity-${ethnicity}`}
                                    checked={(
                                      editingMember?.race_ethnicity || []
                                    )?.includes(ethnicity)}
                                    onCheckedChange={(checked) =>
                                      updateEditingMember(
                                        "race_ethnicity",
                                        ethnicity,
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`edit-ethnicity-${ethnicity}`}
                                    className="text-gray-700"
                                  >
                                    {ethnicity}
                                  </Label>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-dob" className="text-gray-700">
                            Date of Birth<span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="edit-dob"
                            type="date"
                            placeholder="dd/mm/yyyy"
                            value={editingMember.date_of_birth}
                            onChange={(e) =>
                              updateEditingMember(
                                "date_of_birth",
                                e.target.value,
                              )
                            }
                            className="w-full md:w-[300px]"
                          />
                        </div>
                        <div className="flex justify-end mt-6">
                          <PButton
                            type="button"
                            variant="primary"
                            onClick={updateMember}
                            className="w-full sm:w-auto"
                            loading={loading}
                            disabled={loading}
                          >
                            Update
                          </PButton>
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
    </div>
  );
};

export default MembersTable;
