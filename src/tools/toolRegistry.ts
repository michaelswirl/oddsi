import { Tool } from "@langchain/core/tools";
import { StructuredTool } from "@langchain/core/tools";
import { Calculator } from "@langchain/community/tools/calculator";
import {
  GetSportsTool,
  GetLiveOddsTool,
  GetScoresTool,
  GetHistoricalOddsTool,
  GetEventOddsTool,
  GetEventsTool,
} from "./odds-api"; 
import {
  GetLeagueMetadataTool,
  GetTeamStatsTool,
  GetPlayerStatsTool,
  GetInjuryReportTool,
  GetStandingsTool,
  GetTeamsTool, 
} from "./sports-api";
import { EnhancedSearchTool } from "./search";

// Ensure all imported tools are correctly exported from their respective files.
// e.g., GetTeamsTool must be exported from ./sports-api.ts

export interface ApiKeyConfig {
  openai?: string; 
  odds?: string;
  sports?: string;
  tavily?: string;
}

export function getAvailableTools(config: ApiKeyConfig): (Tool | StructuredTool)[] {
  const tools: (Tool | StructuredTool)[] = [];

  if (!config.odds) {
    console.warn("⚠️ Odds API key not provided. Odds tools will be unavailable.");
  } else {
    tools.push(
      new GetSportsTool(config.odds),
      new GetLiveOddsTool(config.odds),
      new GetScoresTool(config.odds),
      new GetHistoricalOddsTool(config.odds),
      new GetEventOddsTool(config.odds),
      new GetEventsTool(config.odds)
    );
  }

  if (!config.sports) {
    console.warn("⚠️ Sports API key not provided. Sports data tools will be unavailable.");
  } else {
    tools.push(
      new GetLeagueMetadataTool(config.sports),
      new GetTeamStatsTool(config.sports),
      new GetPlayerStatsTool(config.sports),
      new GetInjuryReportTool(config.sports),
      new GetStandingsTool(config.sports),
      new GetTeamsTool(config.sports) 
    );
  }

  if (!config.tavily) {
    console.warn("⚠️ Tavily API key not provided. Enhanced search will be unavailable.");
  } else {
    tools.push(new EnhancedSearchTool(config.tavily));
  }

  tools.push(new Calculator()); // Calculator doesn't need an API key

  if (tools.length === 1 && tools[0] instanceof Calculator) {
    console.warn("⚠️ No API keys provided for any major tools. Only Calculator is available.");
  }
  
  console.log(`🛠️ [ToolRegistry] Initialized ${tools.length} tools.`);
  return tools;
}
