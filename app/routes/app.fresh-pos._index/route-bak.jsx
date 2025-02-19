import { useEffect, useState, useMemo, useCallback } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useSearchParams, useNavigate } from "@remix-run/react";
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
  Autocomplete,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Button as SButton } from "../../components/ui/button";
import { fetchGraphQL } from "../../lib/graphql";
// import "../../tailwind.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
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
                variants(first: 1) {
                  edges {
                    node {
                        id
                      displayName
                      price
                    }
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }`;

function formatPrice(price, currencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(price / 100);
}

export default function Index() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [searchProducts, setSearchProducts] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // const deselectedCustomers = useMemo(
  //   () => [
  //     { value: "rustic", label: "Rustic" },
  //     { value: "antique", label: "Antique" },
  //     { value: "vinyl", label: "Vinyl" },
  //     { value: "vintage", label: "Vintage" },
  //     { value: "refurbished", label: "Refurbished" },
  //   ],
  //   [],
  // );
  const [deselectedCustomers, setDeselectedCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerinputValue, setCustomerInputValue] = useState("");
  const [Customers, setCustomers] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const shopify = useAppBridge();
  const navigate = useNavigate();

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
    setProducts(data.products.edges.map((edge) => edge.node));
    setLoading(false);
  };

  const fetchCollections = async () => {
    const query = `
      query {
        collections(first: 10) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    setCollections(data.collections.edges.map((edge) => edge.node));
  };

  const fetchProductsByCollection = async (collectionId) => {
    setLoading(true);
    const query = `
      query {
        collection(id: "${collectionId}") {
          products(first: 250) {
            edges {
              node {
                ${productFieldQuery}
              }
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    setProducts(data.collection.products.edges.map((edge) => edge.node));
    setLoading(false);
  };

  const fetchCustomers = async () => {
    setCustomerLoading(true);
    const query = `
      query {
        customers(first: 250) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
            }
          }
        }
      }
    `;
    const data = await fetchGraphQL(query);
    console.log("datadatadata", data);
    const customers = data.customers.edges.map(({ node }) => ({
      value: node.id,
      label: `${node.firstName} ${node.lastName} (${node.email})`,
    }));
    setDeselectedCustomers(customers);
    setCustomerLoading(false);
  };

  const placeOrder = async () => {
    const orderInput = {
      lineItems: cart.map((item) => ({
        variantId: item.variants.edges[0]?.node?.id,
        quantity: item.quantity,
      })),
      // currency: "MYR",
      financialStatus: "PENDING",
    };

    if (selectedCustomers.length > 0) {
      console.log("selectedCustomers", selectedCustomers);
      orderInput["customerId"] = selectedCustomers[0];
    }

    console.log("orderInput", orderInput);
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

    if (data.orderCreate?.userErrors.length) {
      shopify.toast.show(`Error: ${data.orderCreate.userErrors[0].message}`, {
        isError: true,
      });
      return;
    }

    setCart([]);

    shopify.toast.show(`Order placed successfully`);
  };

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item,
        ),
      );
    }
  };

  const total = cart.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.priceRange.maxVariantPrice.amount) / 100) *
        item.quantity,
    0,
  );

  useEffect(() => {
    fetchCollections();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (activeCollectionId !== null) {
      fetchProductsByCollection(activeCollectionId);
    } else {
      fetchProducts();
    }
  }, [activeCollectionId]);

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
      fetchCustomers();
      console.log("deselectedCustomers", deselectedCustomers);
      setCustomerInputValue(value);

      if (!customerLoading) {
        setCustomerLoading(true);
      }

      setTimeout(() => {
        if (value === "") {
          setCustomers(deselectedCustomers);
          setCustomerLoading(false);
          return;
        }
        const filterRegex = new RegExp(value, "i");
        const resultCustomers = deselectedCustomers.filter((Customer) =>
          Customer.label.match(filterRegex),
        );
        setCustomers(resultCustomers);
        setCustomerLoading(false);
      }, 300);
    },
    [deselectedCustomers, customerLoading],
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedText = selected.map((selectedItem) => {
        const matchedCustomer = Customers.find((Customer) => {
          return Customer.value.match(selectedItem);
        });
        return matchedCustomer && matchedCustomer.label;
      });
      setSelectedCustomers(selected);
      setCustomerInputValue(selectedText[0] || "");
    },
    [Customers],
  );

  return (
    <div className="flex h-full bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="p-4 bg-white mx-2 mt-2 rounded-md">
          <div className="flex justify-between">
            <h1 className="text-xl font-bold mb-2 mt-2">Welcome,</h1>
            <button
              onClick={() => setIsCartOpen(true)}
              className="text-gray-500 hover:text-gray-700 md:hidden"
            >
              <CartIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mb-4"></p>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="lucide lucide-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input
                className="flex h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-4 py-2 w-full"
                placeholder="Search product..."
                type="text"
                value={searchProducts}
                onChange={(v) => {
                  setSearchProducts(v.target.value);
                }}
              />
            </div>
            <button
              onClick={() => {
                setFullScreen(!fullScreen);
              }}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10"
            >
              {fullScreen ? (
                <MinimizeIcon className="w-6 h-6" />
              ) : (
                <MaximizeIcon className="w-6 h-6" />
              )}
            </button>
          </div>
          <TextField
            label
            prefix={<SearchIcon className="h-5 w-5" />}
            autoComplete="off"
            placeholder="Search Products"
            value={searchProducts}
            // onChange={(value) => setSearchQuery(value.toLowerCase())}
            onChange={(v) => {
              setSearchProducts(v.target.value);
            }}
          />
        </header>

        <nav className="shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 overflow-x-auto py-2">
              <button
                onClick={() => {
                  setActiveCollectionId(null);
                }}
                className={
                  "px-3 py-2 rounded-md text-sm font-medium " +
                  (activeCollectionId === null
                    ? "text-gray-900 bg-gray-200"
                    : "text-gray-500 hover:text-gray-900")
                }
              >
                All
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    if (activeCollectionId === collection.id) {
                      setActiveCollectionId(null);
                    } else {
                      setActiveCollectionId(collection.id);
                    }
                  }}
                  className={
                    "px-3 py-1 rounded-md text-sm font-medium " +
                    (collection.id === activeCollectionId
                      ? "text-gray-900 bg-gray-200"
                      : "text-gray-500 hover:text-gray-900")
                  }
                >
                  {collection.title}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p>Loading...</p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden relative"
                >
                  <img
                    src={product?.featuredImage?.url}
                    alt={product?.title}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => addToCart(product)}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 w-10 absolute top-2 right-2 bg-white hover:bg-gray-100 text-gray-800"
                  >
                    <PlusIcon className="w-6 h-6 fill-gray-800" />
                  </button>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{product?.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {product.description}
                    </p>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-lg font-bold">
                        {formatPrice(
                          product.priceRange?.maxVariantPrice?.amount,
                          product.priceRange?.maxVariantPrice?.currencyCode,
                        )}
                      </span>
                      <span className="text-sm text-gray-500">
                        {product?.totalInventory
                          ? `/ ${product?.totalInventory} pcs`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      <aside
        className={`py-2 pr-2 w-96 shadow-xl transform transition-transform duration-300 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full"} fixed inset-y-0 right-0 md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full bg-white rounded-md">
          <div className="flex justify-between p-4 border-b items-start">
            <div className="w-full">
              <div className="mb-2 w-full">
                <Autocomplete
                  options={Customers}
                  selected={selectedCustomers}
                  onSelect={updateSelection}
                  customerLoading={customerLoading}
                  textField={
                    <Autocomplete.TextField
                      onChange={updateCustomer}
                      label="Select Customer"
                      value={customerinputValue}
                      prefix={<Icon source={SearchIcon} tone="base" />}
                      placeholder="Select a customer"
                      autoComplete="off"
                    />
                  }
                />
              </div>
              <h2 className="text-lg font-semibold">Current Order</h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-gray-500 hover:text-gray-700 md:hidden"
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
          <div className="flex-1 overflow-y-auto p-4">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center mb-4">
                <img
                  src={item?.featuredImage?.url}
                  alt={item?.title}
                  className="w-16 h-16 object-cover rounded-md mr-4"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item?.title}</h3>
                  <p className="text-gray-600">
                    {formatPrice(
                      item.priceRange?.maxVariantPrice?.amount,
                      item.priceRange?.maxVariantPrice?.currencyCode,
                    )}
                  </p>
                  <div className="flex items-center mt-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Icon source={MinusIcon} />
                    </button>
                    <span className="mx-2">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Icon source={PlusIcon} />
                    </button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)}>
                  <XIcon className="fill-red-500 hover:fill-red-700 w-7 h-7" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t p-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Discount</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={placeOrder}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-md mt-4 hover:bg-orange-600 transition-colors"
            >
              Place order
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
