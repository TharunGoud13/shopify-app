import { useNavigate } from "@remix-run/react";
import { Button, Page } from "@shopify/polaris";
import MetaTable from "../../components/MetaTable";
import { useEffect, useState } from "react";

const Products = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/get-pos-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `{
              products(first: 100) {
                edges {
                  node {
                  id
                    handle
                    title
                    vendor
                    productType
                    
                    status
                    variants(first: 10) {
                      edges {
                        node {
                          title
                          price
                          compareAtPrice
                        }
                      }
                    }
                    totalInventory
                    images(first:10) {
                        edges {
                          node {
                            src
                            url
                          }
                        }
                      }
                  }
                }
              }
            }`,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          // Map and format product and variant data
          const formattedData = result.data.products.edges.flatMap(
            (product: { node: any }, productIndex: number) => {
              const productNode = product.node;

              const images = productNode.images.edges.length
                ? productNode.images.edges[0].node.src
                : null;

              // Extract all variants for the product
              const variants = productNode.variants.edges.map(
                (variant: { node: any }) => variant.node,
              );

              // Map over each variant and extract necessary details
              return variants.map(
                (
                  variant: { title: any; price: any; compareAtPrice: any },
                  index: number,
                ) => ({
                  productIndex: productIndex,
                  product: productNode.title, // Title of the product
                  images: images, // Product image URL or null
                  status: productNode.status,
                  inventory: productNode.totalInventory,
                  salesChannels: "N/A", // Placeholder for sales channels
                  markets: "N/A", // Placeholder for markets
                  catalogs: "N/A", // Placeholder for B2B catalogs
                  category: productNode.productType,
                  type: variant.title || "N/A", // Variant title or "N/A"
                  vendor: productNode.vendor,
                  price: variant.price || "N/A", // Variant price or "N/A"
                  compareAtPrice: variant.compareAtPrice || "N/A", // Variant compareAtPrice or "N/A"
                }),
              );
            },
          );

          setData(formattedData); // Set the formatted data to state
        } else {
          console.log(result.error);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchProducts();
  }, []);

  console.log("data-----....", data.slice(1));

  const headings = [
    { title: "Product" },
    { title: "Status" },
    { title: "Inventory" },
    { title: "Sales Channels" },
    { title: "Markets" },
    { title: "B2B Catalogs" },
    { title: "Category" },
    { title: "Type" },
    { title: "Vendor" },
  ];
  return (
    <div>
      <Page
        title="Products"
        fullWidth
        primaryAction={
          <Button
            variant="primary"
            onClick={() => navigate("/app/fresh-pageid/new")}
          >
            Add Products
          </Button>
        }
      >
        <MetaTable headings={headings} orders={data.slice(1)} />
      </Page>
    </div>
  );
};

export default Products;
