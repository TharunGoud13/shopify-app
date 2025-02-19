import { Link, useSearchParams } from "@remix-run/react";
import { Card, LegacyCard, Page, Tabs } from "@shopify/polaris";
import Barcode from "../../components/login/BarCode";
import GuestLookup from "../../components/login/GuestLookup";
import Mobile from "../../components/login/Mobile";
import { useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import Email from "../../components/login/Email";
import {
  getSession,
  commitSession,
  destroySession,
} from "../../session.server";
import { customerAccessTokenCreate, searchCustomerByPhone } from "@/lib/auth";

export async function loader({ request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const url = new URL(request.url);

  if (url.searchParams.get("logout")) {
    return redirect("/pos/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  if (session.has("customerAccessToken")) {
    return redirect("/pos");
  }

  return json({});
}

export async function action({ request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  const type = formData.get("type");
  const password = formData.get("password") as string;

  let email: string | null = null;
  if (type === "mobileNumber") {
    const mobileNumber = formData.get("mobileNumber") as string;
    const data = await searchCustomerByPhone(mobileNumber);
    if (!data || !data?.customers?.edges?.length) {
      return json(
        { errors: "No account found with this mobile number" },
        { status: 400 },
      );
    }
    email = data.customers.edges[0].node.email;
  } else if (type === "email") {
    email = formData.get("email") as string;
  }

  if (!email || !password) {
    return json({ errors: "Missing email or password" }, { status: 400 });
  }

  const { data, errors } = await customerAccessTokenCreate({
    email,
    password,
  });

  if (errors) {
    return json({ errors: errors[0]?.message }, { status: 400 });
  }

  if (data?.customerAccessTokenCreate?.customerAccessToken?.accessToken) {
    session.set(
      "customerAccessToken",
      data.customerAccessTokenCreate.customerAccessToken.accessToken,
    );
    return redirect("/pos", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  return json({ errors: "Login Failed" }, { status: 400 });
}

export default function LoginPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [logoutMessage, setLogoutMessage] = useState("");
  const [searchParams] = useSearchParams();

  const handleTabChange = (selectedTab: number) => {
    setSelectedTab(selectedTab);
  };

  useEffect(() => {
    const logout = searchParams.get("logout");
    if (logout) {
      setLogoutMessage("You have been successfully logged out.");
    }
  }, [searchParams]);

  const tabs = [
    {
      id: "email",
      content: "Email",
      component: <Email />,
    },
    {
      id: "mobile",
      content: "Mobile",
      component: <Mobile />,
    },
    {
      id: "barcode",
      content: "Barcode",
      component: <Barcode />,
    },
    {
      id: "guestlookup",
      content: "Guest Lookup",
      component: <GuestLookup />,
    },
  ];
  return (
    <Page>
      {logoutMessage ? (
        <Text variant="headingMd" tone="success">
          {logoutMessage}
        </Text>
      ) : (
        <></>
      )}
      <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
        {tabs[selectedTab]?.component}
      </Tabs>
      <div className="flex justify-between mt-4 items-center">
        <Link to="/pos/login">Help</Link>
        <Link to="/pos/login">Support</Link>
        <Link to="/pos/login">Reset Password</Link>
        <Link to="/pos/login">Retrieve Information</Link>
      </div>
    </Page>
  );
}
