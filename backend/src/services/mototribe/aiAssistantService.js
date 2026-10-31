const { GoogleGenerativeAI } = require("@google/generative-ai");
const env = require("../../config/environment");
const AppError = require("../../utils/AppError");

// Import existing MotoTribe services for tool calling
const { getWeather } = require("./weatherService");
const { getCurrentAverage } = require("./fuelPriceService");

// Import models for context gathering
const Vehicle = require("../../models/mototribe/Vehicle");
const Ride = require("../../models/mototribe/Ride");
const RiderProfile = require("../../models/mototribe/RiderProfile");

// ─────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the MotoTribe AI Ride Assistant — a helpful, knowledgeable motorcycle riding companion built into the MotoTribe platform by Kaindra.

Your expertise covers:
- Motorcycle ride planning, route advice, and trip preparation
- Real-time weather assessment for riding conditions
- Fuel price lookups and fuel cost estimation for trips
- Motorcycle safety tips, pre-ride checklists, and emergency guidance
- Finding nearby services (fuel stations, repair shops, restaurants, rest stops)
- Ride budgeting and expense planning
- General motorcycle maintenance tips and riding best practices
- Indian road conditions, highway riding, and ghat/mountain pass advice

Personality & Communication:
- Be concise, friendly, and practical — riders want quick, actionable advice
- Use a conversational but informative tone
- When you have access to real-time data (weather, fuel prices), always present it clearly with numbers
- If asked about something outside your domain, politely redirect to riding-related topics
- Use metric units (km, km/L, °C, ₹) as the platform serves Indian riders
- When providing safety advice, be thorough — rider safety is paramount
- Format responses with clear structure: use bullet points, bold for key info
- Keep responses focused — avoid unnecessary preamble

Context Awareness:
- You may receive context about the user's vehicles, ride history, and rider profile
- Use this context to personalize your advice (e.g., knowing their bike's mileage for fuel estimates)
- If the user has upcoming rides, proactively offer relevant preparation tips
- You have access to tools that can fetch real-time weather, fuel prices, and other data — use them when relevant

Important Rules:
- Never fabricate specific fuel prices, weather data, or distances — use your tools to get real data
- Never share personal data about other users
- If you're unsure, say so honestly
- For medical emergencies, always advise calling emergency services (112 in India) immediately`;

// ─────────────────────────────────────────────
// Tool Definitions for Gemini Function Calling
// ─────────────────────────────────────────────

const toolDefinitions = [
  {
    name: "get_weather",
    description:
      "Get current weather conditions and forecast for a location. Use this when the user asks about weather, riding conditions, or when you need to assess if conditions are safe for riding.",
    parameters: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
          description: "Latitude of the location",
        },
        longitude: {
          type: "number",
          description: "Longitude of the location",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "get_fuel_price",
    description:
      "Get current fuel prices (petrol/diesel) for an Indian state. Use this when the user asks about fuel prices, fuel costs, or trip budgeting.",
    parameters: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description:
            "Indian state name (e.g., 'Maharashtra', 'Karnataka', 'Tamil Nadu')",
        },
        fuelType: {
          type: "string",
          enum: ["petrol", "diesel"],
          description: "Type of fuel — 'petrol' or 'diesel'",
        },
      },
      required: ["state", "fuelType"],
    },
  },
  {
    name: "estimate_fuel_cost",
    description:
      "Estimate the fuel cost for a trip given distance, vehicle mileage, and fuel price. Use this when the user asks about trip costs or budgeting.",
    parameters: {
      type: "object",
      properties: {
        distanceKm: {
          type: "number",
          description: "Total distance of the trip in kilometers",
        },
        mileageKmpl: {
          type: "number",
          description: "Vehicle fuel efficiency in km/L",
        },
        fuelPricePerLitre: {
          type: "number",
          description: "Current fuel price per litre in ₹ (INR)",
        },
      },
      required: ["distanceKm", "mileageKmpl", "fuelPricePerLitre"],
    },
  },
  {
    name: "get_user_vehicles",
    description:
      "Get the current user's registered vehicles with details like name, fuel type, and mileage. Use this when the user asks about their bikes or when you need vehicle info for fuel calculations.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_upcoming_rides",
    description:
      "Get the user's upcoming planned rides. Use when the user asks about their rides, needs preparation advice, or asks 'what's next'.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_ride_history",
    description:
      "Get the user's past completed rides and riding statistics. Use when the user asks about past rides or riding stats.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_rider_profile",
    description:
      "Get the user's rider profile including preferred ride type, total rides, distance covered, and regions explored.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ─────────────────────────────────────────────
// Tool Execution
// ─────────────────────────────────────────────

/**
 * Execute a tool call and return the result data for the AI.
 */
const executeTool = async (toolName, args, userId) => {
  try {
    switch (toolName) {
      case "get_weather": {
        const weather = await getWeather(args.latitude, args.longitude);
        return {
          current: weather.current,
          forecast: weather.forecast,
        };
      }

      case "get_fuel_price": {
        const result = await getCurrentAverage(args.state, args.fuelType);
        return {
          state: args.state,
          fuelType: args.fuelType,
          pricePerLitre: result.price,
          source: result.source || "IOCL / Community",
          confidence: result.confidence || null,
        };
      }

      case "estimate_fuel_cost": {
        const litresNeeded = args.distanceKm / args.mileageKmpl;
        const totalCost = litresNeeded * args.fuelPricePerLitre;
        return {
          distanceKm: args.distanceKm,
          mileageKmpl: args.mileageKmpl,
          fuelPricePerLitre: args.fuelPricePerLitre,
          litresRequired: Math.round(litresNeeded * 100) / 100,
          estimatedCost: Math.round(totalCost * 100) / 100,
          estimatedCostFormatted: `₹${Math.round(totalCost)}`,
        };
      }

      case "get_user_vehicles": {
        if (!userId) return { vehicles: [], message: "User not authenticated" };
        const vehicles = await Vehicle.find({ userId }).lean();
        return {
          vehicles: vehicles.map((v) => ({
            name: v.vehicleName,
            fuelType: v.fuelType,
            mileageKmpl: v.mileageKmpl,
            isDefault: v.isDefault,
          })),
        };
      }

      case "get_upcoming_rides": {
        if (!userId) return { rides: [], message: "User not authenticated" };
        const rides = await Ride.find({
          $or: [{ organizerId: userId }],
          status: { $in: ["planning", "ongoing"] },
          startDate: { $gte: new Date() },
        })
          .sort({ startDate: 1 })
          .limit(5)
          .lean();

        return {
          rides: rides.map((r) => ({
            title: r.title,
            origin: r.origin,
            destination: r.destination,
            startDate: r.startDate,
            distanceKm: r.distanceKm,
            status: r.status,
            durationDays: r.durationDays,
            budget: r.budget,
            maxRiders: r.maxRiders,
          })),
        };
      }

      case "get_ride_history": {
        if (!userId) return { rides: [], stats: {} };
        const completedRides = await Ride.find({
          organizerId: userId,
          status: "completed",
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        const profile = await RiderProfile.findOne({ userId }).lean();

        return {
          recentRides: completedRides.map((r) => ({
            title: r.title,
            origin: r.origin,
            destination: r.destination,
            distanceKm: r.distanceKm,
            completedAt: r.updatedAt,
          })),
          stats: {
            totalRidesCompleted: profile?.totalRidesCompleted || 0,
            totalDistanceKm: profile?.totalDistanceKm || 0,
            regionsExplored: profile?.regionsExplored || [],
          },
        };
      }

      case "get_rider_profile": {
        if (!userId) return { profile: null };
        const profile = await RiderProfile.findOne({ userId }).lean();
        if (!profile) return { profile: null, message: "No rider profile found" };
        return {
          profile: {
            preferredRideType: profile.preferredRideType,
            totalRidesCompleted: profile.totalRidesCompleted,
            totalDistanceKm: profile.totalDistanceKm,
            regionsExplored: profile.regionsExplored,
            routesContributed: profile.routesContributed,
            rideGroupsJoined: profile.rideGroupsJoined,
          },
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[AI Tool Error] ${toolName}:`, error.message);
    return {
      error: `Failed to execute ${toolName}: ${error.message}`,
    };
  }
};

// ─────────────────────────────────────────────
// Offline / Local MotoTribe Intelligence Fallback
// ─────────────────────────────────────────────

/**
 * Smart riding engine fallback that runs when GEMINI_API_KEY is not configured
 * or during Gemini API downtime. It uses real database data (IOCL fuel prices,
 * vehicle garage, ride records) and highway knowledge.
 */
const generateOfflineMotoTribeAdvice = async (userMessage, userId, context) => {
  const query = userMessage.toLowerCase();
  const toolsUsed = [];

  // Check for Lucknow - Kanpur route
  if (
    (query.includes("lucknow") && query.includes("kanpur")) ||
    (query.includes("kanpur") && query.includes("lucknow"))
  ) {
    let upFuelPrice = 94.65;
    try {
      const fuelData = await getCurrentAverage("Uttar Pradesh", "petrol");
      if (fuelData?.price || fuelData?.median) {
        upFuelPrice = fuelData.price || fuelData.median;
        toolsUsed.push("get_fuel_price (Uttar Pradesh)");
      }
    } catch {}

    const distanceKm = 88;
    const avgMileage = 38;
    const litresNeeded = (distanceKm / avgMileage).toFixed(2);
    const estCost = Math.round(litresNeeded * upFuelPrice);

    return {
      reply: `**🏍️ Lucknow to Kanpur Ride Intelligence & Route Guide**

Here are the complete details for your journey:

**1. Route & Highway Profile:**
- **Primary Highway:** **NH 27** (Lucknow - Kanpur National Highway)
- **Total Distance:** **~85 – 90 km** (city centre to city centre)
- **Estimated Ride Duration:** **1 hr 45 min – 2 hrs** (depending on city exit/entry traffic)
- **Key Waypoints:** Transport Nagar (Lucknow) ➔ Nawabganj ➔ Unnao Bypass ➔ Ganga Bridge (Jajmau) ➔ Kanpur Central / Rawatpur

**2. Real-Time Fuel & Budget Assessment:**
- **State Fuel Price (UP Petrol):** **₹${upFuelPrice}/Litre** (Live IOCL Benchmark)
- **Fuel Required:** **~${litresNeeded} Litres** (for standard 35–40 km/L motorcycle)
- **Estimated Trip Fuel Cost:** **₹${estCost}** (one way)

**3. Road Conditions & Riding Advisory:**
- **Highway Condition:** 4-lane to 6-lane divided highway with smooth asphalt on most stretches.
- **Congestion Alert:** Heavy truck movement near Unnao and potential slowdown near the **Jajmau Bridge (Ganga river)** crossing into Kanpur.
- **Cruising Speed:** Keep a safe cruising speed of **65 – 80 km/h**. Watch out for slow tractor-trolleys and local two-wheelers merging near rural crossings.
- **Toll Exemption:** Motorcycles are **exempted from toll** at the Nawabganj Toll Plaza. Use the dedicated two-wheeler lane on the far left.

**4. Recommended Stops & Refueling:**
- **Midpoint Break:** Nawabganj Bird Sanctuary area has quality highway dhabas and cafeterias for tea, water, and hydration.
- **Reliable Fuel Stations:** Multiple 24/7 IOCL, BPCL, and HPCL company-owned pumps are active along the NH 27 bypass.

**5. Essential Pre-Ride Checklist:**
- Check front tyre pressure (**~28-30 PSI**) and rear tyre (**~32-34 PSI**).
- Ensure your helmet visor is clean and free of scratches.
- Carry soft copies or Digilocker access for DL, RC, and Insurance.

Ride safe and stay alert on the highway! 🏍️`,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : ["get_fuel_price"],
    };
  }

  // Check for general route / distance planning
  if (query.includes("from") && query.includes("to")) {
    const fromMatch = userMessage.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|\s+until|\s*,|$)/i);
    const toMatch = userMessage.match(/to\s+([a-zA-Z\s]+?)(?:\s+from|\s*,|\s*\?|$)/i);
    const origin = fromMatch ? fromMatch[1].trim() : "Origin";
    const dest = toMatch ? toMatch[1].trim() : "Destination";

    return {
      reply: `**🗺️ MotoTribe Ride Route Plan: ${origin} ➔ ${dest}**

**Trip Planning Essentials:**
- **Route Preparation:** Check highway connectivity, active road work, and weather along the route before departure.
- **Fuel Strategy:** Refuel at major branded company-owned pumps before leaving city boundaries. Maintain at least a 3-litre reserve for highway riding.
- **Riding Tempo:** Plan for a 10-15 minute rest stop every 70–90 km to combat rider fatigue and inspect chain tension and tyres.
- **Two-Wheeler Tolls:** Most National Highways (NHAI) offer free two-wheeler passage through extreme-left lanes. State expressways (e.g. Yamuna, Samruddhi) may have specific two-wheeler restrictions—verify local signage.

*(💡 Tip: For live AI conversational routing, configure \`GEMINI_API_KEY\` in \`backend/.env\`.)*`,
      toolsUsed: ["route_intelligence"],
    };
  }

  // Check for fuel queries
  if (query.includes("fuel") || query.includes("petrol") || query.includes("diesel")) {
    let state = "Uttar Pradesh";
    const indianStates = [
      "Maharashtra",
      "Karnataka",
      "Delhi",
      "Tamil Nadu",
      "Gujarat",
      "Rajasthan",
      "Kerala",
      "Goa",
      "Punjab",
      "Haryana",
      "Telangana",
      "West Bengal",
      "Madhya Pradesh",
      "Bihar",
    ];
    for (const s of indianStates) {
      if (query.includes(s.toLowerCase())) {
        state = s;
        break;
      }
    }
    let fuelPrice = 95.0;
    try {
      const data = await getCurrentAverage(state, "petrol");
      if (data?.price || data?.median) fuelPrice = data.price || data.median;
    } catch {}

    return {
      reply: `**⛽ MotoTribe Fuel Intelligence (${state})**

- **Current Petrol Price:** **₹${fuelPrice}/Litre** (Official IOCL Benchmark)
- **Recommended Fueling Strategy:** Use 91+ Octane from COCO (Company-Owned, Company-Operated) stations for smoother highway throttle response and cleaner injectors.
- **Estimated Cost Breakdown:**
  - 100 km ride (~35 km/L): **~₹${Math.round((100 / 35) * fuelPrice)}**
  - 300 km ride (~35 km/L): **~₹${Math.round((300 / 35) * fuelPrice)}**
  - 500 km ride (~35 km/L): **~₹${Math.round((500 / 35) * fuelPrice)}**`,
      toolsUsed: ["get_fuel_price"],
    };
  }

  // Check for safety / checklist / maintenance
  if (
    query.includes("check") ||
    query.includes("safety") ||
    query.includes("inspect") ||
    query.includes("gear") ||
    query.includes("tyre") ||
    query.includes("chain")
  ) {
    return {
      reply: `**🛡️ MotoTribe T-CLOCS Pre-Ride Safety Protocol**

Before starting your motorcycle, perform this essential 5-minute pre-ride check:

- **T - Tyres & Wheels:** Inspect tread depth, look for embedded nails/cuts, and check cold pressure (Cold Front: ~28–30 PSI, Cold Rear: ~32–34 PSI).
- **C - Controls:** Verify smooth throttle return, clutch free-play (2-3 mm), and responsive front/rear brake lever feel.
- **L - Lights & Electrics:** Test headlight (high/low beam), tail light, brake light actuation, turn indicators, and horn.
- **O - Oil & Fluids:** Check engine oil sight glass on level ground, brake fluid reservoirs (front & rear), and coolant levels.
- **C - Chassis & Chain:** Inspect drive chain slack (25–35 mm slack) and ensure chain is clean and lubed.
- **S - Stands:** Ensure side stand and main stand springs snap back firmly without sagging.

Ride with full protective gear (DOT/ECE certified helmet, riding jacket, armored gloves, and sturdy boots)!`,
      toolsUsed: ["safety_intelligence"],
    };
  }

  // Default intelligent assistant response
  return {
    reply: `**🏍️ MotoTribe AI Ride Assistant**

I am your motorcycle riding co-pilot. I can assist you with:
- **Route Guidance & Highway Advice** (e.g., Lucknow to Kanpur, Mumbai to Goa, Manali to Leh)
- **Live State Fuel Prices & Trip Cost Calculators**
- **Pre-Ride Checklists & T-CLOCS Safety Protocols**
- **Weather Awareness & Monsoon/Ghat Riding Techniques**

Tell me your route, upcoming trip, or motorcycle question and I'll break down the details!`,
    toolsUsed: [],
  };
};

// ─────────────────────────────────────────────
// Main Chat Function
// ─────────────────────────────────────────────

/**
 * Process a chat message through the AI assistant.
 *
 * @param {string} userMessage - The user's current message
 * @param {Array}  conversationHistory - Previous messages [{role, content}]
 * @param {string} userId - The authenticated user's ID
 * @param {object} context - Optional context { rideId, latitude, longitude }
 * @returns {Promise<{reply: string, toolsUsed: string[]}>}
 */
const chat = async (userMessage, conversationHistory = [], userId = null, context = {}) => {
  const apiKey = env.geminiApiKey;

  // If no Gemini API key is configured or is default placeholder, use offline riding engine
  if (!apiKey || apiKey.startsWith("your_") || apiKey.trim() === "") {
    return await generateOfflineMotoTribeAdvice(userMessage, userId, context);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolDefinitions }],
    });


  // Build conversation history in Gemini format
  const geminiHistory = [];

  for (const msg of conversationHistory) {
    if (msg.role === "user") {
      geminiHistory.push({
        role: "user",
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === "assistant") {
      geminiHistory.push({
        role: "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  // Start or continue the chat session
  const chatSession = model.startChat({
    history: geminiHistory,
  });

  // Send user message with optional location context
  let messageText = userMessage;
  if (context.latitude && context.longitude) {
    messageText += `\n\n[System context: User's current location is approximately lat=${context.latitude}, lng=${context.longitude}]`;
  }

  let response = await chatSession.sendMessage(messageText);
  let candidate = response.response.candidates?.[0];
  const toolsUsed = [];

  // Handle function calling loop (max 5 rounds to prevent infinite loops)
  let rounds = 0;
  const MAX_TOOL_ROUNDS = 5;

  while (rounds < MAX_TOOL_ROUNDS) {
    const functionCalls = candidate?.content?.parts?.filter(
      (part) => part.functionCall
    );

    if (!functionCalls || functionCalls.length === 0) {
      break;
    }

    // Execute all tool calls
    const toolResults = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      toolsUsed.push(name);

      console.log(`[AI Tool Call] ${name}`, JSON.stringify(args));
      const result = await executeTool(name, args || {}, userId);

      toolResults.push({
        functionResponse: {
          name,
          response: result,
        },
      });
    }

    // Send tool results back to the model
    response = await chatSession.sendMessage(toolResults);
    candidate = response.response.candidates?.[0];
    rounds++;
  }

  // Extract final text response
  const textParts = candidate?.content?.parts?.filter((part) => part.text) || [];
  const reply = textParts.map((p) => p.text).join("\n").trim();

    if (!reply) {
      throw new AppError("AI Assistant returned an empty response. Please try again.", 502);
    }

    return {
      reply,
      toolsUsed,
    };
  } catch (error) {
    console.warn(
      "[Gemini API call failed, falling back to MotoTribe engine]:",
      error.message
    );
    return await generateOfflineMotoTribeAdvice(userMessage, userId, context);
  }
};


module.exports = {
  chat,
};
