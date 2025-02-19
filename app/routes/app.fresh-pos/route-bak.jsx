import { useState } from "react";
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
import { useNavigate } from "@remix-run/react";

export default function Index() {
  const navigate = useNavigate();

  const [selectedMenuItem, setSelectedMenuItem] = useState("POS");

  const menu = [
    { name: "POS", link: "/fresh-pos" },
    { name: "Products", link: "/fresh-pos/products" },
    { name: "Customers", link: "/fresh-pos/customers" },
    { name: "Orders", link: "/fresh-pos/orders" },
    { name: "Stock View", link: "/fresh-pos/stock-view" },
    { name: "Stock arrivals", link:"/fresh-pos/stock-arrivals" },
    { name: "Reports", link: "/fresh-pos/reports" },
    { name: "Settings", link: "/fresh-pos/Settings" },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100">
      <header
        className="flex md:justify-between justify-end h-16 items-center gap-4 bg-gray-100 px-4 md:px-6"
        style={{
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {menu.map((item) => (
            <a
              key={item.link}
              className={`font-medium relative ${
                selectedMenuItem === item.link
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                console.log("navigate", "/app" + item.link);
                navigate("/app" + item.link, { replace: true });
              }}
            >
              {item.name}
              {selectedMenuItem === item.link && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary" />
              )}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={(e) => {
                  console.log("this has been clicked");
                }}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 text-sm">
                {menu.map((item) => (
                  <a
                    key={item.link}
                    className="text-muted-foreground"
                    onClick={() => {
                      console.log("navigate", "/app" + item.link);
                      navigate("/app" + item.link);
                    }}
                  >
                    {item.name}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="h-full w-full">
        <Outlet />
      </div>
    </div>
  );
}
