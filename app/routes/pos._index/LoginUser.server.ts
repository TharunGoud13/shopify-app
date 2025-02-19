import { destroySession, getSession } from "@/session.server";
import { json, redirect } from "@remix-run/node";
import { getCustomerDetails } from "@/lib/auth";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const customerAccessToken = session.get("customerAccessToken");
  console.log("customerAccessToken----------", customerAccessToken);
  if (!customerAccessToken) {
    return redirect("/pos/login");
  }

  const { data, errors } = await getCustomerDetails(customerAccessToken);

  if (errors) {
    return redirect("/pos/login?errorMsg=session expired please login again", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  const response = {
    customer: data?.customer,
    customerAccessToken: customerAccessToken,
  };
  console.log("response in server----------", response);

  return json(response);
}

export type LoginLoaderData = {
  customer: any; // Replace 'any' with your actual customer type
  customerAccessToken: string;
};
