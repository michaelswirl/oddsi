// --- API Keys and Base URLs ---
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// --- Tool Interface ---
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params?: any) => Promise<any>;
}

// --- Tool Definitions ---
export const tools: Record<string, Tool> = {
  listSports: {
    name: 'listSports',
    description: 'List all available sports and their keys from The Odds API.',
    parameters: {},
    execute: async () => {
      if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY is not set.');
      const res = await fetch(`${ODDS_API_BASE}/sports/?apiKey=${ODDS_API_KEY}`);
      if (!res.ok) throw new Error('Failed to fetch sports');
      return res.json();
    },
  },
  listOdds: {
    name: 'listOdds',
    description: 'List upcoming games and their odds for a given sport.',
    parameters: { sport: 'string' },
    execute: async (params = {}) => {
      const { sport } = params;
      if (!sport) throw new Error('Missing required parameter: sport');
      if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY is not set.');
      const url = `${ODDS_API_BASE}/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american`;
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch live odds: ${errorText}`);
      }
      const games = await res.json();
      return games.map((game: any) => ({
        gameId: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        bookmakers: game.bookmakers
          .filter((bookie: any) => ['pinnacle', 'draftkings', 'fanduel', 'betmgm', 'caesars', 'bovada'].includes(bookie.key))
          .map((bookie: any) => ({
            key: bookie.key,
            title: bookie.title,
            lastUpdate: bookie.last_update,
            markets: bookie.markets.map((market: any) => ({
              key: market.key,
              outcomes: market.outcomes,
            })),
          })),
      }));
    },
  },
  tavilySearch: {
    name: 'tavilySearch',
    description: 'Use Tavily Search API to research news, injuries, and narratives.',
    parameters: { query: 'string' },
    execute: async (params = {}) => {
      const { query } = params;
      if (!query) throw new Error('Missing required parameter: query');
      if (!TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is not set.');
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TAVILY_API_KEY}`,
        },
        body: JSON.stringify({ query: query, include_answer: true }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Tavily API error: ${errText}`);
      }
      return res.json();
    },
  },
};

export const executeTool = async (toolName: string, params: any) => {
  if (!tools[toolName]) {
    throw new Error(`Invalid tool specified: ${toolName}`);
  }
  return await tools[toolName].execute(params);
}; 