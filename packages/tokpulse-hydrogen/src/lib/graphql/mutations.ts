import { gql } from '@apollo/client';

// Product mutations
export const CREATE_PRODUCT = gql`
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        description
        vendor
        productType
        status
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        handle
        description
        vendor
        productType
        status
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

// Product variant mutations
export const CREATE_PRODUCT_VARIANT = gql`
  mutation productVariantCreate($input: ProductVariantInput!) {
    productVariantCreate(input: $input) {
      productVariant {
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
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PRODUCT_VARIANT = gql`
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant {
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
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Order mutations
export const UPDATE_ORDER = gql`
  mutation orderUpdate($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        name
        email
        phone
        fulfillmentStatus
        financialStatus
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation orderCancel($input: OrderCancelInput!) {
    orderCancel(input: $input) {
      order {
        id
        name
        cancelledAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Customer mutations
export const CREATE_CUSTOMER = gql`
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        firstName
        lastName
        email
        phone
        acceptsMarketing
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        firstName
        lastName
        email
        phone
        acceptsMarketing
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Collection mutations
export const CREATE_COLLECTION = gql`
  mutation collectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        title
        handle
        description
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_COLLECTION = gql`
  mutation collectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection {
        id
        title
        handle
        description
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Webhook mutations
export const CREATE_WEBHOOK = gql`
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        callbackUrl
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const DELETE_WEBHOOK = gql`
  mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

// App-specific mutations for TokPulse
export const CREATE_ANALYTICS_EVENT = gql`
  mutation createAnalyticsEvent($input: AnalyticsEventInput!) {
    # This would be a custom mutation for TokPulse analytics
    # Implementation depends on your backend setup
    createAnalyticsEvent(input: $input) {
      success
      eventId
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_SOCIAL_MEDIA_SETTINGS = gql`
  mutation updateSocialMediaSettings($input: SocialMediaSettingsInput!) {
    # Custom mutation for social media settings
    updateSocialMediaSettings(input: $input) {
      success
      settings {
        platform
        enabled
        apiKey
        lastSync
      }
      errors {
        field
        message
      }
    }
  }
`;