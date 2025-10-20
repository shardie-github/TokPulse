import { gql } from '@apollo/client';

// Shop information
export const GET_SHOP_INFO = gql`
  query getShopInfo {
    shop {
      id
      name
      email
      domain
      currencyCode
      timezoneAbbreviation
      timezoneOffsetMinutes
      plan {
        displayName
        partnerDevelopment
        shopifyPlus
      }
    }
  }
`;

// Products queries
export const GET_PRODUCTS = gql`
  query getProducts($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          id
          title
          handle
          description
          vendor
          productType
          createdAt
          updatedAt
          status
          tags
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
                sku
                weight
                weightUnit
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_PRODUCT_BY_ID = gql`
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      description
      vendor
      productType
      createdAt
      updatedAt
      status
      tags
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            availableForSale
            sku
            weight
            weightUnit
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        id
        name
        values
      }
    }
  }
`;

// Orders queries
export const GET_ORDERS = gql`
  query getOrders($first: Int!, $query: String, $sortKey: OrderSortKeys, $reverse: Boolean) {
    orders(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          id
          name
          email
          phone
          createdAt
          updatedAt
          processedAt
          cancelledAt
          closedAt
          totalPrice {
            amount
            currencyCode
          }
          subtotalPrice {
            amount
            currencyCode
          }
          totalTax {
            amount
            currencyCode
          }
          totalShippingPrice {
            amount
            currencyCode
          }
          fulfillmentStatus
          financialStatus
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                variant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

// Customers queries
export const GET_CUSTOMERS = gql`
  query getCustomers($first: Int!, $query: String, $sortKey: CustomerSortKeys, $reverse: Boolean) {
    customers(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          id
          firstName
          lastName
          email
          phone
          createdAt
          updatedAt
          acceptsMarketing
          emailMarketingConsent {
            marketingState
            marketingOptInLevel
          }
          defaultAddress {
            id
            firstName
            lastName
            company
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          orders(first: 10) {
            edges {
              node {
                id
                name
                totalPrice {
                  amount
                  currencyCode
                }
                createdAt
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

// Analytics queries
export const GET_ANALYTICS = gql`
  query getAnalytics($first: Int!, $query: String) {
    analytics {
      sales(first: $first, query: $query) {
        edges {
          node {
            id
            date
            totalSales {
              amount
              currencyCode
            }
            totalOrders
            averageOrderValue {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

// Collections queries
export const GET_COLLECTIONS = gql`
  query getCollections($first: Int!, $query: String) {
    collections(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          updatedAt
          productsCount
          image {
            id
            url
            altText
            width
            height
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;