import { seedBillingData } from '@tokpulse/billing';
import { prisma } from './index.js';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test organization
  const organization = await prisma.organization.upsert({
    where: { id: 'test-org-1' },
    update: {},
    create: {
      id: 'test-org-1',
      name: 'Test Organization',
    },
  });

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@tokpulse.com' },
    update: {},
    create: {
      email: 'test@tokpulse.com',
      name: 'Test User',
      role: 'OWNER',
      organizationId: organization.id,
    },
  });

  // Create a test store
  const store = await prisma.store.upsert({
    where: { shopDomain: 'test-store.myshopify.com' },
    update: {},
    create: {
      shopDomain: 'test-store.myshopify.com',
      accessToken: 'test-token',
      scopes: 'read_products,write_products,read_orders',
      region: 'us',
      status: 'ACTIVE',
      organizationId: organization.id,
    },
  });

  // Create some test catalog items
  await prisma.catalogItem.createMany({
    data: [
      {
        productId: 'test-product-1',
        title: 'Test Product 1',
        handle: 'test-product-1',
        vendor: 'Test Vendor',
        productType: 'Test Type',
        tags: 'test,sample',
        images: 'https://example.com/image1.jpg',
        price: 29.99,
        compareAtPrice: 39.99,
        inventory: 100,
        storeId: store.id,
      },
      {
        productId: 'test-product-2',
        title: 'Test Product 2',
        handle: 'test-product-2',
        vendor: 'Test Vendor',
        productType: 'Test Type',
        tags: 'test,sample',
        images: 'https://example.com/image2.jpg',
        price: 49.99,
        inventory: 50,
        storeId: store.id,
      },
    ],
  });

  // Create a test experiment
  await prisma.experiment.upsert({
    where: { id: 'test-exp-1' },
    update: {},
    create: {
      id: 'test-exp-1',
      name: 'Test Experiment',
      description: 'A test experiment for recommendations',
      status: 'DRAFT',
      config: JSON.stringify({
        variants: ['control', 'treatment'],
        trafficAllocation: 0.5,
        metrics: ['conversion_rate', 'revenue'],
      }),
      storeId: store.id,
    },
  });

  // Seed billing data
  await seedBillingData(prisma);

  // Create a test subscription for the organization
  const starterPlan = await prisma.plan.findUnique({
    where: { key: 'STARTER' },
  });

  if (starterPlan) {
    await prisma.subscription.upsert({
      where: { organizationId: organization.id },
      update: {},
      create: {
        organizationId: organization.id,
        planId: starterPlan.id,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`Organization: ${organization.name} (${organization.id})`);
  console.log(`User: ${user.email} (${user.role})`);
  console.log(`Store: ${store.shopDomain} (${store.status})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
