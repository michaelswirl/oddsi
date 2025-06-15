import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import type { Message } from 'ai';
import { executeTool } from '@/lib/mcp-utils';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

// Helper to get absolute base URL
function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000'
  );
}

// Define the functions for OpenAI with detailed descriptions and explicit parameters.
const functions: any = [
  {
    name: 'listSports',
    description: 'List all available sports and their keys. Use this to find the correct `sport_key` for other tools.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'listOdds',
    description: 'List upcoming games and their odds for a given sport. You must provide a valid `sport_key`.',
    parameters: {
      type: 'object',
      properties: {
        sport: {
          type: 'string',
          description: 'The sport key, e.g., `baseball_mlb`. Get valid keys from `listSports`.',
        },
      },
      required: ['sport'],
    },
  },
  {
    name: 'tavilySearch',
    description: 'Use Tavily Search API to research news, injuries, and narratives for teams, players, or matchups.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query, e.g., "latest injury report for the New York Mets".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'makeFinalRecommendation',
    description: 'This is the final step. Use this tool to present the final betting pick to the user. You MUST provide the full game odds object, the specific pick details, and the narrative rationale.',
    parameters: {
      type: 'object',
      properties: {
        game: {
          type: 'object',
          description: 'The complete game object from the `listOdds` tool, including all bookmakers.',
          properties: {
            id: { type: 'string' },
            sport_key: { type: 'string' },
            sport_title: { type: 'string' },
            commence_time: { type: 'string' },
            home_team: { type: 'string' },
            away_team: { type: 'string' },
            bookmakers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  title: { type: 'string' },
                  last_update: { type: 'string' },
                  markets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string' },
                        last_update: { type: 'string' },
                        outcomes: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              price: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          }
        },
        pick: {
          type: 'object',
          description: 'The specific pick details.',
          properties: {
            team: { type: 'string', description: 'The name of the team picked.' },
            price: { type: 'number', description: 'The odds for the picked team.' },
            bookmaker: { type: 'string', description: 'The key of the bookmaker offering the best odds, e.g., "pinnacle".' },
          },
        },
        narrative: {
          type: 'string',
          description: 'The detailed rationale for the pick, woven from research and analysis. Do not include a title or header.',
        },
      },
      required: ['game', 'pick', 'narrative'],
    },
  }
];

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  const conversationHistory: ChatCompletionMessageParam[] = messages.map(m => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }));
  
  const thinkingSteps: string[] = [];
  const maxToolCalls = 5;

  for (let i = 0; i < maxToolCalls; i++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: conversationHistory,
      functions,
      function_call: 'auto',
    });

    const choice = response.choices[0];
    const choiceMessage = choice.message;

    if (choice.finish_reason === 'function_call' && choiceMessage.function_call) {
      const { name, arguments: args } = choiceMessage.function_call;

      // If the model wants to make the final recommendation, we format a special response
      if (name === 'makeFinalRecommendation') {
        const parsedArgs = JSON.parse(args);
        return NextResponse.json({
          type: 'final_recommendation',
          data: {
            game: parsedArgs.game,
            pick: parsedArgs.pick,
            narrative: parsedArgs.narrative,
          },
        });
      }

      conversationHistory.push(choiceMessage);

      let stepDescription = '';
      if (name === 'listOdds') stepDescription = 'Shopping for the best lines...';
      if (name === 'tavilySearch') stepDescription = 'Researching team news and injuries...';
      if (stepDescription) {
        thinkingSteps.push(stepDescription);
      }

      try {
        const parsedArgs = JSON.parse(args);
        const toolResult = await executeTool(name, parsedArgs);
        conversationHistory.push({
          role: 'function',
          name: name,
          content: JSON.stringify(toolResult),
        });
      } catch (error) {
         conversationHistory.push({
          role: 'function',
          name: name,
          content: JSON.stringify({ error: 'Tool execution failed' }),
        });
      }
    } else {
      // Final response.
      return NextResponse.json({
        role: 'assistant',
        content: choiceMessage.content,
        thinking_steps: thinkingSteps,
      });
    }
  }

  // Fallback if the loop reaches max calls
  return NextResponse.json({
    role: 'assistant',
    content: "I've reached the maximum number of steps for my analysis."
  });
} 