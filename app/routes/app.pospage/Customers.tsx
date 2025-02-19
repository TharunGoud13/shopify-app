import { useNavigate } from "@remix-run/react";
import { Button, Page } from "@shopify/polaris";
import CustomerTable from "../../components/my-pos/CustomerTable";
import { useEffect, useState } from "react";

const Customers = () => {
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
              customers(first:100){
        edges{
            node{
                id
                displayName
                email
                phone
                createdAt
                updatedAt
                tags
                state
                numberOfOrders
                totalSpent: amountSpent{
                  amount
                  currencyCode
                }
                defaultAddress {
                  formatted
                  country
                  city
                  province
                }
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
          const formattedData = result.data.customers.edges.map(
            (customer: { node: any }, customerIndex: number) => {
              const customerNode = customer.node;
              console.log("customerNode----", customerNode);

              return {
                customerIndex: customerIndex,
                name: customerNode.displayName,
                email: customerNode.email,
                phone: customerNode.phone,
                totalSpent: customerNode.totalSpent.amount,
                numberOfOrders: customerNode.numberOfOrders,
                status: customerNode.state,
                defaultAddress: "N/A",
                // defaultAddress: customerNode.defaultAddress.formatted.map(
                //   (item: any) => item,
                // ),
                createdAt: customerNode.createdAt || "N/A",
                updatedAt: customerNode.updatedAt,
                tags:
                  (customerNode.tags.length > 0 && customerNode.tags[0]) ||
                  "N/A",
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
    { title: "Name" },
    { title: "Email" },
    { title: "Phone" },
    { title: "Total Spent" },
    { title: "Number of Orders" },
    { title: "Status" },
    { title: "Default Address" },
    { title: "Created At" },
    { title: "Updated At" },
    { title: "Tags" },
  ];
  return (
    <div>
      <Page
        title="Customers"
        fullWidth
        primaryAction={
          <Button
            variant="primary"
            onClick={() => navigate("/app/fresh-pageid/new")}
          >
            Add Customer
          </Button>
        }
      >
        <CustomerTable headings={headings} customers={data} />
      </Page>
    </div>
  );
};

export default Customers;
