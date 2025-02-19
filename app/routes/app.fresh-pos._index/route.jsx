import { useEffect, useState, useMemo, useCallback } from "react";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useSearchParams,
  useNavigate,
  useLoaderData,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  InlineGrid,
  FormLayout,
  TextField,
  Scrollable,
  Thumbnail,
  Icon,
  Image,
  Autocomplete,
  DataTable,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import {
  PlusIcon,
  MinusIcon,
  XIcon,
  MaximizeIcon,
  MinimizeIcon,
  SearchIcon,
  CartIcon,
} from "@shopify/polaris-icons";
import { Menu, Bell, LogOut, Plus } from "lucide-react";
import { fetchGraphQL } from "../../lib/graphql";
import CustomerPickerSearch from "../../components/CustomerPickerSearch";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const productTypesResponse = await fetchGraphQL(
    `{
      metaobjects(type: "custom_product_type", first: 250) {
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
    {},
    false,
    admin,
  );

  const storePosSettingsResponse = await fetchGraphQL(
    `{
      metaobjects(type: "store_pos_settings", first: 250) {
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
    {},
    false,
    admin,
  );

  return json({
    productTypes: productTypesResponse.metaobjects.edges
      .map((edge) => {
        const fields = edge.node.fields.reduce((acc, field) => {
          acc[field.key] = field.jsonValue;
          return acc;
        }, {});
        return {
          id: edge.node.id,
          handle: edge.node.handle,
          ...fields,
        };
      })
      .sort((a, b) => {
        const orderA = a?.display_order ?? Infinity;
        const orderB = b?.display_order ?? Infinity;
        return orderA - orderB;
      }),
    storePosSettings: storePosSettingsResponse.metaobjects.edges.reduce(
      (acc, edge) => {
        const fields = edge.node.fields.reduce((obj, field) => {
          obj[field.key] = field.jsonValue;
          return obj;
        }, {});

        // Merge the new key-value pair into the accumulator object
        acc[fields.title] = fields.value;

        return acc;
      },
      {},
    ),
  });
};

export const action = async ({ request }) => {
  return json({});
};

const productFieldQuery = `
                id
                title
                description
                descriptionHtml
                featuredImage {
                  id
                  url
                }
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                totalInventory
                variants(first: 250) {
                  edges {
                    node {
                      id
                      displayName
                      price
                      inventoryQuantity
                      image {
                        url
                      }
                    }
                  }
                }
                per_order_limit:metafield(key: "per_order_limit", namespace: "custom") {
                  value
                }
                order_points:metafield(key: "order_points", namespace: "custom") {
                  value
                }
                productType
      `;

function formatPrice(price, currencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(price);
}

export default function Index() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchProducts, setSearchProducts] = useState("");
  const [activeProductType, setActiveProductType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCustomerData, setSelectedCustomerData] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerinputValue, setCustomerInputValue] = useState("");
  const [Customers, setCustomers] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [weight, setWeight] = useState(0.0);

  const shopify = useAppBridge();
  const navigate = useNavigate();
  const loaderData = useLoaderData();

  const fetchProducts = async () => {
    setLoading(true);
    const query = `
      query {
        products(first: 250) {
          edges {
            node {
              ${productFieldQuery}
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    const fetchedProducts = data.products.edges.map((edge) => edge.node);
    setProducts(fetchedProducts);
    setLoading(false);
  };

  const fetchProductsByType = async (productType) => {
    setLoading(true);
    setProducts([]);
    const query = `
      query ($productType: String) {
        products(first: 250, query: $productType) {
          edges {
            node {
              ${productFieldQuery}
            }
          }
        }
      }
    `;
    const variables = {
      productType: `product_type:${productType}`,
    };
    const data = await fetchGraphQL(query, variables);
    const fetchedProducts = data.products.edges.map((edge) => edge.node);
    setProducts(fetchedProducts);
    setLoading(false);
  };

  const fetchCustomers = async (value = "") => {
    setCustomerLoading(true);
    const gqlQuery = `
      query {
        customers(first: 250,query:"${value}") {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              addresses {
                zip
              }
              registration_no: metafield(key: "registration_no", namespace: "registration") {
                value
              }
              service_model_block_status: metafield(key: "service_model_block_status", namespace: "registration") {
                value
              }
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(gqlQuery);
    const customers = data.customers.edges.map(({ node }) => ({
      ...node,
      value: node.id,
      label: `${node.firstName} ${node.lastName} ${node.phone ? "(" + node.phone + ")" : ""}`,
    }));
    setCustomerLoading(false);
    setCustomers(customers);
  };

  const placeOrder = async () => {
    setLoadingCheckout(true);
    const totalOrderPoints = cart.reduce((sum, item) => {
      const orderPoints = item.order_points?.value
        ? Number(item.order_points.value)
        : 0;
      return sum + orderPoints * item.quantity;
    }, 0);

    const orderInput = {
      lineItems: cart.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      financialStatus: "PENDING",
    };

    if (selectedCustomers.length > 0) {
      const customerId = selectedCustomers[0];
      orderInput["customerId"] = customerId;

      try {
        const customerQuery = `
        query {
          customer(id: "${customerId}") {
            metafield(namespace: "custom", key: "order_points") {
              value
            }
          }
        }
      `;

        const customerData = await fetchGraphQL(customerQuery);
        const existingOrderPoints = customerData?.customer?.metafield?.value
          ? Number(customerData.customer.metafield.value)
          : 0;

        const updatedOrderPoints = existingOrderPoints + totalOrderPoints;

        const metafieldMutation = `
        mutation UpdateCustomerMetafield($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

        const metafieldInput = {
          id: customerId,
          metafields: [
            {
              namespace: "custom",
              key: "order_points",
              type: "number_integer",
              value: updatedOrderPoints.toString(),
            },
          ],
        };

        const metafieldResponse = await fetchGraphQL(metafieldMutation, {
          input: metafieldInput,
        });
        if (metafieldResponse.customerUpdate?.userErrors.length) {
          const errorMessage =
            metafieldResponse.customerUpdate.userErrors[0].message;
          shopify.toast.show(`Error updating order points: ${errorMessage}`, {
            isError: true,
          });
          console.error(`Metafield update error: ${errorMessage}`);
          return;
        }
      } catch (error) {
        shopify.toast.show(
          "Unable to continue. Failed to update customer order points.",
          { isError: true },
        );
        console.error("Metafield update failed:", error);
        return;
      }
    }

    const query = `
      mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
        orderCreate(order: $order, options: $options) {
          userErrors {
            field
            message
          }
          order {
            id
            displayFinancialStatus
            customer {
              id
            }
          }
        }
      }
    `;

    const data = await fetchGraphQL(query, { order: orderInput });

    setLoadingCheckout(false);
    if (data.orderCreate?.userErrors.length) {
      shopify.toast.show(`Error: ${data.orderCreate.userErrors[0].message}`, {
        isError: true,
      });
      return;
    }

    setCart([]);

    shopify.toast.show(`Order placed successfully`);
  };

  const addToCart = (product, variant) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.variantId === variant.id,
      );
      const perOrderLimit = product.per_order_limit?.value
        ? Number(product.per_order_limit.value)
        : null;

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        if (perOrderLimit !== null && newQuantity > perOrderLimit) {
          shopify.toast.show(
            `You cannot set more than ${perOrderLimit} items for this product.`,
            { isError: true },
          );
          return prevCart;
        }

        return prevCart.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: newQuantity }
            : item,
        );
      }

      // Add new item with variant details
      return [
        ...prevCart,
        {
          ...product,
          variantId: variant.id,
          variantTitle: variant.displayName,
          variantImage: variant.image?.url,
          variantPrice: variant.price,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (variantId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.variantId !== variantId),
    );
  };

  const updateQuantity = (variantId, newQuantity) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.variantId === variantId) {
            const perOrderLimit = item.per_order_limit?.value
              ? Number(item.per_order_limit.value)
              : null;

            if (perOrderLimit !== null && newQuantity > perOrderLimit) {
              shopify.toast.show(
                `You cannot set more than ${perOrderLimit} items for this product.`,
                { isError: true },
              );
              return item;
            }

            return newQuantity === 0
              ? null
              : { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalOrderPoints = cart.reduce((sum, item) => {
    const orderPoints = item.order_points?.value
      ? Number(item.order_points.value)
      : 0;
    return sum + orderPoints * item.quantity;
  }, 0);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (activeProductType !== null) {
      fetchProductsByType(activeProductType);
    } else {
      fetchProducts();
    }
  }, [activeProductType]);

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
  }, [fullScreen, searchParams]);

  useEffect(() => {
    if (!searchProducts) {
      setFilteredProducts(products);
      return;
    }
    const filtered = products.filter((product) =>
      product.title.toLowerCase().includes(searchProducts.toLowerCase()),
    );
    setFilteredProducts(filtered);
  }, [searchProducts, products]);

  const updateCustomer = useCallback(
    (value) => {
      setCustomerInputValue(value);

      if (!customerLoading) {
        setCustomerLoading(true);
      }

      setTimeout(() => {
        if (value === "") {
          setCustomers([]);
          setCustomerLoading(false);
          return;
        }
        fetchCustomers(value);
        setCustomerLoading(false);
      }, 300);
    },
    [customerinputValue, customerLoading],
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedCustomer = selected.map((selectedItem) => {
        const matchedCustomer = Customers.find((Customer) => {
          return Customer.value.match(selectedItem);
        });
        return matchedCustomer && matchedCustomer;
      });

      setSelectedCustomers(selected);
      setCustomerInputValue(selectedCustomer[0]?.label || "");
      setSelectedCustomerData(selectedCustomer[0]);
    },
    [Customers],
  );

  return (
    <div className="flex h-full bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="p-2 bg-white mx-2 mt-2 rounded-md">
          <div className="flex justify-between">
            <button
              onClick={() => setIsCartOpen(true)}
              className="text-gray-500 hover:text-gray-700 md:hidden"
            >
              <CartIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="w-full flex space-x-2">
              <div className="mb-2 w-1/2 space-y-2">
                <Autocomplete
                  options={Customers}
                  selected={selectedCustomers}
                  onSelect={updateSelection}
                  customerLoading={customerLoading}
                  loading={customerLoading}
                  textField={
                    <Autocomplete.TextField
                      onChange={updateCustomer}
                      label="Select Guest"
                      value={customerinputValue}
                      prefix={<Icon source={SearchIcon} tone="base" />}
                      placeholder="Select a Guest by mobile"
                      autoComplete="off"
                    />
                  }
                />
                <CustomerPickerSearch
                  label="Select a Guest"
                  singleSelection={true}
                  onSelect={(v) => {
                    setSelectedCustomers(v[0]?.id);
                    setCustomerInputValue(
                      v[0]?.firstName + " " + v[0]?.lastName,
                    );
                    setSelectedCustomerData(v[0]);
                  }}
                />
              </div>
              <div className="flex justify-between w-1/2">
                <div>
                  <Text as="span" alignment="start">
                    full name: {selectedCustomerData?.firstName || ""}{" "}
                    {selectedCustomerData?.lastName || ""}
                  </Text>
                  <Text as="span" alignment="start">
                    mobile: {selectedCustomerData?.phone || ""}
                  </Text>
                  <Text as="span" alignment="start">
                    Zip code: {selectedCustomerData?.addresses?.[0]?.zip || ""}
                  </Text>
                  <Text as="span" alignment="start">
                    Service model:{" "}
                    {JSON.parse(
                      selectedCustomerData?.service_model_block_status?.value ||
                        "[]",
                    ).join(" , ")}
                  </Text>
                </div>
                <div className="">
                  <div className="flex flex-row-reverse">
                    <Button
                      size="large"
                      icon={() => (
                        <>{fullScreen ? <MinimizeIcon /> : <MaximizeIcon />}</>
                      )}
                      onClick={() => {
                        setFullScreen(!fullScreen);
                      }}
                    />
                  </div>
                  <div>
                    <Text as="span" alignment="start">
                      Basket Points{" "}
                      <span>
                        {totalOrderPoints}/
                        {loaderData?.storePosSettings?.["Basket Points Limit"]}
                      </span>
                    </Text>
                    <Text as="span" alignment="start">
                      Today Orders <span></span>
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 flex-1 flex flex-col overflow-hidden">
            <nav className="shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-4 overflow-x-auto py-2">
                  <button
                    onClick={() => {
                      setActiveProductType(null);
                    }}
                    className={
                      "px-3 py-1 rounded-md text-sm font-normal " +
                      (activeProductType === null
                        ? "text-gray-900 bg-gray-200"
                        : "text-gray-500 hover:text-gray-900")
                    }
                  >
                    All
                  </button>
                  {(loaderData.productTypes || []).map((type) => (
                    <button
                      key={type?.custom_product_type}
                      onClick={() => {
                        if (activeProductType === type?.custom_product_type) {
                          setActiveProductType(null);
                        } else {
                          setActiveProductType(type?.custom_product_type);
                        }
                      }}
                      className={
                        "px-3 py-1 rounded-md text-sm font-normal " +
                        (type?.custom_product_type === activeProductType
                          ? "text-gray-900 bg-gray-200"
                          : "text-gray-500 hover:text-gray-900")
                      }
                    >
                      {type?.custom_product_type}
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            <Scrollable
              className="flex-1 overflow-y-auto p-4"
              scrollbarWidth="thin"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <p>Loading...</p>
                ) : (
                  filteredProducts.map((product) =>
                    product.variants.edges.map(({ node: variant }) => (
                      <div
                        key={variant.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden relative"
                      >
                        {/* <img
                          src={variant.image?.url || product.featuredImage?.url}
                          alt={product.title}
                          className="w-full h-48 object-cover"
                        /> */}
                        <div className="flex justify-around">
                          <Thumbnail
                            source={
                              variant.image?.url || product.featuredImage?.url
                            }
                            alt={product.title}
                            size="large"
                          />
                        </div>
                        <div className="px-4 pt-2">
                          <h3 className="text-lg font-semibold">
                            {variant.displayName?.replace(
                              " - Default Title",
                              "",
                            ) || product?.title}
                          </h3>
                          {product.per_order_limit?.value && (
                            <p className="text-gray-600 text-sm mt-1">
                              item limit: {product.per_order_limit?.value}
                            </p>
                          )}
                          <div className="mt-2 flex justify-between items-center">
                            <span className=" text-base font-bold">
                              {product.order_points?.value || "0"} Points
                            </span>
                            <span className="text-sm text-gray-500">
                              {variant.inventoryQuantity
                                ? `/ ${variant.inventoryQuantity} pcs`
                                : ""}
                            </span>
                          </div>
                        </div>
                        <div className="h-8 mx-4 mb-4 mt-1"></div>
                        <button
                          onClick={() => addToCart(product, variant)}
                          className="inline-flex items-center justify-center px-4 pb-4 pt-1 absolute bottom-0"
                        >
                          <Button size="large" icon={PlusIcon} />
                        </button>
                      </div>
                    )),
                  )
                )}
              </div>
            </Scrollable>
          </div>
          <aside
            className={`md:w-1/2 z-40 md:py-2 md:pr-2 w-10/12 shadow-xl transform transition-transform duration-300 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full"} fixed inset-y-0 right-0 md:relative md:translate-x-0`}
          >
            <div className="flex flex-col h-full bg-white rounded-md">
              <div className="flex flex-row-reverse">
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-500 hover:text-gray-700 md:hidden p-1.5 absolute right-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <Scrollable className="flex-1" scrollbarWidth="thin">
                <div className="">
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Product", "Quantity", "Points"]}
                    rows={cart.map((item, index) => {
                      return [
                        <div className="flex ">
                          <Thumbnail
                            size="small"
                            source={
                              item?.featuredImage?.url ||
                              "https://static.vecteezy.com/system/resources/thumbnails/022/059/000/small_2x/no-image-available-icon-vector.jpg"
                            }
                          />
                          <div className="ml-2 m-auto">
                            <Text variant="bodyMd" fontWeight="bold">
                              {item.variantTitle?.replace(
                                " - Default Title",
                                "",
                              ) || item?.title}
                            </Text>
                          </div>
                        </div>,
                        <div className="flex justify-between">
                          <TextField
                            type="number"
                            // label="Quantity"
                            autoComplete="off"
                            value={item.quantity}
                            onChange={(value) =>
                              updateQuantity(item.variantId, value)
                            }
                            min={1}
                          />
                        </div>,
                        <div className="flex items-center h-full py-1">
                          <span>
                            {item.quantity * item.order_points?.value || "0"}{" "}
                            Points{" "}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.variantId)}
                          >
                            <XIcon className="fill-red-500 hover:fill-red-700 w-7 h-7" />
                          </button>
                        </div>,
                      ];
                    })}
                  />
                </div>
              </Scrollable>
              <div className="border-t p-4">
                <div className="flex justify-between font-semibold mb-2">
                  <span>Total Qty</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="flex justify-between font-semibold mb-2">
                  <span>Total Points</span>
                  <span>{totalOrderPoints}</span>
                </div>
                <div className="flex justify-between font-semibold mb-2">
                  <span>Weight Limit:</span>
                  <span>20 Pounds</span>
                </div>
                <div className="flex justify-between font-semibold mb-2">
                  <span>Weight</span>
                  <span>
                    <TextField
                      label=""
                      type="number"
                      value={weight}
                      onChange={setWeight}
                      min={0}
                      step={0.01}
                    />
                  </span>
                </div>
                <Button
                  fullWidth
                  variant="primary"
                  onClick={placeOrder}
                  loading={loadingCheckout}
                  disabled={loadingCheckout || loading}
                >
                  Place order
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
