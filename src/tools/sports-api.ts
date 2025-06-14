// Shared base class (optional)
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Sport type for type safety
type SupportedSport = 'nba' | 'nfl' | 'mlb';
type SportApiMap = {
  [K in SupportedSport]: string;
};

// League IDs for each sport
const LEAGUE_IDS = {
  nba: 'standard',  // NBA League ID
  nfl: 1,  // NFL League ID
  mlb: 1   // MLB League ID
} as const;

interface LeagueMetadata {
  league: {
    id: number;
    name: string;
  };
  country: {
    name: string;
  };
  sport: {
    name: string;
    id: number;
  };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
    coverage: {
      fixtures: boolean;
      standings: boolean;
      players: boolean;
      injuries: boolean;
      odds: boolean;
    };
    id?: number;
  }>;
}

interface TeamStats {
  points_per_game: number;
  win_rate: number;
  last_10_record?: string;
}

interface PlayerStats {
  name: string;
  position: string;
  minutes_per_game: number;
  points_per_game: number;
  status: string;
  injury_notes?: string;
}

const sportMap: SportApiMap = {
  nba: 'nba',  // Changed from 'basketball' to 'nba'
  nfl: 'american-football',
  mlb: 'baseball'
};

function normalizeSportKey(sport: string): string {
  const key = sport.toLowerCase().trim();
  const sportKeyMap: Record<string, SupportedSport> = {
    // Odds API formats -> Sports API formats
    'basketball_nba': 'nba',
    'americanfootball_nfl': 'nfl',
    'baseball_mlb': 'mlb',

    // Common names
    'basketball': 'nba',
    'football': 'nfl',
    'baseball': 'mlb',

    // Already correct formats
    'nba': 'nba',
    'nfl': 'nfl',
    'mlb': 'mlb',
  };
  return sportKeyMap[key] || key; // Return mapped key or original if not found
}

function validateSport(sport: string): asserts sport is SupportedSport {
  if (!Object.keys(sportMap).includes(sport)) {
    throw new Error(`Unsupported sport: ${sport}. Supported sports are: ${Object.keys(sportMap).join(', ')}`);
  }
}

function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() is 0-indexed
  // NBA season runs from Oct to June. If we are before October, it's the previous year's season.
  return month < 10 ? year - 1 : year;
}

async function fetchFromApi(url: string, apiKey: string, timeout = 15000) {
  if (!apiKey) throw new Error('API key is required');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`\n⏰ [API Timeout] Request to ${url} timed out after ${timeout / 1000}s`);
    controller.abort();
  }, timeout);

  try {
    console.log(`\n🔍 API Request: ${url.replace(apiKey, '***API_KEY***')}`);
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
      },
      signal: controller.signal,
    });

    const responseData = await response.text();
    
    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`);
    console.log(`\n📦 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.log(`\n❌ Error Response:`, responseData);
      const error = responseData || 'Unknown error';
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    
    const data = JSON.parse(responseData);

    if (data.errors && Object.keys(data.errors).length > 0 && !Array.isArray(data.errors)) {
      console.log(`\n❌ API Error in Response:`, JSON.stringify(data.errors));
      throw new Error(`API returned an error: ${JSON.stringify(data.errors)}`);
    }
    
    if (!data || !data.response) {
      console.log(`\n⚠️ Invalid Response Format:`, JSON.stringify(data, null, 2));
      throw new Error('Invalid API response format');
    }

    console.log(`\n✅ Success Response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds.`);
    }
    throw error; // Re-throw other errors
  } finally {
    clearTimeout(timeoutId);
  }
}

// Add retry logic helper
async function fetchWithRetry(url: string, apiKey: string, maxRetries = 3): Promise<any> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'x-apisports-key': apiKey
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

// ----------------------
// GetLeagueMetadataTool
// ----------------------
class GetLeagueMetadataTool extends StructuredTool {
  name = "get_league_metadata";
  description = "Get league and season metadata for a given sport.";

  schema = z.object({
    sport: z.string().describe("The sport key, e.g., 'nba', 'nfl', 'mlb'.")
  });

  constructor(private apiKey: string) { 
    super();
    if (!apiKey) throw new Error('API key is required for GetLeagueMetadataTool');
  }

  async _call({ sport }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const normalizedSport = normalizeSportKey(sport);
      validateSport(normalizedSport);
      
      if (normalizedSport === 'nba') {
        const season = getCurrentSeason();
        const url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/standings?league=${LEAGUE_IDS[normalizedSport]}&season=${season}`;
        const data = await fetchFromApi(url, this.apiKey);
        
        if (!data.response) {
          return `No data found for NBA (League ID: ${LEAGUE_IDS[normalizedSport]})`;
        }
        
        return `League: NBA | League ID: ${LEAGUE_IDS[normalizedSport]} | Season: ${season} | Current Season`;
      }
      
      const url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/leagues`;
      const data = await fetchFromApi(url, this.apiKey);

      const relevantLeagues: LeagueMetadata[] = data.response.filter(
        (l: LeagueMetadata) => l.sport.name.toLowerCase() === sportMap[normalizedSport]
      );
      
      if (!relevantLeagues || relevantLeagues.length === 0) {
        return `No leagues found for ${normalizedSport.toUpperCase()}.`;
      }

      return relevantLeagues
        .map(l => {
          const currentSeason = l.seasons.find(s => s.current) || l.seasons[0];
          return `League: ${l.league.name} | League ID: ${l.league.id} | Season: ${currentSeason?.year} | Season ID: ${currentSeason?.id || 'N/A'}`;
        })
        .join("\n");
    } catch (error) {
      if (error instanceof Error) {
        return `Error getting league metadata: ${error.message}`;
      }
      return 'Unknown error occurred while getting league metadata';
    }
  }
}

// ----------------------
// GetTeamStatsTool
// ----------------------
class GetTeamStatsTool extends StructuredTool {
  name = "get_team_stats";
  description = "Get summary statistics for a team (PPG, win rate, etc.). You MUST have a team_id from the `get_teams` tool to use this.";

  schema = z.object({
    sport: z.string().describe("The sport key, e.g., 'nba', 'nfl', 'mlb'."),
    team_id: z.number().describe("The numerical ID of the team from the `get_teams` tool.")
  });

  constructor(private apiKey: string) { 
    super();
    if (!apiKey) throw new Error('API key is required for GetTeamStatsTool');
  }

  async _call({ sport, team_id }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const normalizedSport = normalizeSportKey(sport);
      validateSport(normalizedSport);
      const season = getCurrentSeason();
      
      const url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/teams/statistics?id=${team_id}&season=${season}`;
      
      console.log(`\n🔍 [GetTeamStats] Making request to: ${url.replace(this.apiKey, '***API_KEY***')}`);
      
      const data = await fetchFromApi(url, this.apiKey);
      
      // The API returns an array in the `response` field.
      // Check if it's a valid array with at least one entry.
      if (!data || !Array.isArray(data.response) || data.response.length === 0) {
        console.log(`\n❌ Invalid or empty response format for team stats:`, data);
        return `No statistics found for team ID: ${team_id}. The API response was empty or invalid.`;
      }

      console.log(`\n📊 Full API Response:`, JSON.stringify(data, null, 2));
      
      // The stats object is the first element in the response array.
      const stats = data.response[0];
      
      if (!stats) {
        console.log(`\n⚠️ Missing stats object in response array for team ID: ${team_id}`);
        return `No statistics found for team ID: ${team_id}. API Response: ${JSON.stringify(data)}`;
      }

      const games = stats.games;
      
      // The API for team statistics doesn't provide a reliable team name or win/loss record.
      // That data should be gathered from `get_teams` and `get_standings`.
      // This tool will now return only the stats it can reliably source.
      const teamStats = {
        games_played: games || 'N/A',
        points_per_game: (stats.points && games) ? (stats.points / games).toFixed(1) : 'N/A',
        field_goals_made_per_game: (stats.fgm && games) ? (stats.fgm / games).toFixed(1) : 'N/A',
        field_goal_percentage: stats.fgp || 'N/A',
        free_throw_percentage: stats.ftp || 'N/A',
        three_point_percentage: stats.tpp || 'N/A',
        rebounds_per_game: (stats.totReb && games) ? (stats.totReb / games).toFixed(1) : 'N/A',
        assists_per_game: (stats.assists && games) ? (stats.assists / games).toFixed(1) : 'N/A',
        steals_per_game: (stats.steals && games) ? (stats.steals / games).toFixed(1) : 'N/A',
        turnovers_per_game: (stats.turnovers && games) ? (stats.turnovers / games).toFixed(1) : 'N/A',
      };

      return JSON.stringify(teamStats, null, 2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`\n❌ [GetTeamStats] Error:`, error);
      return `Error getting team stats: ${errorMessage}. Please check the API response for more details.`;
    }
  }
}

// ----------------------
// GetPlayerStatsTool
// ----------------------
class GetPlayerStatsTool extends StructuredTool {
  name = "get_player_stats";
  description = "Get basic player stats. Can specify a player or get league leaders.";

  schema = z.object({
    sport: z.string().describe("The sport key, e.g., 'nba', 'nfl', 'mlb'."),
    player: z.string().optional().describe("The full name of the player to search for. If omitted, will return league leaders.")
  });

  constructor(private apiKey: string) { 
    super();
    if (!apiKey) throw new Error('API key is required for GetPlayerStatsTool');
  }

  async _call({ sport, player }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const normalizedSport = normalizeSportKey(sport);
      const season = getCurrentSeason();
      validateSport(normalizedSport);
      
      if (!player) {
        const url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/players/statistics?league=${LEAGUE_IDS[normalizedSport]}&season=${season}`;
        const data = await fetchFromApi(url, this.apiKey);
        
        const leaders = data.response?.slice(0, 5)?.map((p: PlayerStats) => 
          `${p.name}: ${p.points_per_game?.toFixed(1) || 'N/A'} PPG, ${p.minutes_per_game?.toFixed(1) || 'N/A'} MPG`
        );
        
        if (!leaders || leaders.length === 0) {
          return "No player statistics available.";
        }
        
        return `Top Scorers:\n${leaders.join('\n')}`;
      }
      
      const url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/players/statistics?league=${LEAGUE_IDS[normalizedSport]}&season=${season}&player=${encodeURIComponent(player)}`;
      const data = await fetchFromApi(url, this.apiKey);

      const playerStats: PlayerStats = data.response?.[0]?.statistics;
      if (!playerStats) {
        return `No statistics found for player: ${player}`;
      }

      return `${player} Stats:\nPPG: ${playerStats.points_per_game?.toFixed(1) || 'N/A'}\nMinutes: ${playerStats.minutes_per_game?.toFixed(1) || 'N/A'}\nStatus: ${playerStats.status || 'Unknown'}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error getting player stats: ${error.message}`;
      }
      return 'Unknown error occurred while getting player stats';
    }
  }
}

// ----------------------
// GetInjuryReportTool
// ----------------------
class GetInjuryReportTool extends StructuredTool {
  name = "get_injury_report";
  description = "Get injury report for a team or league. NOTE: This tool does not support NBA. For other sports, use the `enhanced_search` tool.";

  schema = z.object({
    sport: z.string().describe("The sport key, e.g., 'nfl', 'mlb'."),
    team_id: z.number().optional().describe("The numerical ID of the team. If omitted, returns league-wide injuries.")
  });

  constructor(private apiKey: string) { 
    super();
    if (!apiKey) throw new Error('API key is required for GetInjuryReportTool');
  }

  async _call({ sport, team_id }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const normalizedSport = normalizeSportKey(sport);
      validateSport(normalizedSport);

      if (normalizedSport === 'nba') {
        return "This tool does not support NBA injuries. Use the `enhanced_search` tool to find NBA injury news. For example, search for 'Lakers injury report'.";
      }
      
      const url = team_id 
        ? `https://v2.${sportMap[normalizedSport]}.api-sports.io/injuries?league=${LEAGUE_IDS[normalizedSport]}&team=${team_id}`
        : `https://v2.${sportMap[normalizedSport]}.api-sports.io/injuries?league=${LEAGUE_IDS[normalizedSport]}`;
      
      const data = await fetchFromApi(url, this.apiKey);

      const injuries = data.response?.map((p: PlayerStats) => 
        `- ${p.name} (${p.position || 'N/A'}): ${p.injury_notes || 'No details'}`
      );

      if (!injuries || injuries.length === 0) {
        return team_id ? "No injuries reported for this team." : "No injuries reported in the league.";
      }

      return injuries.join("\n");
    } catch (error) {
      if (error instanceof Error) {
        return `Error getting injury report: ${error.message}`;
      }
      return 'Unknown error occurred while getting injury report';
    }
  }
}

// ----------------------
// GetStandingsTool
// ----------------------
class GetStandingsTool extends StructuredTool {
  name = "get_standings";
  description = "Get current league standings for a given sport.";

  schema = z.object({
    sport: z.string().describe("The sport key, e.g., 'nba', 'nfl', 'mlb'.")
  });

  constructor(private apiKey: string) {
    super();
    if (!apiKey) throw new Error('API key is required for GetStandingsTool');
  }

  async _call({ sport }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const season = getCurrentSeason();
      const normalizedSport = normalizeSportKey(sport);
      validateSport(normalizedSport);
      
      const leagueId = LEAGUE_IDS[normalizedSport];
      const sportEndpoint = sportMap[normalizedSport];

      const url = `https://v2.${sportEndpoint}.api-sports.io/standings?league=${leagueId}&season=${season}`;
      const data = await this.makeRequest(sportEndpoint, url);

      if (!data.response || data.response.length === 0) {
        return JSON.stringify({ error: "No standings data available" });
      }

      // The API response for standings is a flat array of teams.
      const standingsData = data.response;

      const standings = standingsData.map((teamData: any) => {
        const team = teamData.team;
        const conference = teamData.conference;
        const wins = teamData.win;
        const losses = teamData.loss;
        
        return {
          rank: conference.rank,
          team: team.name,
          played: wins.total + losses.total,
          won: wins.total,
          lost: losses.total,
          form: `W${wins.lastTen}-L${losses.lastTen} (Last 10)`
        };
      });

      return JSON.stringify(standings, null, 2);
    } catch (error) {
      console.error(`❌ [GetStandings] Error in _call:`, error);
      return JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error
      });
    }
  }

  private async makeRequest(sport: string, url: string): Promise<any> {
    console.log(`🔍 [GetStandings] API Request: ${url}`);
    
    try {
      const data = await fetchFromApi(url, this.apiKey);
      console.log(`✅ [GetStandings] Success Response:`, data);
      return data;
    } catch (error) {
      console.error(`❌ [GetStandings] Error:`, error);
      throw error;
    }
  }
}

// ----------------------
// GetTeamsTool
// ----------------------
class GetTeamsTool extends StructuredTool {
  name = "get_teams";
  description = "Get a list of teams and their IDs for a specific sport. Can be used to find a specific team by name.";

  schema = z.object({
    sport: z.string().describe("The sport key, e.g., 'nba', 'nfl', 'mlb'."),
    search: z.string().optional().describe("The name of the team to search for (e.g., 'Lakers', 'Patriots').")
  });

  constructor(private apiKey: string) {
    super();
    if (!apiKey) throw new Error('API key is required for GetTeamsTool');
  }

  async _call({ sport, search }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const normalizedSport = normalizeSportKey(sport);
      validateSport(normalizedSport);
      
      let url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/teams?league=standard`;
      if (search) {
        url = `https://v2.${sportMap[normalizedSport]}.api-sports.io/teams?search=${encodeURIComponent(search)}`;
      }
      
      const data = await fetchFromApi(url, this.apiKey);

      if ((!data.response || data.response.length === 0) && data.results === 0) {
        const forTeam = search ? ` for team "${search}"` : "";
        return `No teams found for ${normalizedSport.toUpperCase()}${forTeam}`;
      }

      const teams = data.response.map((team: any) => ({
        id: team.id,
        name: team.name,
        code: team.code || 'N/A',
        city: team.city || 'N/A'
      }));

      return JSON.stringify(teams, null, 2);
    } catch (error) {
      if (error instanceof Error) {
        return `Error getting teams: ${error.message}`;
      }
      return 'Unknown error occurred while getting teams';
    }
  }
}

// Export all tools
export {
  GetLeagueMetadataTool,
  GetTeamStatsTool,
  GetPlayerStatsTool,
  GetInjuryReportTool,
  GetStandingsTool,
  GetTeamsTool
};
