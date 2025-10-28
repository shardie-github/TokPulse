/**
 * Generate AI Embeddings
 * Syncs product copy, docs, or user data via OpenAI Embeddings API
 * Stores in Supabase for semantic search
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { createHash } from 'crypto';

export class EmbeddingsGenerator {
  constructor(config = {}) {
    this.supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL || 'https://ghqyxhbyyirveptgwoqm.supabase.co';
    this.supabaseKey = config.supabaseKey || process.env.SUPABASE_SERVICE_KEY;
    this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'text-embedding-3-small';
    this.batchSize = config.batchSize || 100;
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Generate embeddings for all content in a directory
   */
  async generateFromDirectory(dirPath, namespace = 'docs') {
    console.log(`📚 Scanning ${dirPath} for content...`);
    
    const files = await this.scanDirectory(dirPath);
    const documents = await this.extractDocuments(files, namespace);
    
    console.log(`Found ${documents.length} documents`);
    
    return await this.processDocuments(documents);
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dir, files = []) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (['.md', '.txt', '.json', '.ts', '.tsx', '.js'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Extract documents from files
   */
  async extractDocuments(files, namespace) {
    const documents = [];

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        
        // Skip very small or very large files
        if (content.length < 50 || content.length > 50000) {
          continue;
        }

        // Split into chunks if large
        const chunks = this.chunkText(content, 1000);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const id = this.generateId(file, i);
          
          documents.push({
            id,
            namespace,
            content: chunk,
            metadata: {
              file,
              chunk: i,
              total_chunks: chunks.length,
              file_type: extname(file),
            },
          });
        }
      } catch (error) {
        console.warn(`Could not read ${file}:`, error.message);
      }
    }

    return documents;
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text, maxLength) {
    const chunks = [];
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Generate stable ID for content
   */
  generateId(file, chunk) {
    const hash = createHash('md5').update(`${file}:${chunk}`).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Process documents and generate embeddings
   */
  async processDocuments(documents) {
    const results = {
      total: documents.length,
      processed: 0,
      skipped: 0,
      failed: 0,
      cost: 0,
    };

    // Check which documents already exist
    const existing = await this.getExistingIds(documents.map(d => d.id));
    const toProcess = documents.filter(d => !existing.has(d.id));

    console.log(`${existing.size} already exist, processing ${toProcess.length} new documents`);

    // Process in batches
    for (let i = 0; i < toProcess.length; i += this.batchSize) {
      const batch = toProcess.slice(i, i + this.batchSize);
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(toProcess.length / this.batchSize)}`);
      
      try {
        const batchResults = await this.processBatch(batch);
        results.processed += batchResults.processed;
        results.failed += batchResults.failed;
        results.cost += batchResults.cost;
      } catch (error) {
        console.error('Batch failed:', error);
        results.failed += batch.length;
      }

      // Rate limiting
      if (i + this.batchSize < toProcess.length) {
        await this.sleep(1000);
      }
    }

    results.skipped = existing.size;
    return results;
  }

  /**
   * Get existing document IDs
   */
  async getExistingIds(ids) {
    const { data } = await this.supabase
      .from('ai_embeddings')
      .select('id')
      .in('id', ids);

    return new Set((data || []).map(d => d.id));
  }

  /**
   * Process a batch of documents
   */
  async processBatch(documents) {
    const results = { processed: 0, failed: 0, cost: 0 };

    // Generate embeddings via OpenAI
    const contents = documents.map(d => d.content);
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: contents,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Calculate cost (text-embedding-3-small: $0.02 per 1M tokens)
      const tokens = result.usage?.total_tokens || 0;
      results.cost = (tokens / 1_000_000) * 0.02;

      // Store in Supabase
      const records = documents.map((doc, i) => ({
        id: doc.id,
        namespace: doc.namespace,
        content: doc.content,
        embedding: result.data[i].embedding,
        metadata: doc.metadata,
      }));

      const { error } = await this.supabase
        .from('ai_embeddings')
        .upsert(records);

      if (error) {
        console.error('Supabase error:', error);
        results.failed = documents.length;
      } else {
        results.processed = documents.length;
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      results.failed = documents.length;
    }

    return results;
  }

  /**
   * Generate embeddings for custom content
   */
  async generateForContent(content, namespace, metadata = {}) {
    const chunks = this.chunkText(content, 1000);
    const documents = chunks.map((chunk, i) => ({
      id: this.generateId(metadata.id || 'custom', i),
      namespace,
      content: chunk,
      metadata: { ...metadata, chunk: i, total_chunks: chunks.length },
    }));

    return await this.processDocuments(documents);
  }

  /**
   * Refresh embeddings (delete and regenerate)
   */
  async refresh(namespace) {
    console.log(`🔄 Refreshing embeddings for namespace: ${namespace}`);
    
    // Delete existing
    await this.supabase
      .from('ai_embeddings')
      .delete()
      .eq('namespace', namespace);

    // Regenerate
    const dir = this.getDirectoryForNamespace(namespace);
    if (dir) {
      return await this.generateFromDirectory(dir, namespace);
    }

    return { error: 'Unknown namespace' };
  }

  /**
   * Map namespace to directory
   */
  getDirectoryForNamespace(namespace) {
    const mapping = {
      'docs': './docs',
      'code': './src',
      'packages': './packages',
      'api': './packages/api',
    };

    return mapping[namespace];
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CLI entrypoint
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const namespace = args[1] || 'docs';
  const path = args[2] || './docs';

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY required');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY required');
    process.exit(1);
  }

  const generator = new EmbeddingsGenerator();

  console.log('🚀 AI Embeddings Generator\n');

  try {
    let results;

    if (command === 'refresh') {
      results = await generator.refresh(namespace);
    } else {
      results = await generator.generateFromDirectory(path, namespace);
    }

    console.log('\n✅ Complete!');
    console.log(`📊 Results:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Cost: $${results.cost.toFixed(4)}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default EmbeddingsGenerator;
