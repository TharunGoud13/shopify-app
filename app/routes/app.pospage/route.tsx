import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Page, Spinner, Text, Button, Tabs } from "@shopify/polaris";
import { getSession, destroySession } from "../../session.server";
import { getCustomerDetails } from "../../lib/auth";
import { useEffect, useState } from "react";
import POS from "./POS";
import Settings from "./Settings";
import Reports from "./Reports";
import StockView from "./StockView";
import Orders from "./Orders";
import Customers from "./Customers";
import Products from "./Products";

export async function loader({ request }) {
  return json({});
}

export default function POSPage() {
  const data = useLoaderData();
  const [selected, setSelected] = useState(0);

  const handleTabChange = (selectedTab: number) => {
    console.log("selectedTab----", selectedTab);
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
      content: "POS",
      component: <POS />,
    },
    {
      id: "products",
      content: "Products",
      component: <Products />,
    },
    {
      id: "customers",
      content: "Customers",
      component: <Customers />,
    },
    {
      id: "orders",
      content: "Orders",
      component: <Orders />,
    },
    {
      id: "stockview",
      content: "Stock View",
      component: <StockView />,
    },
    {
      id: "reports",
      content: "Reports",
      component: <Reports />,
    },
    {
      id: "settings",
      content: "Settings",
      component: <Settings />,
    },
  ];

  return (
    <div title="POS Area">
      <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
        {tabs[selected]?.component}
      </Tabs>
    </div>
  );
}
