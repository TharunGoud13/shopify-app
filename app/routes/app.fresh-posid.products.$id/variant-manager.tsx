import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button as PButton } from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";

export interface Option {
  name: string;
  values: string[];
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface Variant {
  id: string;
  title: string;
  price: any;
  barcode: string;
  selectedOptions: SelectedOption[];
  isNew?: boolean;
}

export interface ProductData {
  variants: {
    edges: Array<{
      node: Variant;
    }>;
  };
  options: Option[];
}

export default function VariantManager({
  initialData,
  initialVariants,
  variants,
  setVariants,
  options,
  setOptions,
}: {
  initialData: ProductData;
  initialVariants: Variant[];
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
  options: Option[];
  setOptions: React.Dispatch<React.SetStateAction<Option[]>>;
}) {
  const optionValueInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const generateVariants = (options: Option[]) => {
    if (options.length === 0) return [];

    const generateCombinations = (
      optionIndex: number,
      currentCombo: SelectedOption[],
    ): Variant[] => {
      if (optionIndex === options.length) {
        const title = currentCombo.map((opt) => opt.value).join(" / ");
        const existinginitialVariants = initialVariants.find(
          (v) => v.title === title,
        );
        const existingVariant = variants.find((v) => v.title === title);

        return [
          {
            id:
              existingVariant?.id ||
              existinginitialVariants?.id ||
              `new-${title}`,
            title,
            price:
              existingVariant?.price ||
              existinginitialVariants?.price ||
              "0.00",
            barcode:
              existingVariant?.barcode ||
              existinginitialVariants?.barcode ||
              "",
            selectedOptions: currentCombo,
            isNew: !existinginitialVariants,
          },
        ];
      }

      const currentOption = options[optionIndex];
      return currentOption.values.flatMap((value) =>
        generateCombinations(optionIndex + 1, [
          ...currentCombo,
          { name: currentOption.name, value },
        ]),
      );
    };

    const data = generateCombinations(0, []);
    setVariants(data);
  };

  const addOption = () => {
    const newOption = {
      name: `Option ${options.length + 1}`,
      values: [],
    };
    setOptions((prevOptions) => [...prevOptions, newOption]);
  };

  const updateOptionName = (optionIndex: number, newName: string) => {
    const updatedOptions = [...options];
    updatedOptions[optionIndex].name = newName;
    setOptions(updatedOptions);
  };

  const removeOption = (optionIndex: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(optionIndex, 1);
    setOptions(updatedOptions);
  };

  const addOptionValue = (optionIndex: number, value: string) => {
    const newOptions = [...options];
    const option = newOptions[optionIndex];

    if (!option.values.includes(value)) {
      const updatedValues = [...option.values, value];
      newOptions[optionIndex] = { ...option, values: updatedValues };
      setOptions(newOptions);

      // Clear the input after adding
      if (optionValueInputRefs.current[optionIndex]) {
        optionValueInputRefs.current[optionIndex]!.value = "";
      }
    }
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values.splice(valueIndex, 1);
    setOptions(newOptions);
  };

  const updateVariant = (
    variant: any,
    field: "price" | "barcode",
    value: string,
  ) => {
    setVariants((prevVariants) => {
      const variantIndex = variants.findIndex((v) => v.id === variant.id);
      if (variantIndex !== -1) {
        const updatedVariants = [...prevVariants];
        updatedVariants[variantIndex] = {
          ...prevVariants[variantIndex],
          [field]: value,
        };
        return updatedVariants;
      } else {
        return [...prevVariants, { ...variant, [field]: value }];
      }
    });
  };

  useEffect(() => {
    generateVariants(options);
  }, [options]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      {/*  <pre className="my-4 mx-4">{JSON.stringify(variants, null, 2)}</pre> */}
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Variants</span>
          <PButton
            icon={PlusIcon}
            onClick={() => {
              addOption();
            }}
            variant="primary"
          >
            Add Variant
          </PButton>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {options.map((option, optionIndex) => (
          <Collapsible key={optionIndex} className="border rounded-lg p-4">
            <CollapsibleTrigger className="flex items-center gap-2 w-full">
              <GripVertical className="h-4 w-4" />
              <Input
                value={option.name}
                onChange={(e) => {
                  e.preventDefault();
                  updateOptionName(optionIndex, e.currentTarget.value);
                }}
                className="w-[200px]"
                placeholder="Option name"
              />
              <ChevronDown className="h-4 w-4 ml-auto" />
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeOption(optionIndex);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="space-y-2">
                {option.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center gap-2">
                    <Input value={value} readOnly />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOptionValue(optionIndex, valueIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    ref={(el) => {
                      optionValueInputRefs.current[optionIndex] = el;
                    }}
                    placeholder="Add another value"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const value = (
                          e.currentTarget as HTMLInputElement
                        ).value.trim();
                        if (value) {
                          addOptionValue(optionIndex, value);
                          e.preventDefault();
                        }
                      }
                      return;
                      // e.preventDefault();
                    }}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* <div className="my-6 mx-4 hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>{variant.title}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={variant.price}
                      className="w-[100px]"
                      step="0.01"
                      min="0"
                      onChange={(e) =>
                        updateVariant(variant, "price", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={variant.barcode}
                      className="w-[150px]"
                      onChange={(e) =>
                        updateVariant(variant, "barcode", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>{variant.isNew && <Badge>New</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div> */}
      </CardContent>
    </Card>
  );
}
