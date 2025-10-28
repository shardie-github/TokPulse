/**
 * Supabase Edge Function: AI Semantic Search
 * Performs hybrid semantic + keyword search using embeddings
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  namespace?: string;
  limit?: number;
  threshold?: number;
  hybrid?: boolean;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  namespace: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const body: SearchRequest = await req.json();
    const {
      query,
      namespace,
      limit = 10,
      threshold = 0.7,
      hybrid = true,
    } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Perform semantic search using vector similarity
    let rpcQuery = supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit * 2, // Get more for hybrid filtering
    });

    if (namespace) {
      rpcQuery = rpcQuery.eq('namespace', namespace);
    }

    const { data: semanticResults, error: semanticError } = await rpcQuery;

    if (semanticError) {
      throw semanticError;
    }

    let results: SearchResult[] = semanticResults || [];

    // If hybrid mode, also do keyword search and merge
    if (hybrid) {
      let keywordQuery = supabase
        .from('ai_embeddings')
        .select('*')
        .textSearch('content', query, { type: 'websearch' })
        .limit(limit);

      if (namespace) {
        keywordQuery = keywordQuery.eq('namespace', namespace);
      }

      const { data: keywordResults } = await keywordQuery;

      // Merge and deduplicate
      const resultMap = new Map<string, SearchResult>();

      for (const result of results) {
        resultMap.set(result.id, result);
      }

      for (const result of keywordResults || []) {
        if (!resultMap.has(result.id)) {
          resultMap.set(result.id, {
            ...result,
            similarity: 0.5, // Lower score for keyword-only matches
          });
        }
      }

      results = Array.from(resultMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } else {
      results = results.slice(0, limit);
    }

    // Clean up embeddings from response
    const cleanResults = results.map(({ embedding, ...rest }) => rest);

    return new Response(
      JSON.stringify({
        results: cleanResults,
        count: cleanResults.length,
        query,
        namespace: namespace || 'all',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
