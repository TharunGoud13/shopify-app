import { fetchGraphQL } from "../lib/graphql";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  IndexTable,
  TextField,
  useBreakpoints,
  useIndexResourceState,
  Text,
  Scrollable,
  Thumbnail,
} from "@shopify/polaris";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { SearchIcon } from "@shopify/polaris-icons";

const productFieldQuery = `
  id
  title
  images(first:1){
    edges{
      node{
        originalSrc
      }
    }
  }
  featuredImage {
    id
    url
    transformedSrc: url(transform: {maxHeight: 200, maxWidth: 200})
  }
  totalInventory  
  variants(first: 250) {
    edges {
      node {
        id
        displayName
        title
        inventoryQuantity
        image {
          url
          transformedSrc: url(transform: {maxWidth: 100, maxHeight: 100})
        }
        product{
          images(first:1){
            edges{
              node{
                originalSrc
              }
            }
          }
          title
        }
      }
    }
  }
`;

export default function ProductPickerSearch({
  label,
  title,
  onSelect,
  singleSelection = false,
}: any) {
  const shopify = useAppBridge();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(results as unknown as { [key: string]: unknown }[]);

  const updateResults = useCallback(async () => {
    setLoading(true);
    const gqlQuery = `
      query {
        products(first: 250,query:"${query || ""}") {
          edges {
            node {
              ${productFieldQuery}
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(gqlQuery);
    const fetchedProducts = data.products.edges.map(
      (edge: { node: any }) => edge.node,
    );
    setResults(fetchedProducts || []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    clearSelection();
    updateResults();
  }, [query]);

  const rowMarkup = results.map(
    (
      res: {
        featuredImage: any;
        id: string;
        variants: any;
        title: string;
      },
      index,
    ) => {
      let selected: any = false;
      let defaultVariant: any = false;
      let disabled: any = false;

      const someVariantsSelected = (res?.variants?.edges || []).some(
        ({ node: variant }: any) => selectedResources.includes(variant?.id),
      );

      const allVariantsSelected = (res?.variants?.edges || []).every(
        ({ node: variant }: any) => selectedResources.includes(variant?.id),
      );

      if (allVariantsSelected) {
        selected = true;
      } else if (someVariantsSelected) {
        selected = "indeterminate";
      }

      if (
        (res?.variants?.edges || []).length === 1 &&
        res?.variants?.edges?.[0]?.node?.title.includes("Default Title")
      ) {
        defaultVariant = res?.variants?.edges?.[0]?.node;
      }

      if (singleSelection && selectedResources.length > 0) {
        if (!someVariantsSelected) {
          disabled = true;
        }
      }

      return (
        <Fragment key={res.id}>
          <IndexTable.Row
            rowType="data"
            id={res.id}
            position={index}
            selected={selected}
            accessibilityLabel={`Select all variants`}
            disabled={disabled}
          >
            <IndexTable.Cell scope="col" id={res.id}>
              <div className="flex items-center space-x-2">
                <Thumbnail
                  source={res?.featuredImage?.transformedSrc}
                  alt={"product"}
                  size="small"
                />
                <span>{res.title}</span>
              </div>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {defaultVariant && (
                <Text as="span" alignment="center" numeric>
                  {defaultVariant?.inventoryQuantity} available
                </Text>
              )}
            </IndexTable.Cell>
          </IndexTable.Row>
          {!defaultVariant &&
            (res?.variants?.edges || []).map((variant: any, rowIndex: any) => (
              <IndexTable.Row
                rowType="child"
                key={rowIndex}
                id={variant?.node?.id}
                position={rowIndex}
                selected={selectedResources.includes(variant?.node?.id)}
                disabled={disabled}
              >
                <IndexTable.Cell
                  scope="row"
                  // headers={`${columnHeadings[0].id} ${productId}`}
                >
                  <Text as="span" alignment="start" numeric>
                    {variant?.node?.title}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="center" numeric>
                    {variant?.node?.inventoryQuantity} available
                  </Text>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
        </Fragment>
      );
    },
  );

  const handleSelection = (
    selectionType: any,
    toggleType: any,
    id?: any,
    position?: number,
  ) => {
    if (id) {
      if (typeof id === "string" && selectionType === "single") {
        if (id.includes("gid://shopify/Product/")) {
          const productId = id;
          const relatedVariants: any = results.find(
            (prod: any) => prod.id === productId,
          );
          if (relatedVariants)
            (relatedVariants?.variants?.edges || [])?.forEach(
              ({ node: variant }: any) => {
                handleSelectionChange(selectionType, toggleType, variant?.id);
              },
            );

          // handleSelectionChange(selectionType, toggleType, id);
        } else if (id.includes("gid://shopify/ProductVariant/")) {
          handleSelectionChange(selectionType, toggleType, id);
        }
      } else {
        try {
          id.forEach((i: any) => {
            console.log("id", i);
            handleSelectionChange(selectionType, toggleType, i);
          });
        } catch (error) {
          handleSelectionChange(selectionType, toggleType, id);
        }
      }
    } else {
      if (selectionType === "page") {
        if (toggleType) {
          // results.forEach((result) => {
          //   console.log("result?.id", result?.id);
          //   handleSelection("single", true, result?.id);
          // });
          clearSelection();
        } else {
          clearSelection();
        }
      }
    }
  };

  return (
    <>
      <Button
        onClick={() => shopify.modal.show("product-picker-search")}
        fullWidth
      >
        {label}
      </Button>
      <Modal id="product-picker-search" open={open} onShow={()=>setOpen(true)} onHide={()=>setOpen(false)}>
        <div className="w-full flex justify-center flex-col overflow-hidden">
          <div className="w-full p-2">
            <TextField
              label={""}
              value={query}
              onChange={setQuery}
              placeholder="Search..."
              autoComplete="off"
              prefix={<SearchIcon className="w-5 h-5 text-gray-400" />}
            />
          </div>
          <Scrollable style={{ height: "320px" }}>
            <IndexTable
              condensed={useBreakpoints().smDown}
              onSelectionChange={handleSelection}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              resourceName={{
                singular: "product",
                plural: "products",
              }}
              itemCount={results.length}
              headings={[
                { title: "Name", id: "column-header--name" },
                {
                  hidden: false,
                  id: "column-header--inventory",
                  title: "Inventory",
                },
              ]}
              loading={loading}
            >
              {rowMarkup}
            </IndexTable>
          </Scrollable>
        </div>
        <TitleBar title={title}>
          <button
            variant="primary"
            disabled={selectedResources?.length === 0}
            onClick={() => {
              // Collect selected products & variants
              const selectedProducts = results
                .filter((p: any) => {
                  return (p?.variants?.edges || []).some(
                    ({ node: variant }: any) =>
                      selectedResources.includes(variant?.id),
                  );
                })
                .map((p: any) => ({
                  ...p,
                  variants: (p.variants.edges || [])
                    .filter((v: any) => selectedResources.includes(v.node.id))
                    .map((v: any) => ({ ...v.node })),
                }));

              console.log("selectedProduct", selectedProducts);
              if (onSelect) onSelect(selectedProducts);
              setOpen(false);

              clearSelection();
              setQuery("");
            }}
          >
            Select
          </button>
          <button onClick={() => setOpen(false)}>Cancel</button>
        </TitleBar>
      </Modal>
    </>
  );
}
