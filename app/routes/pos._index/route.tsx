import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Text, Button, Tabs } from "@shopify/polaris";
import { getSession, destroySession } from "../../session.server";
import { getCustomerDetails } from "../../lib/auth";
import { useEffect, useState } from "react";
import POS from "./POS";
// import Reports from "./Reports";
// import StockView from "./StockView";
import Orders from "./Orders";
import Profile from "./Settings";
// import Customers from "./Customers";
// import Products from "./Products";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const customerAccessToken = session.get("customerAccessToken");
  console.log("customerAccessToken----------", customerAccessToken);

  if (!customerAccessToken) {
    return redirect("/pos/login");
  }
  const { data, errors } = await getCustomerDetails(customerAccessToken);
  if (errors) {
    console.log("errors", errors);
    return redirect("/pos/login?errorMsg=session expired please login again", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  return json({ customer: data?.customer });
}
export default function POSPage() {
  const { customer } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState(0);

  const handleTabChange = (selectedTab: number) => {
    setSelected(selectedTab);
  };
  useEffect(() => {
    const fetchProducts = async () => {
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
                    handle
                    id
                    
                    title
                    vendor
                    productType
                    
                    status
                    variants(first: 10) {
                      edges {
                        node {
                            id
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
        }}`,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        console.log("result---", result);
      } else {
        console.error("Error fetching products:", result);
      }
    };
    fetchProducts();
  }, []);

  const tabs = [
    {
      id: "pos",
      content: "Ordering",
      component: <POS />,
    },
    // {
    //   id: "products",
    //   content: "Products",
    //   component: <Products />,
    // },
    // {
    //   id: "customers",
    //   content: "Customers",
    //   component: <Customers />,
    // },
    {
      id: "orders",
      content: "Orders",
      component: <Orders />,
    },
    // {
    //   id: "stockview",
    //   content: "Stock View",
    //   component: <StockView />,
    // },
    // {
    //   id: "reports",
    //   content: "Reports",
    //   component: <Reports />,
    // },
    {
      id: "settings",
      content: "Profile",
      component: (
        <Profile
          registrationNo={customer?.id}
          firstName={customer?.firstName}
          lastName={customer?.lastName}
          email={customer?.email}
        />
      ),
    },
  ];

  return (
    <div title="POS Area">
      <Card>
        {customer ? (
          <>
            <Text as="h2" variant="headingMd">
              POS Area for {customer.firstName} {customer.lastName}!
            </Text>
            <Button url="/pos/login?logout=true">Log Out</Button>
          </>
        ) : (
          <Text as="h2" variant="headingMd">
            Loading ...
          </Text>
        )}
      </Card>
      <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
        {tabs[selected]?.component}
      </Tabs>
    </div>
  );
}
