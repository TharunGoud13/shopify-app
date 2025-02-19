import { fetchShopifyGraphQL } from "./api";
import { fetchGraphQL } from "./graphql";
export const CUSTOMER_QUERY = `
  query CustomerDetails($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      acceptsMarketing
    }
  }
`;

export const CUSTOMER_CREATE_QUERY = `
mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customer {
        id
      }
    }
  }
`;

export const CUSTOMER_ACCESS_TOKEN_CREATE_QUERY = `
mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
  customerAccessTokenCreate(input: $input) {
    customerUserErrors {
      code
      field
      message
    }
    customerAccessToken {
      accessToken
      expiresAt
    }
  }
}
`;
export const CUSTOMER_SEARCH_BY_PHONE_QUERY = `
  query CustomersByPhone($query: String!) {
    customers(first: 1, query: $query) {
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

export async function createCustomer(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  acceptsMarketing: boolean;
}) {
  return await fetchShopifyGraphQL({
    query: CUSTOMER_CREATE_QUERY,
    variables: {
      input: input,
    },
  });
}

export async function customerAccessTokenCreate(input: {
  email: string;
  password: string;
}) {
  return await fetchShopifyGraphQL({
    query: CUSTOMER_ACCESS_TOKEN_CREATE_QUERY,
    variables: {
      input: input,
    },
  });
}

export async function getCustomerDetails(customerAccessToken: string) {
  return await fetchShopifyGraphQL({
    query: CUSTOMER_QUERY,
    variables: {
      customerAccessToken,
    },
  });
}

export async function searchCustomerByPhone(phone: string) {
  return await fetchGraphQL(CUSTOMER_SEARCH_BY_PHONE_QUERY, {
    query: `phone:${phone}`,
  });
}
