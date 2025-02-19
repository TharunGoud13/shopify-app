import { useLoaderData } from "@remix-run/react";
import { Page } from "@shopify/polaris";
import { useEffect, useState } from "react";
import OrderTable from "./OrderTable";
import type { LoginLoaderData } from "./LoginUser.server";
import { fetchShopifyGraphQL } from "@/lib/api";

const Orders = () => {
  const { customerAccessToken } = useLoaderData<LoginLoaderData>();
  const [data, setData] = useState([]);
  // const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const query = `{
                 
              customer(customerAccessToken: "e283e160a62e6f907bd8ab00126b126a"){
              orders(first:10){
              edges{
              node{
              id
              orderNumber
              processedAt
              financialStatus
          fulfillmentStatus
          currentTotalPrice {
            amount
            currencyCode
          }
          lineItems(first: 10) {
            edges {
              node {
                title
                quantity
                originalTotalPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        
              }}}
              }
              
            }`;
        const variables = {
          customerAccessToken,
        };

        const response = await fetchShopifyGraphQL({ query, variables });
        console.log("response-----", response);

        if (response.data?.customer?.orders?.edges) {
          const formattedData = response.data.customer.orders.edges.map(
            ({ node: orderNode }: any) => {
              // Calculate total items
              const totalItems = orderNode.lineItems.edges.reduce(
                (sum: number, { node }: any) => sum + node.quantity,
                0,
              );

              // Format line items for display
              const items = orderNode.lineItems.edges
                .map(({ node }: any) => `${node.title} (${node.quantity}x)`)
                .join(", ");

              return {
                id: orderNode.id,
                order: `#${orderNode.orderNumber}`,
                date: new Date(orderNode.processedAt).toLocaleString(),
                noOfItems: totalItems,
                items: items,
                financialStatus: orderNode.financialStatus,
                fulfillmentStatus: orderNode.fulfillmentStatus,
                totalAmount: `${orderNode.currentTotalPrice.amount} ${orderNode.currentTotalPrice.currencyCode}`,
              };
            },
          );

          setData(formattedData);
        } else {
          console.log(response.errors);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchOrders();
  }, []);

  const headings = [
    { title: "Order Number" },
    { title: "Date and Time" },
    { title: "Items" },
    { title: "No of Items" },
    { title: "Total Items" },
    { title: "Financial Status" },
    { title: "Fulfillment Status" },
    { title: "Total Amount" },
  ];
  return (
    <div>
      <Page
        title="Orders"
        fullWidth
        // primaryAction={
        //   <Button
        //     variant="primary"
        //     onClick={() => navigate("/app/fresh-pageid/new")}
        //   >
        //     Add Order
        //   </Button>
        // }
      >
        <OrderTable headings={headings} orders={data} />
      </Page>
    </div>
  );
};

export default Orders;
