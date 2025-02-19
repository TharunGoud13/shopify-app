import { fetchShopifyGraphQL } from "@/lib/api";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Button,
  Card,
  Image,
  Page,
  Scrollable,
  Select,
  Spinner,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import {
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { loader } from "./LoginUser.server";

const options = [
  { label: "User 1", value: "user1" },
  { label: "User 2", value: "user2" },
  { label: "User 3", value: "user3" },
];

const POS = () => {
  const [data, setData] = useState([]);
  const [cart, setCart] = useState<any[]>([]);
  const [selected, setSelected] = useState("user1");
  const [fullScreen, setFullScreen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const { customer } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (!!fullScreen && !searchParams.has("fullscreen")) {
      setSearchParams((prevParams) => {
        return {
          ...prevParams,
          fullscreen: "1",
        };
      });
    }
    if (searchParams.has("fullscreen")) {
      setSearchParams((prevParams) => {
        prevParams.delete("fullscreen");
        return prevParams;
      });
      setFullScreen(false);
    }
  }, [fullScreen, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const query = `{
                products(first: 100) {
                  edges {
                    node {
                    id
                      handle
                      title
                      vendor
                      productType
                      
                      
                      variants(first: 10) {
                        edges {
                          node {
                          id
                            title
                            price{
                            amount
                            currencyCode
                            }
                          }
                        }
                      }
                      
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
              }`;
        const response = await fetchShopifyGraphQL({ query });

        if (response.data) {
          // Map and format product and variant data
          const formattedData = response.data.products.edges.flatMap(
            (product: { node: any }) => {
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
                (variant: {
                  title: any;
                  price: { amount: any; currencyCode: any };
                  compareAtPrice: any;
                  id: any;
                  inventoryQuantity: any;
                }) => ({
                  id: productNode.id,
                  product: productNode.title, // Title of the product
                  images: images, // Product image URL or null
                  status: productNode.status,
                  // inventory: productNode.totalInventory,
                  salesChannels: "N/A", // Placeholder for sales channels
                  markets: "N/A", // Placeholder for markets
                  catalogs: "N/A", // Placeholder for B2B catalogs
                  category: productNode.productType,
                  type: variant.title || "N/A", // Variant title or "N/A"
                  vendor: productNode.vendor,
                  price: variant?.price?.amount || "N/A", // Variant price or "N/A"
                  // compareAtPrice: variant.compareAtPrice || "N/A",
                  variantId: variant.id, // Variant ID
                  // variantInventory: variant.inventoryQuantity, // Variant compareAtPrice or "N/A"
                }),
              );
            },
          );

          setData(formattedData); // Set the formatted data to state
        } else {
          console.log(response.errors);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchProducts();
  }, []);

  const addToCart = (product: any) => {
    setCart((prevCart) => {
      // Check if the product is already in the cart
      const existingProduct = prevCart.find((item) => item.id === product.id);

      if (existingProduct) {
        // If product already exists, increment the quantity
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        // If product does not exist, add new product to the cart
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateProducts = (productId: string | number, newQuantity: number) => {
    if (newQuantity === 0) {
      handleRemoveProduct(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item,
        ),
      );
    }
  };

  const handleRemoveProduct = (productId: any) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const calculateTotal = () => {
    return (
      cart?.length > 0 &&
      cart.reduce((total, item) => {
        // Convert string price to number and add it to the total
        return total + parseFloat(item.price);
      }, 0)
    );
  };

  const placeOrder = async () => {
    const orderInput: any = {
      lineItems: cart.map((item) => ({
        variantId: item.variantId, // Use item ID from cart
        quantity: item.quantity, // Quantity of the product
      })),
      financialStatus: "PENDING",
      customerId: customer?.id,
      note: `Order placed by ${customer.firstName} ${customer.lastName}`,
      email: customer.email, // Include customer's email
      tags: ["POS_ORDER"], // Adjust the financial status if needed
    };

    // if (selected !== "") {
    //   console.log("Selected Customer:", selected);
    //   orderInput["customerId"] = selected;
    // }

    console.log("Order Input:", JSON.stringify(orderInput, null, 2));

    try {
      const response = await fetch("/place-pos-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Customer-Access-Token": "e283e160a62e6f907bd8ab00126b126a",
        },
        body: JSON.stringify({ orderInput }), // Send the order input to the API
      });

      const result = await response.json();

      if (response.status !== 200 || result.error) {
        console.error("Error placing order:", result.error);
        alert(`Error: ${result.error[0]?.message || "Failed to place order"}`);
        return;
      }

      setCart([]);
      alert("Order placed successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while placing the order.");
    }
  };

  return (
    <Page title="Ordering" fullWidth>
      <div className="md:flex gap-5">
        <div className="flex flex-col md:w-[70%] ">
          <div>
            <Card>
              <h1 className="text-xl">Welcome</h1>
              <div className="flex w-full items-center  gap-2.5">
                <div className="w-full">
                  <TextField
                    label
                    prefix={<SearchIcon className="h-5 w-5" />}
                    autoComplete="off"
                    placeholder="Search Products"
                    value={searchQuery}
                    onChange={(value) =>
                      setSearchQuery(value?.toLowerCase() || "")
                    }
                  />
                </div>
                {fullScreen ? (
                  <Button
                    size="large"
                    onClick={() => setFullScreen(!fullScreen)}
                    icon={MinimizeIcon}
                  />
                ) : (
                  <Button
                    size="large"
                    onClick={() => setFullScreen(!fullScreen)}
                    icon={MaximizeIcon}
                  />
                )}
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            {!(data.length > 0) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <Spinner accessibilityLabel="Loading orders" size="large" />
              </div>
            )}
            {data
              .filter((item: any) =>
                item.product.toLowerCase().includes(searchQuery),
              )
              .map((item: any, index: number) => (
                <div key={index} className="m-3">
                  <Card>
                    <div className="flex flex-col relative h-[350px]">
                      {item.images ? (
                        <Image alt="Products" source={item.images} />
                      ) : (
                        <Image
                          alt="Products"
                          source="https://static.vecteezy.com/system/resources/thumbnails/022/059/000/small_2x/no-image-available-icon-vector.jpg"
                        />
                      )}
                      <div className="flex flex-col justify-between h-full">
                        <div className="flex-grow"></div>{" "}
                        {/* Empty space to push content to the bottom */}
                        <div>
                          <h2 className="text-xl font-bold">{item.product}</h2>
                          <h3 className="text-xl">{item.price}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="absolute right-2 bottom-2">
                      <Button icon={PlusIcon} onClick={() => addToCart(item)} />
                    </div>
                  </Card>
                </div>
              ))}
          </div>
        </div>
        <div className="md:w-[30%] h-full ">
          <Card>
            <Select
              label="Select Customer"
              options={options}
              onChange={(value) => setSelected(value)}
              value={selected}
            />
            <Scrollable className="h-[300px]" scrollbarWidth="thin">
              <div>
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col my-2 space-y-2 gap-2.5"
                  >
                    <div className="flex gap-2.5 relative">
                      <Thumbnail alt="Product Image" source={item.images} />
                      <div className="flex ml-4 flex-col  gap-1">
                        <span>{item.product}</span>
                        <span>{item.price}</span>
                        <div className="flex gap-2.5 items-center">
                          <MinusIcon
                            onClick={() =>
                              updateProducts(item.id, item.quantity - 1)
                            }
                            className="h-5 w-5 cursor-pointer"
                          />
                          {item.quantity}
                          <PlusIcon
                            onClick={() =>
                              updateProducts(item.id, item.quantity + 1)
                            }
                            className="w-5 h-5 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <XIcon
                          onClick={() => handleRemoveProduct(item.id)}
                          className="absolute text-red-500 top-2 right-2 cursor-pointer h-5 w-5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Scrollable>
            <div className="p-2.5 border-t-2">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span>${calculateTotal()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total</span>
                <span>${calculateTotal()}</span>
              </div>
            </div>
            <Button fullWidth onClick={placeOrder}>
              Place Order
            </Button>
          </Card>
        </div>
      </div>
    </Page>
  );
};

export default POS;
