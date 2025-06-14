import { Tool } from "@langchain/core/tools";
import { z } from "zod";

const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

// Common sport keys
const SPORT_KEYS = {
  NBA: "basketball_nba",
  NFL: "americanfootball_nfl",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  EPL: "soccer_epl",
  UFC: "mma_mixed_martial_arts",
};

// Validation schemas
const SportSchema = z.object({
  key: z.string(),
  group: z.string(),
  title: z.string(),
  description: z.string(),
  active: z.boolean(),
  has_outrights: z.boolean(),
});

const MarketOutcomeSchema = z.object({
  name: z.string(),
  price: z.number(),
  point: z.number().optional(),
  description: z.string().optional(),
});

const MarketSchema = z.object({
  key: z.string(),
  last_update: z.string(),
  outcomes: z.array(MarketOutcomeSchema),
});

const BookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  last_update: z.string(),
  markets: z.array(MarketSchema),
});

const GameOddsSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  sport_title: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(BookmakerSchema).optional(),
});

const ScoreSchema = z.object({
  name: z.string(),
  score: z.string(),
});

const GameScoreSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  sport_title: z.string(),
  commence_time: z.string(),
  completed: z.boolean(),
  home_team: z.string(),
  away_team: z.string(),
  scores: z.array(ScoreSchema).nullable(),
  last_update: z.string().nullable(),
});

// Event schema definition
const EventSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  sport_title: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
});

// Add retry logic helper
async function fetchWithRetry(url: string, apiKey: string, maxRetries = 3): Promise<any> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        throw new Error(`API Error: ${JSON.stringify(data.errors)}`);
      }

      return data;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Base class for all Odds API tools
abstract class OddsApiBaseTool extends Tool {
  protected apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  protected validateSportKey(sport: string): string {
    // Handle common variations
    const normalizedSport = sport.toLowerCase().trim();
    
    // Map common variations to correct keys
    const sportKeyMap: Record<string, string> = {
      'nba': SPORT_KEYS.NBA,
      'basketball': SPORT_KEYS.NBA,
      'nfl': SPORT_KEYS.NFL,
      'football': SPORT_KEYS.NFL,
      'mlb': SPORT_KEYS.MLB,
      'baseball': SPORT_KEYS.MLB,
      'nhl': SPORT_KEYS.NHL,
      'hockey': SPORT_KEYS.NHL,
      'epl': SPORT_KEYS.EPL,
      'premier league': SPORT_KEYS.EPL,
      'ufc': SPORT_KEYS.UFC,
      'mma': SPORT_KEYS.UFC
    };

    const sportKey = sportKeyMap[normalizedSport] || normalizedSport;

    // Validate the sport key
    if (!Object.values(SPORT_KEYS).includes(sportKey as any)) {
      throw new Error(
        `Invalid sport key: ${sport}. Valid keys are: ${Object.values(SPORT_KEYS).join(', ')}`
      );
    }

    return sportKey;
  }

  protected async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const toolName = this.name;
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      ...params
    });

    const url = `${ODDS_API_BASE_URL}${endpoint}?${queryParams}`;
    const maskedUrl = url.replace(this.apiKey, '***API_KEY***');
    console.log(`\n🔍 [${toolName}] Making API Request:
    URL: ${maskedUrl}
    Params: ${JSON.stringify(params, null, 2)}`);

    try {
      const data = await fetchWithRetry(url, this.apiKey);
      
      // Handle empty responses
      if (Array.isArray(data) && data.length === 0) {
        console.log(`\n⚠️ [${toolName}] No data found for ${endpoint.split('/')[2] || 'requested sport'}`);
        return { error: `No data found for ${endpoint.split('/')[2] || 'requested sport'}` };
      }

      console.log(`\n✅ [${toolName}] Success Response:
        Type: ${Array.isArray(data) ? 'array' : typeof data}
        Items: ${Array.isArray(data) ? data.length : 1}
        First Item Preview: ${JSON.stringify(Array.isArray(data) ? data[0] : data).slice(0, 200)}...`);
      
      return data;
    } catch (error) {
      console.error(`\n❌ [${toolName}] Request failed:`, error);
      return { error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}

// Tool for getting available sports
export class GetSportsTool extends OddsApiBaseTool {
  name = "get_sports";
  description = "Get a list of available sports for betting odds";

  constructor(apiKey: string) {
    super(apiKey);
  }

  schema = z
    .object({ input: z.string().optional() })
    .transform((obj) => obj.input);

  async _call(_input: string | undefined) {
    const sports = await this.makeRequest("/sports") as unknown;
    if (typeof sports === "object" && sports && "error" in (sports as any)) {
      return JSON.stringify(sports);
    }
    const activeSports = (sports as any[]).filter((s) => s.active);
    return JSON.stringify(z.array(SportSchema).parse(activeSports));
  }
}

// Tool for getting live odds
export class GetLiveOddsTool extends OddsApiBaseTool {
  name = "get_live_odds";
  description = "Get live betting odds for a specific sport. For sports with many daily games like MLB, this returns a limited set of results to prevent errors. If you need a specific game not in the results, try using get_events and get_event_odds.";

  constructor(apiKey: string) {
    super(apiKey);
  }

  schema = z
    .object({ input: z.string().optional() })
    .transform((obj) => obj.input);

  async _call(input: string | undefined) {
    console.log(`\n🎲 [GetLiveOdds] Processing request with input:`, input);
    
    if (!input) {
      console.error(`\n❌ [GetLiveOdds] No input provided`);
      throw new Error("Input is required for getting live odds");
    }

    try {
      let params: { sport: string; regions?: string; markets?: string; oddsFormat?: string };
      
      // Try parsing as JSON first, if it fails treat input as sport key
      try {
        params = JSON.parse(input);
        console.log(`\n📝 [GetLiveOdds] Parsed JSON parameters:`, params);
      } catch (e) {
        // If JSON parsing fails, treat input as the sport name
        params = { sport: input };
        console.log(`\n📝 [GetLiveOdds] Using input as sport key:`, params);
      }
      
      const sportKey = this.validateSportKey(params.sport);
      console.log(`\n✅ [GetLiveOdds] Validated sport key: ${sportKey}`);

      const odds = await this.makeRequest(`/sports/${sportKey}/odds`, {
        regions: params.regions || "us",
        markets: params.markets || "h2h,spreads,totals",
        oddsFormat: params.oddsFormat || "american",
        dateFormat: "iso",
      });

      if (typeof odds === "object" && odds && "error" in (odds as any)) {
        console.error(`\n❌ [GetLiveOdds] Error in response:`, odds.error);
        return JSON.stringify(odds);
      }

      console.log(`\n🎯 [GetLiveOdds] Validating response data...`);
      const parsed = z.array(GameOddsSchema).parse(odds as any[]);
      console.log(`\n✅ [GetLiveOdds] Successfully validated ${parsed.length} games`);
      
      // Truncate large responses to avoid context window errors
      if (parsed.length > 5) {
        console.log(`\n⚠️ [GetLiveOdds] Response has ${parsed.length} games. Truncating to the first 5.`);
        const truncated = parsed.slice(0, 5);
        return JSON.stringify(truncated);
      }
      
      return JSON.stringify(parsed);
    } catch (error) {
      console.error(`\n❌ [GetLiveOdds] Error processing request:`, error);
      throw error;
    }
  }
}

// Tool for getting live scores
export class GetScoresTool extends OddsApiBaseTool {
  name = "get_scores";
  description = "Get live and recent scores for a specific sport";

  constructor(apiKey: string) {
    super(apiKey);
  }

  schema = z
    .object({ input: z.string().optional() })
    .transform((obj) => obj.input);

  async _call(input: string | undefined) {
    console.log(`\n📊 [GetScores] Processing request with input:`, input);
    
    if (!input) {
      console.error(`\n❌ [GetScores] No input provided`);
      throw new Error("Input is required for getting scores");
    }

    try {
      let params: { sport: string; daysFrom?: string };
      
      // Try parsing as JSON first, if it fails treat input as sport key
      try {
        params = JSON.parse(input);
        console.log(`\n📝 [GetScores] Parsed JSON parameters:`, params);
      } catch (e) {
        // If JSON parsing fails, treat input as the sport name
        params = { sport: input };
        console.log(`\n📝 [GetScores] Using input as sport key:`, params);
      }

      const sportKey = this.validateSportKey(params.sport);
      console.log(`\n✅ [GetScores] Validated sport key: ${sportKey}`);

      const queryParams: Record<string, string> = {
        daysFrom: params.daysFrom?.toString() || "1",
      };

      const scores = await this.makeRequest(`/sports/${sportKey}/scores`, queryParams);
      if (typeof scores === "object" && scores && "error" in (scores as any)) {
        console.error(`\n❌ [GetScores] Error in response:`, scores.error);
        return JSON.stringify(scores);
      }

      console.log(`\n🎯 [GetScores] Validating response data...`);
      const parsed = z.array(GameScoreSchema).parse(scores as any[]);
      console.log(`\n✅ [GetScores] Successfully validated ${parsed.length} games`);

      return JSON.stringify(parsed);
    } catch (error) {
      console.error(`\n❌ [GetScores] Error processing request:`, error);
      throw error;
    }
  }
}

// Tool for getting historical odds
export class GetHistoricalOddsTool extends OddsApiBaseTool {
  name = "get_historical_odds";
  description = "Get historical betting odds for a specific sport and date";

  constructor(apiKey: string) {
    super(apiKey);
  }

  schema = z
    .object({ input: z.string().optional() })
    .transform((obj) => obj.input);

  async _call(input: string | undefined) {
    if (!input) {
      throw new Error("Input is required for getting historical odds");
    }
    const params = JSON.parse(input);
    const sportKey = this.validateSportKey(params.sport);

    const odds = await this.makeRequest(`/sports/${sportKey}/odds-history`, {
      date: params.date,
      regions: params.regions || "us",
      markets: params.markets || "h2h",
      oddsFormat: params.oddsFormat || "american",
    });
    if (typeof odds === "object" && odds && "error" in (odds as any)) {
      return JSON.stringify(odds);
    }

    // No zod validation here—just return raw JSON string
    return JSON.stringify(odds);
  }
}

// Tool for getting specific event odds
export class GetEventOddsTool extends OddsApiBaseTool {
  name = "get_event_odds";
  description = "Get detailed odds for a specific event including all available markets";

  constructor(apiKey: string) {
    super(apiKey);
  }

  schema = z
    .object({ input: z.string().optional() })
    .transform((obj) => obj.input);

  async _call(input: string | undefined) {
    if (!input) {
      throw new Error("Input is required for getting event odds");
    }
    const params = JSON.parse(input);
    const sportKey = this.validateSportKey(params.sport);

    const odds = await this.makeRequest(
      `/sports/${sportKey}/events/${params.eventId}/odds`,
      {
        regions: params.regions || "us",
        markets: params.markets || "h2h,spreads,totals",
        oddsFormat: params.oddsFormat || "american",
      }
    );
    if (typeof odds === "object" && odds && "error" in (odds as any)) {
      return JSON.stringify(odds);
    }

    // The API returns an array of one object for that event
    const arr = z.array(GameOddsSchema).parse(odds as any[]);
    return JSON.stringify(arr[0]);
  }
}

// Tool for getting upcoming events
export class GetEventsTool extends OddsApiBaseTool {
  name = "get_events";
  description = "Get a list of upcoming events for a specific sport";
  
  schema = z.object({
    input: z.string().optional(),
  }).transform((obj) => obj.input);

  async _call(input: string | undefined) {
    console.log(`\n📅 [GetEvents] Processing request with input:`, input);
    
    if (!input) {
      console.error(`\n❌ [GetEvents] No input provided`);
      return JSON.stringify({ error: "Input is required for getting events" });
    }

    try {
      let params: { sport: string; commenceTimeFrom?: string; commenceTimeTo?: string };
      
      // Try parsing as JSON first, if it fails treat input as sport key
      try {
        params = input.startsWith("{") ? JSON.parse(input) : { sport: input };
        console.log(`\n📝 [GetEvents] Parsed parameters:`, params);
      } catch (error) {
        console.error(`\n❌ [GetEvents] Invalid input:`, error);
        return JSON.stringify({ error: "Invalid input format. Expected JSON string or sport key." });
      }

      try {
        const sportKey = this.validateSportKey(params.sport);
        console.log(`\n✅ [GetEvents] Validated sport key: ${sportKey}`);
        
        const queryParams: Record<string, string> = {};
        if (params.commenceTimeFrom) queryParams.commenceTimeFrom = params.commenceTimeFrom;
        if (params.commenceTimeTo) queryParams.commenceTimeTo = params.commenceTimeTo;

        const result = await this.makeRequest(`/sports/${sportKey}/events`, queryParams);
        
        // Check if result contains an error
        if ('error' in result) {
          console.error(`\n❌ [GetEvents] Error in response:`, result.error);
          return JSON.stringify(result);
        }
        
        // Validate the response against the EventSchema
        console.log(`\n🎯 [GetEvents] Validating response data...`);
        const validatedEvents = z.array(EventSchema).parse(result);
        if (validatedEvents.length === 0) {
          console.log(`\n⚠️ [GetEvents] No upcoming events found for ${sportKey}`);
          return JSON.stringify({ error: `No upcoming events found for ${sportKey}` });
        }
        
        console.log(`\n✅ [GetEvents] Found ${validatedEvents.length} events for ${sportKey}`);
        return JSON.stringify(validatedEvents);
      } catch (error) {
        console.error(`\n❌ [GetEvents] Processing error:`, error);
        return JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Failed to process request'
        });
      }
    } catch (error) {
      console.error(`\n❌ [GetEvents] Error processing request:`, error);
      return JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process request'
      });
    }
  }
}

// Export common sport keys and tools
export { SPORT_KEYS };

// Export a function to create all tools with a single API key
export function createOddsApiTools(apiKey: string) {
  return {
    getSportsTool: new GetSportsTool(apiKey),
    getLiveOddsTool: new GetLiveOddsTool(apiKey),
    getScoresTool: new GetScoresTool(apiKey),
    getHistoricalOddsTool: new GetHistoricalOddsTool(apiKey),
    getEventOddsTool: new GetEventOddsTool(apiKey),
    getEventsTool: new GetEventsTool(apiKey),
  };
}
