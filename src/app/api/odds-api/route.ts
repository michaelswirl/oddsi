import { NextResponse } from 'next/server';

const SPORT_MAPPING: { [key: string]: string } = {
  'nba': 'basketball_nba',
  'nfl': 'americanfootball_nfl',
  'mlb': 'baseball_mlb',
  'nhl': 'icehockey_nhl',
  'soccer': 'soccer',
};

const VALID_MARKETS = ['h2h', 'spreads', 'totals'];

/**
 * Odds API route
 * Query params:
 *   - sport: abbreviation (e.g. nba)
 *   - markets: comma-separated (e.g. h2h,spreads)
 *   - includeLinks: 'true' or 'false' (default: true) - whether to include bookmaker URLs in the response
 */
export async function GET(request: Request) {
  try {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      console.error('API key not found in environment variables');
      return NextResponse.json({ error: 'API key not found' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport')?.toLowerCase() || 'nba';
    const markets = searchParams.get('markets')?.toLowerCase() || 'h2h';
    const includeLinks = searchParams.get('includeLinks') !== 'false'; // default true

    console.log('Request params:', { sport, markets, includeLinks });

    const mappedSport = SPORT_MAPPING[sport];
    if (!mappedSport) {
      console.error('Invalid sport:', sport);
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 });
    }

    // Validate markets
    const requestedMarkets = markets.split(',').map(m => m.trim());
    const invalidMarkets = requestedMarkets.filter(m => !VALID_MARKETS.includes(m));
    if (invalidMarkets.length > 0) {
      console.error('Invalid markets:', invalidMarkets);
      return NextResponse.json({ error: `Invalid markets: ${invalidMarkets.join(', ')}` }, { status: 400 });
    }

    // Always request American odds format and both US and EU regions
    const apiUrl = `https://api.the-odds-api.com/v4/sports/${mappedSport}/odds/?apiKey=${apiKey}&regions=us,eu&markets=${markets}&oddsFormat=american`;
    console.log('Fetching from:', apiUrl);

    const res = await fetch(apiUrl);
    const responseText = await res.text();
    
    if (!res.ok) {
      console.error('API Error:', {
        status: res.status,
        statusText: res.statusText,
        response: responseText
      });
      return NextResponse.json({ 
        error: `Error fetching odds: ${res.statusText}`,
        details: responseText
      }, { status: res.status });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse API response:', responseText);
      return NextResponse.json({ error: 'Invalid response from odds API' }, { status: 500 });
    }

    // Filter bookmakers: keep Pinnacle and all non-EU-only books
    const EU_ONLY_BOOKS = [
      'betfair', 'bet365', 'unibet', 'williamhill', 'ladbrokes', 'bwin', '10bet', 'betsson', 'betway', '888sport', 'coral', 'leovegas', 'mrgreen', 'redbet', 'coolbet', 'betfred', 'matchbook', 'sportingbet', 'parimatch', 'marathonbet', 'vbet', 'stoiximan', 'efbet', 'betclic', 'bet-at-home', 'interwetten', 'tipico', 'winamax', 'betdaq', 'expekt', 'energybet', 'favbet', 'merkur', 'novibet', 'pokerstars', 'sbobet', 'sportpesa', 'superbet', 'tipwin', 'totolotek', 'toto', 'youwin'
    ];
    if (Array.isArray(data)) {
      data = data.map((event: any) => ({
        ...event,
        bookmakers: event.bookmakers.filter((bm: any) =>
          bm.key === 'pinnacle' || !EU_ONLY_BOOKS.includes(bm.key)
        )
      }));
    }

    // Debug: log the first event's first bookmaker object
    if (Array.isArray(data) && data.length > 0 && data[0].bookmakers && data[0].bookmakers.length > 0) {
      console.log('First bookmaker object:', data[0].bookmakers[0]);
    }

    // If includeLinks is false, remove bookmaker.url from each bookmaker
    if (!includeLinks && Array.isArray(data)) {
      data = data.map((event: any) => ({
        ...event,
        bookmakers: event.bookmakers?.map((bm: any) => {
          const { url, ...rest } = bm;
          return rest;
        }) || []
      }));
    }

    console.log('API Response:', {
      status: res.status,
      dataLength: Array.isArray(data) ? data.length : 'not an array'
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 