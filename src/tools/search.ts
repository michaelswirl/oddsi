import { Tool } from "@langchain/core/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

interface SearchParams {
  query: string;
  startDate?: string;  // YYYY-MM-DD format
  endDate?: string;    // YYYY-MM-DD format
  includeDomains?: string[];  // Optional list of domains to search
}

export class EnhancedSearchTool extends Tool {
  name = "enhanced_search";
  description = `A powerful search tool that can find real-time or historical information about sports, betting, and general topics.
Input can be either a direct search query string or a JSON string with additional parameters:

Simple usage: "NBA Finals Game 1 results"

Advanced usage (JSON):
{
  "query": "Your search query (required)",
  "startDate": "YYYY-MM-DD (optional)",
  "endDate": "YYYY-MM-DD (optional)",
  "includeDomains": ["espn.com", "nba.com"] (optional)
}`;

  private tavily: TavilySearchResults;
  private defaultDomains = [
    "espn.com",
    "sports.yahoo.com",
    "cbssports.com",
    "nba.com",
    "nfl.com",
    "mlb.com",
    "vegasinsider.com",
    "actionnetwork.com",
    "covers.com"
  ];

  constructor(apiKey: string) {
    super();
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("EnhancedSearchTool requires a valid Tavily API key");
    }

    try {
      this.tavily = new TavilySearchResults({
        apiKey: apiKey.trim(),
        maxResults: 5,  // Reduced from 10 to get more focused results
        searchDepth: "basic",  // Changed to "basic" for faster results
        includeDomains: this.defaultDomains,
        includeAnswer: false
      });
      console.log("[EnhancedSearchTool] Initialized successfully with API key");
    } catch (error) {
      console.error("[EnhancedSearchTool] Initialization error:", error);
      throw new Error(`Failed to initialize Tavily search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async _call(input: string): Promise<string> {
    console.log("\n🔍 Search Request:", {
      input,
      defaultDomains: this.defaultDomains
    });

    try {
      let params: SearchParams;
      try {
        // Try parsing as JSON first
        params = JSON.parse(input);
        console.log("\n📝 Parsed JSON Parameters:", params);
      } catch (error) {
        // If not JSON, use as direct query with default domains
        params = { 
          query: input.trim(),
          includeDomains: this.defaultDomains
        };
        console.log("\n📝 Using Direct Query Parameters:", params);
      }

      // Validate query
      if (!params.query || params.query.trim() === "") {
        throw new Error("Search query cannot be empty");
      }

      // Validate and process dates
      if (params.startDate || params.endDate) {
        if (params.startDate && !this.isValidDate(params.startDate)) {
          throw new Error("Invalid startDate format. Use YYYY-MM-DD");
        }
        if (params.endDate && !this.isValidDate(params.endDate)) {
          throw new Error("Invalid endDate format. Use YYYY-MM-DD");
        }
      }

      // Construct search query
      let enhancedQuery = params.query;
      if (params.startDate || params.endDate) {
        const startDate = params.startDate || '2024-01-01';  // Default to recent if not specified
        const endDate = params.endDate || new Date().toISOString().split('T')[0];
        enhancedQuery = `${enhancedQuery} (date:${startDate}..${endDate})`;
      }

      console.log("\n🔎 Executing Search:", { 
        enhancedQuery,
        domains: params.includeDomains || this.defaultDomains,
        dateRange: params.startDate || params.endDate ? {
          start: params.startDate || '2024-01-01',
          end: params.endDate || new Date().toISOString().split('T')[0]
        } : undefined
      });

      // Execute search with retries
      let results;
      try {
        console.log("\n📡 Making Primary Search Request...");
        results = await this.tavily.invoke(enhancedQuery);
        console.log("\n✅ Primary Search Successful:", {
          resultCount: results?.length || 0
        });
      } catch (searchError) {
        console.error("\n⚠️ Primary Search Failed:", searchError);
        // Retry once with simplified query
        try {
          console.log("\n🔄 Attempting Retry with Simplified Query:", params.query.trim());
          results = await this.tavily.invoke(params.query.trim());
          console.log("\n✅ Retry Search Successful:", {
            resultCount: results?.length || 0
          });
        } catch (retryError) {
          console.error("\n❌ Retry Search Failed:", retryError);
          throw new Error(`Search failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }

      if (!results || results.length === 0) {
        console.log("\n⚠️ No Results Found");
        return "No relevant results found. Try rephrasing your query or removing date restrictions.";
      }

      // Format results
      const formattedResults = this.formatSearchResults(results);
      console.log("\n✅ Search Completed:", {
        resultCount: results.length,
        formattedLength: formattedResults.length
      });
      return formattedResults;

    } catch (error) {
      console.error("\n❌ Search Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return `Search error: ${errorMessage}. Please try again with a simpler query.`;
    }
  }

  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const isValid = date instanceof Date && !isNaN(date.getTime());
    
    if (!isValid) return false;
    
    // Additional validation for reasonable date range
    const now = new Date();
    const year = date.getFullYear();
    return year >= 2000 && year <= now.getFullYear();
  }

  private formatSearchResults(results: SearchResult[]): string {
    if (!Array.isArray(results)) {
      console.error("[EnhancedSearchTool] Invalid results format:", results);
      return "Error: Invalid search results format";
    }

    const formatted = results
      .filter(result => result.title && result.content) // Filter out invalid results
      .map((result, index) => {
        const date = result.publishedDate 
          ? ` (${new Date(result.publishedDate).toLocaleDateString()})`
          : '';
        
        // Clean and truncate content
        const cleanContent = result.content
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 300) + (result.content.length > 300 ? '...' : '');
        
        return `[${index + 1}] ${result.title}${date}\nSource: ${result.url}\n${cleanContent}`;
      })
      .join('\n\n');

    return formatted || "No valid results found. Try adjusting your search terms.";
  }
} 