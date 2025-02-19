import { useNavigate } from "@remix-run/react";
import { Button, Page } from "@shopify/polaris";
import OrdersTable from "app/components/my-pos/OrdersTable";
import { useEffect, useState } from "react";

const Orders = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/get-pos-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `{
              orders(first: 100){
        edges{
            node{
                id
                customer{
                    displayName
                }
                    name
                totalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                createdAt
                updatedAt
                tags
                currentSubtotalLineItemsQuantity
                channelInformation {
                          channelDefinition {
                              handle
                              channelName
                          }
                      }
                      displayFulfillmentStatus
                      displayFinancialStatus
                       
                
            }
        }
    }
            }`,
          }),
        });

        const result = await response.json();
        console.log("result---", result);

        if (response.ok) {
          // Map and format product and variant data
          const formattedData = result.data.orders.edges.map(
            (order: { node: any }, orderIndex: number) => {
              const orderNode = order.node;
              console.log("customerNode----", orderNode);

              return {
                orderIndex: orderIndex,
                order: orderNode.name,
                date: orderNode.createdAt,
                tags: orderNode.tags[0],
                channel: "",
                totalAmount: orderNode.totalPriceSet.shopMoney.amount,
                paymentStatus: orderNode.displayFinancialStatus,
                items: orderNode.currentSubtotalLineItemsQuantity,
                fulfillmentStatus: orderNode.displayFulfillmentStatus,
              };
            },
          );

          setData(formattedData); // Set the formatted data to state
        } else {
          console.log(result.error);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchProducts();
  }, []);

  console.log("data-----....", data);

  const headings = [
    { title: "Order" },
    { title: "Customer" },
    { title: "Date" },
    { title: "Tags" },
    { title: "Channel" },
    { title: "Total Amount" },
    { title: "Payment Status" },
    { title: "Items" },
    { title: "Fulfillment Status" },
  ];
  return (
    <div>
      <Page
        title="Orders"
        fullWidth
        primaryAction={
          <Button
            variant="primary"
            onClick={() => navigate("/app/fresh-pageid/new")}
          >
            Add Order
          </Button>
        }
      >
        <OrdersTable headings={headings} orders={data} />
      </Page>
    </div>
  );
};

export default Orders;
