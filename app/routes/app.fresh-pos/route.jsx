import { useEffect, useState } from "react";
import { Outlet } from "@remix-run/react";

import { Menu, Bell, LogOut, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
import { useNavigate, useLocation } from "@remix-run/react";
import { Tabs } from "@shopify/polaris";

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { name: "POS", link: "/fresh-pos" },
    { name: "Products", link: "/fresh-pos/products" },
    { name: "Stock View", link: "/fresh-pos/stock-view" },
    { name: "Guests", link: "/fresh-pos/customers" },
    { name: "Orders", link: "/fresh-pos/orders" },
    // { name: "Stock arrivals", link: "/fresh-pos/stock-arrivals" }, //TODO : delete stock arrival pages
    { name: "Reports", link: "/fresh-pos/reports" },
    { name: "Settings", link: "/fresh-pos/Settings" },
  ];

  const [selectedMenuItem, setSelectedMenuItem] = useState(menu[0].link);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    // Find the menu index based on whether the current pathname includes the menu link
    const index = menu
      .slice(1)
      .findIndex((item) => location.pathname.includes(item.link));

    if (index !== -1) {
      setSelected(index + 1);
      setSelectedMenuItem(menu[index + 1].link);
    } else {
      setSelected(0);
      setSelectedMenuItem(menu[0].link);
    }
  }, [location.pathname, menu]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      <header
        className="flex md:justify-between justify-end h-12 items-center gap-4 bg-gray-100 px-4 w-full "
        style={{
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <nav className="flex items-center gap-6 text-sm">
          <Tabs
            tabs={menu.map((item) => ({
              id: item.name,
              content: item.name,
            }))}
            selected={selected}
            س
            onSelect={(v) => {
              // setSelected(v);
              // setSelectedMenuItem(menu[v].link);
              navigate("/app" + menu[v].link, { replace: true });
            }}
          ></Tabs>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="h-[calc(100vh-3rem)] w-full">
        <Outlet />
      </div>
    </div>
  );
}
