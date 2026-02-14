export async function searchPlaces(query) {
    if (!query || query.length < 3) return [];

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    // Real API Call if Key exists
    if (API_KEY) {
        try {
            // Using Text Search (New) or Places API
            // Note: In client-side code, we must be careful with CORS. 
            // Often best to route through a Next.js API route to keep key hidden and handle CORS.
            // But for this prototype, we'll try client-side if allowed, or mock.

            // Allow user to use mock by typing "mock"
            if (query.toLowerCase().includes('mock')) throw new Error("Force Mock");

            const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=gym+in+${encodeURIComponent(query)}&key=${API_KEY}`, { cache: 'no-store' });
            const data = await response.json();

            // Google API returns 200 even on error, but with "status": "REQUEST_DENIED" and "error_message"
            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                console.warn("Google Places API Error:", data.status, data.error_message);
                // Fallback to mock
                throw new Error("API Error: " + (data.error_message || data.status));
            }

            if (data.status === 'OK') {
                return data.results.map(place => ({
                    id: place.place_id,
                    name: place.name,
                    location: place.formatted_address,
                    is_real: true
                }));
            }
        } catch (err) {
            console.warn("Google Places API failed or not active, falling back to mock.", err);
            // Fallback will happen below
        }
    }

    // Robust Mock Data Fallback
    const MOCK_GYMS = [
        { id: 'gym_gold_venice', name: "Gold's Gym", location: "Venice Beach, CA" },
        { id: 'gym_metroflex', name: "Metroflex Gym", location: "Arlington, TX" },
        { id: 'gym_planet_downtown', name: "Planet Fitness", location: "Downtown" },
        { id: 'gym_24_hour', name: "24 Hour Fitness", location: "Main St." },
        { id: 'gym_equinox', name: "Equinox", location: "Highland Park" },
        { id: 'gym_la_fitness', name: "LA Fitness", location: "Westside" },
        { id: 'gym_crunch', name: "Crunch Fitness", location: "South Beach" },
        { id: 'gym_anytime', name: "Anytime Fitness", location: "North Ave" },
        { id: 'gym_iron_paradise', name: "Iron Paradise", location: "The Sanctuary" },
        { id: 'gym_bev_francis', name: "Bev Francis Powerhouse", location: "Syosset, NY" },
        { id: 'gym_westside', name: "Westside Barbell", location: "Columbus, OH" },
        { id: 'gym_alphaland', name: "Alphaland", location: "Missouri City, TX" }
    ];

    return MOCK_GYMS.filter(g =>
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.location.toLowerCase().includes(query.toLowerCase())
    );
}
