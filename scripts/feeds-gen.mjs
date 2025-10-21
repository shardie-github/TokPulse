#!/usr/bin/env node
/* TokPulse — © Hardonia. MIT. */
import { PrismaClient } from '@tokpulse/db'
import fs from 'fs'
import path from 'path'

const db = new PrismaClient()

async function generateFeeds() {
  console.log('🔄 Generating product feeds...')
  
  try {
    // Get all active stores
    const stores = await db.store.findMany({
      where: { status: 'ACTIVE' },
      include: {
        catalogItems: true,
        feedConfigs: true
      }
    })

    console.log(`Found ${stores.length} active stores`)

    for (const store of stores) {
      console.log(`Generating feeds for store: ${store.shopDomain}`)
      
      // Generate Google Merchant Center feed
      await generateGoogleFeed(store)
      
      // Generate Meta/TikTok feed
      await generateMetaFeed(store)
      
      // Generate TikTok feed
      await generateTikTokFeed(store)
    }

    console.log('✅ All feeds generated successfully')
  } catch (error) {
    console.error('❌ Failed to generate feeds:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

async function generateGoogleFeed(store) {
  const feedData = {
    title: 'Google Merchant Center Feed',
    link: `${process.env.APP_URL}/feeds/${store.id}/google`,
    description: 'Product feed for Google Merchant Center',
    language: 'en-us',
    items: store.catalogItems.map(item => ({
      id: item.productId,
      title: item.title,
      description: item.title, // Use title as description if no description field
      link: `https://${store.shopDomain}/products/${item.handle}`,
      image_link: item.images ? item.images.split(',')[0] : '',
      availability: item.inventory > 0 ? 'in stock' : 'out of stock',
      price: `${item.price} USD`,
      condition: 'new',
      brand: item.vendor || 'Unknown',
      product_type: item.productType || 'General',
      google_product_category: 'Apparel & Accessories',
      custom_label_0: item.tags || ''
    }))
  }

  const xml = generateXML(feedData, 'google')
  const outputPath = path.join(process.cwd(), 'feeds', store.id, 'google.xml')
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, xml)
  
  console.log(`  ✅ Google feed generated: ${outputPath}`)
}

async function generateMetaFeed(store) {
  const csvData = [
    ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'product_type'],
    ...store.catalogItems.map(item => [
      item.productId,
      item.title,
      item.title, // Use title as description
      item.inventory > 0 ? 'in stock' : 'out of stock',
      'new',
      item.price,
      `https://${store.shopDomain}/products/${item.handle}`,
      item.images ? item.images.split(',')[0] : '',
      item.vendor || 'Unknown',
      item.productType || 'General'
    ])
  ]

  const csv = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n')
  const outputPath = path.join(process.cwd(), 'feeds', store.id, 'meta.csv')
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, csv)
  
  console.log(`  ✅ Meta feed generated: ${outputPath}`)
}

async function generateTikTokFeed(store) {
  const csvData = [
    ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'product_type'],
    ...store.catalogItems.map(item => [
      item.productId,
      item.title,
      item.title, // Use title as description
      item.inventory > 0 ? 'in stock' : 'out of stock',
      'new',
      item.price,
      `https://${store.shopDomain}/products/${item.handle}`,
      item.images ? item.images.split(',')[0] : '',
      item.vendor || 'Unknown',
      item.productType || 'General'
    ])
  ]

  const csv = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n')
  const outputPath = path.join(process.cwd(), 'feeds', store.id, 'tiktok.csv')
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, csv)
  
  console.log(`  ✅ TikTok feed generated: ${outputPath}`)
}

function generateXML(data, type) {
  if (type === 'google') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${data.title}</title>
    <link>${data.link}</link>
    <description>${data.description}</description>
    <language>${data.language}</language>
    ${data.items.map(item => `
    <item>
      <g:id>${item.id}</g:id>
      <g:title>${item.title}</g:title>
      <g:description>${item.description}</g:description>
      <g:link>${item.link}</g:link>
      <g:image_link>${item.image_link}</g:image_link>
      <g:availability>${item.availability}</g:availability>
      <g:price>${item.price}</g:price>
      <g:condition>${item.condition}</g:condition>
      <g:brand>${item.brand}</g:brand>
      <g:product_type>${item.product_type}</g:product_type>
      <g:google_product_category>${item.google_product_category}</g:google_product_category>
      <g:custom_label_0>${item.custom_label_0}</g:custom_label_0>
    </item>`).join('')}
  </channel>
</rss>`
  }
  
  return ''
}

generateFeeds()