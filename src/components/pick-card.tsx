'use client';

import { cn } from '@/lib/utils';

// Define interfaces for the component's props
interface Outcome {
  name: string;
  price: number;
}

interface Market {
  key: 'h2h'; // Only allow moneyline
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface Game {
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

interface Pick {
  team: string;
  price: number;
  bookmaker: string;
  market: 'h2h';
}

interface PickCardProps {
  game: Game;
  pick: Pick;
}

// A map to get display-friendly titles for bookmakers
const bookmakerTitles: { [key: string]: string } = {
  pinnacle: 'Pinnacle',
  betmgm: 'BetMGM',
  caesars: 'Caesars',
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  bovada: 'Bovada',
};

export function PickCard({ game, pick }: PickCardProps) {
  if (!pick || !game || !Array.isArray(game.bookmakers) || game.bookmakers.length === 0) {
    return (
      <div className="bg-card text-card-foreground rounded-lg shadow-md border p-4 w-full max-w-2xl mx-auto">
        <p className="text-center text-muted-foreground">No pick data available.</p>
      </div>
    );
  }

  const isPicked = (bookmaker: string, team: string) => {
    return pick.bookmaker === bookmaker && pick.team === team;
  };

  const { home_team, away_team } = game;

  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-md border p-4 w-full max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">{home_team} vs. {away_team}</p>
        <p className="font-bold text-lg text-card-foreground">Moneyline Odds</p>
      </div>
      
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 font-semibold text-sm text-muted-foreground border-b pb-2 mb-2">
        <div>Bookmaker</div>
        <div className="text-center">{home_team}</div>
        <div className="text-center">{away_team}</div>
      </div>

      {/* Odds Rows */}
      <div className="space-y-1">
        {game.bookmakers.map((bookie) => {
          const market = bookie.markets.find(m => m.key === 'h2h');
          if (!market) return null;

          const homeTeamOutcome = market.outcomes.find(o => o && o.name && o.name.trim().toLowerCase() === home_team.trim().toLowerCase());
          const awayTeamOutcome = market.outcomes.find(o => o && o.name && o.name.trim().toLowerCase() === away_team.trim().toLowerCase());

          // If either team doesn't have an outcome, don't render the row.
          if (!homeTeamOutcome || !awayTeamOutcome) return null;

          return (
            <div key={bookie.key} className="grid grid-cols-3 gap-2 items-center text-sm p-2 rounded-md hover:bg-muted/50">
              <div className="font-medium">{bookmakerTitles[bookie.key] || bookie.title}</div>
              <div className={cn(
                  "text-center p-1 rounded",
                  isPicked(bookie.key, home_team) ? "bg-primary text-primary-foreground font-bold ring-2 ring-ring" : "bg-muted text-muted-foreground"
              )}>
                {homeTeamOutcome.price}
              </div>
              <div className={cn(
                  "text-center p-1 rounded",
                  isPicked(bookie.key, away_team) ? "bg-primary text-primary-foreground font-bold ring-2 ring-ring" : "bg-muted text-muted-foreground"
              )}>
                {awayTeamOutcome.price}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 