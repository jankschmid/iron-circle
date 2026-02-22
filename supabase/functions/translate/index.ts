// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { texts, targetLang } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing texts array' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!targetLang) {
      return new Response(JSON.stringify({ error: 'Missing targetLang' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const apiKey = Deno.env.get('DEEPL_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DeepL API key missing in edge function environment' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // DeepL expects target_lang to be uppercase sometimes (e.g. "EN-US" or "DE")
    // but typically standard 2-letter codes work fine.
    const deeplTargetLang = targetLang.toUpperCase();

    // Check if user is using Free or Pro API key
    const isFree = apiKey.endsWith(':fx');
    const apiUrl = isFree
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const deeplRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: texts,
        target_lang: deeplTargetLang
      })
    });

    if (!deeplRes.ok) {
      const errorText = await deeplRes.text();
      throw new Error(`DeepL API error: ${deeplRes.status} - ${errorText}`);
    }

    const deeplData = await deeplRes.json();

    // Result format: { translations: [ { detected_source_language: 'EN', text: 'Hallo' } ] }
    const translatedTexts = deeplData.translations.map((t: any) => t.text);

    return new Response(JSON.stringify({ translations: translatedTexts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
