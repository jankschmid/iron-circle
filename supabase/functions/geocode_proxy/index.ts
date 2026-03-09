import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// CORS Headers necessary for browsers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase functions.invoke sends a POST request with a JSON body
    let address = null;
    let lat = null;
    let lng = null;

    if (req.method === 'POST') {
      const body = await req.json();
      address = body?.address;
      lat = body?.lat;
      lng = body?.lng;
    } else {
      const url = new URL(req.url);
      address = url.searchParams.get('address');
      lat = url.searchParams.get('lat');
      lng = url.searchParams.get('lng');
    }

    if (!address && (!lat || !lng)) {
      return new Response(JSON.stringify({ error: 'Either address or lat/lng parameters are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    let nominatimUrl = '';

    if (lat && lng) {
      // Reverse Geocoding
      nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    } else {
      // Forward Geocoding
      nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    }

    // Fetch from Nominatim
    const nominatimRes = await fetch(nominatimUrl, {
      headers: {
        // Nominatim requirement: identify the application
        'User-Agent': 'IronCircleApp/1.0 (contact@ironcircle.app)'
      }
    })

    if (!nominatimRes.ok) {
      throw new Error(`Nominatim returned ${nominatimRes.status}: ${nominatimRes.statusText}`)
    }

    const data = await nominatimRes.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
