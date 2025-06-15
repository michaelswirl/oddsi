import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query, ...params } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TAVILY_API_KEY not set in environment' }, { status: 500 });
    }
    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, ...params }),
    });
    const data = await tavilyRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Tavily API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 