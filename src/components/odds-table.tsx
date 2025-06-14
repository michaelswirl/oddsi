"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Check, ChevronDown } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type OddsData = {
  id: string
  sport_title: string
  home_team: string
  away_team: string
  bookmakers: {
    key: string
    title: string
    markets: {
      key: string
      outcomes: {
        name: string
        price: number
        point?: number
      }[]
    }[]
    url?: string
  }[]
  commence_time: string
}

const SPORTS = [
  { id: 'nba', name: 'NBA' },
  { id: 'nfl', name: 'NFL' },
  { id: 'mlb', name: 'MLB' },
  { id: 'nhl', name: 'NHL' },
  { id: 'soccer', name: 'Soccer' },
]

const MARKETS = [
  { id: 'h2h', name: 'Money Line' },
  { id: 'spreads', name: 'Spread' },
  { id: 'totals', name: 'Totals' },
]

function SortableBadge({ market, isSelected, onClick }: { market: typeof MARKETS[0], isSelected: boolean, onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: market.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        className="cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Badge
        variant={isSelected ? "default" : "outline"}
        className="cursor-pointer"
        onClick={onClick}
      >
        {market.name}
      </Badge>
    </div>
  )
}

function MultiSelect({ options, selected, onChange }: { options: { key: string, title: string }[], selected: string[], onChange: (selected: string[]) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center border rounded px-3 py-2 min-w-[160px] bg-white"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate flex-1 text-left">
          {selected.length === 0 ? "Select sportsbooks" : selected.length === options.length ? "All Sportsbooks" : options.filter(o => selected.includes(o.key)).map(o => o.title).join(", ")}
        </span>
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <button
              className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
              onClick={() => onChange(options.map(o => o.key))}
            >
              <span className="flex items-center">
                <Check className={`mr-2 h-4 w-4 ${selected.length === options.length ? '' : 'invisible'}`} />
                All
              </span>
            </button>
          </div>
          {options.map(option => (
            <button
              key={option.key}
              className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
              onClick={() => {
                if (selected.includes(option.key)) {
                  onChange(selected.filter(k => k !== option.key))
                } else {
                  onChange([...selected, option.key])
                }
              }}
            >
              <span className="flex items-center">
                <Check className={`mr-2 h-4 w-4 ${selected.includes(option.key) ? '' : 'invisible'}`} />
                {option.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatPlus(val: string) {
  if (val === '—' || val === 'N/A') return val;
  const num = Number(val);
  if (!isNaN(num) && num > 0) return `+${val}`;
  return val;
}

function getHighlightClass(val: string, pinVal: string, type: 'price' | 'point', side: 'home' | 'away' | 'over' | 'under') {
  if (val === '—' || val === 'N/A' || pinVal === '—' || pinVal === 'N/A') return '';
  if (val === pinVal) return '';
  const num = Number(val);
  const pinNum = Number(pinVal);
  if (isNaN(num) || isNaN(pinNum)) return '';
  if (type === 'price') {
    // For price: better for user is higher for positive odds, less negative for negative odds
    if (pinNum > 0 && num > pinNum) return 'bg-green-100 text-green-800'; // better positive
    if (pinNum > 0 && num < pinNum) return 'bg-red-100 text-red-800'; // worse positive
    if (pinNum < 0 && num > pinNum) return 'bg-green-100 text-green-800'; // less negative is better
    if (pinNum < 0 && num < pinNum) return 'bg-red-100 text-red-800'; // more negative is worse
  } else if (type === 'point') {
    // For point: depends on side
    if (side === 'home' || side === 'over') {
      if (num > pinNum) return 'bg-green-100 text-green-800';
      if (num < pinNum) return 'bg-red-100 text-red-800';
    } else if (side === 'away' || side === 'under') {
      if (num < pinNum) return 'bg-green-100 text-green-800';
      if (num > pinNum) return 'bg-red-100 text-red-800';
    }
  }
  return '';
}

export function OddsTable() {
  const [odds, setOdds] = useState<OddsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState('nba')
  const [selectedMarket, setSelectedMarket] = useState('h2h')
  const [orderedMarkets] = useState(MARKETS)
  const [selectedSportsbooks, setSelectedSportsbooks] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const ALLOWED_BOOK_KEYS = [
    'pinnacle',
    'betonlineag',
    'fanduel',
    'draftkings',
    'fanatics',
    'caesars',
    'betmgm',
  ];

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/odds-api?sport=${selectedSport}&markets=${selectedMarket}&includeLinks=true`)
        if (!response.ok) {
          throw new Error('Failed to fetch odds')
        }
        const data = await response.json()
        setOdds(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchOdds()
  }, [selectedSport, selectedMarket])

  // Get all unique bookmaker keys and titles (with url) from the odds data
  const allBookmakers = React.useMemo(() => {
    const map = new Map<string, { key: string; title: string; url?: string }>();
    odds.forEach(event => {
      event.bookmakers.forEach(bm => {
        if (!map.has(bm.key) && ALLOWED_BOOK_KEYS.includes(bm.key)) {
          map.set(bm.key, { key: bm.key, title: bm.title, url: bm.url });
        }
      });
    });
    // Sort so Pinnacle is first
    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.key === 'pinnacle' ? -1 : b.key === 'pinnacle' ? 1 : 0));
    return arr;
  }, [odds]);

  // Set all as default selected when odds load
  React.useEffect(() => {
    if (allBookmakers.length > 0 && selectedSportsbooks.length === 0) {
      setSelectedSportsbooks(allBookmakers.map(bm => bm.key))
    }
  }, [allBookmakers, selectedSportsbooks.length])

  if (loading) {
    return <div>Loading odds...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Odds</CardTitle>
        <div className="flex gap-4 flex-wrap">
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((sport) => (
                <SelectItem key={sport.id} value={sport.id}>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              {MARKETS.map((market) => (
                <SelectItem key={market.id} value={market.id}>
                  {market.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MultiSelect
            options={allBookmakers}
            selected={selectedSportsbooks}
            onChange={setSelectedSportsbooks}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sport</TableHead>
                <TableHead>Home Team</TableHead>
                <TableHead>Away Team</TableHead>
                <TableHead>Side</TableHead>
                {allBookmakers.filter(bm => selectedSportsbooks.includes(bm.key)).map(bm => (
                  <TableHead key={bm.key} className={`text-center${bm.key === 'pinnacle' ? ' bg-yellow-50' : ''}`}>{/* highlight Pinnacle */}
                    {bm.url ? (
                      <a href={bm.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {bm.title}
                      </a>
                    ) : (
                      bm.title
                    )}
                  </TableHead>
                ))}
                <TableHead>Start Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {odds.map((odd) => {
                // Prepare data for both rows
                const rows = [];
                if (selectedMarket === 'totals') {
                  // Over row
                  rows.push({
                    label: 'Over',
                    getOdds: (bm: any) => {
                      const bookmaker = odd.bookmakers.find((b: any) => b.key === bm.key);
                      const totalsMarket = bookmaker?.markets.find((m: any) => m.key === 'totals');
                      const over = totalsMarket?.outcomes.find((o: any) => o.name === 'Over');
                      return {
                        point: over?.point !== undefined ? String(over.point) : '—',
                        price: over?.price !== undefined ? String(over.price) : 'N/A',
                        url: bookmaker?.url
                      };
                    }
                  });
                  // Under row
                  rows.push({
                    label: 'Under',
                    getOdds: (bm: any) => {
                      const bookmaker = odd.bookmakers.find((b: any) => b.key === bm.key);
                      const totalsMarket = bookmaker?.markets.find((m: any) => m.key === 'totals');
                      const under = totalsMarket?.outcomes.find((o: any) => o.name === 'Under');
                      return {
                        point: under?.point !== undefined ? String(under.point) : '—',
                        price: under?.price !== undefined ? String(under.price) : 'N/A',
                        url: bookmaker?.url
                      };
                    }
                  });
                } else {
                  // Home row
                  rows.push({
                    label: 'Home',
                    getOdds: (bm: any) => {
                      const bookmaker = odd.bookmakers.find((b: any) => b.key === bm.key);
                      if (selectedMarket === 'h2h') {
                        const h2hMarket = bookmaker?.markets.find((m: any) => m.key === 'h2h');
                        const homePrice = h2hMarket?.outcomes.find((o: any) => o.name === odd.home_team)?.price;
                        return {
                          point: '—',
                          price: homePrice !== undefined ? String(homePrice) : 'N/A',
                          url: bookmaker?.url
                        };
                      } else {
                        const spreadsMarket = bookmaker?.markets.find((m: any) => m.key === 'spreads');
                        const home = spreadsMarket?.outcomes.find((o: any) => o.name === odd.home_team);
                        return {
                          point: home?.point !== undefined ? String(home.point) : '—',
                          price: home?.price !== undefined ? String(home.price) : 'N/A',
                          url: bookmaker?.url
                        };
                      }
                    }
                  });
                  // Away row
                  rows.push({
                    label: 'Away',
                    getOdds: (bm: any) => {
                      const bookmaker = odd.bookmakers.find((b: any) => b.key === bm.key);
                      if (selectedMarket === 'h2h') {
                        const h2hMarket = bookmaker?.markets.find((m: any) => m.key === 'h2h');
                        const awayPrice = h2hMarket?.outcomes.find((o: any) => o.name === odd.away_team)?.price;
                        return {
                          point: '—',
                          price: awayPrice !== undefined ? String(awayPrice) : 'N/A',
                          url: bookmaker?.url
                        };
                      } else {
                        const spreadsMarket = bookmaker?.markets.find((m: any) => m.key === 'spreads');
                        const away = spreadsMarket?.outcomes.find((o: any) => o.name === odd.away_team);
                        return {
                          point: away?.point !== undefined ? String(away.point) : '—',
                          price: away?.price !== undefined ? String(away.price) : 'N/A',
                          url: bookmaker?.url
                        };
                      }
                    }
                  });
                }
                return rows.map((row, idx) => (
                  <TableRow key={odd.id + '-' + row.label}>
                    {idx === 0 && (
                      <TableCell rowSpan={2}>{odd.sport_title}</TableCell>
                    )}
                    {idx === 0 && (
                      <TableCell rowSpan={2}>{odd.home_team}</TableCell>
                    )}
                    {idx === 0 && (
                      <TableCell rowSpan={2}>{odd.away_team}</TableCell>
                    )}
                    <TableCell>{row.label}</TableCell>
                    {allBookmakers.filter(bm => selectedSportsbooks.includes(bm.key)).map(bm => {
                      const odds = row.getOdds(bm);
                      // Find Pinnacle odds for this row
                      const pinBook = allBookmakers.find(b => b.key === 'pinnacle');
                      const pinOdds = pinBook ? row.getOdds(pinBook) : { point: '—', price: 'N/A' };
                      // Determine side for point highlight
                      let side: 'home' | 'away' | 'over' | 'under' = 'home';
                      if (row.label === 'Home') side = 'home';
                      else if (row.label === 'Away') side = 'away';
                      else if (row.label === 'Over') side = 'over';
                      else if (row.label === 'Under') side = 'under';
                      const pointClass = bm.key !== 'pinnacle' ? getHighlightClass(odds.point, pinOdds.point, 'point', side) : '';
                      const priceClass = bm.key !== 'pinnacle' ? getHighlightClass(odds.price, pinOdds.price, 'price', side) : '';
                      const content = (
                        <div className="flex flex-col items-center justify-center rounded border border-gray-300 px-2 py-1 bg-white hover:bg-gray-100 transition cursor-pointer w-20 min-w-[5rem] max-w-[5rem] text-xs md:text-sm md:px-2 md:py-1">
                          <span className={`font-medium leading-tight ${pointClass}`}>{formatPlus(odds.point)}</span>
                          <span className={`text-gray-700 leading-tight ${priceClass}`}>{formatPlus(odds.price)}</span>
                        </div>
                      );
                      return odds.url ? (
                        <TableCell key={bm.key} className={`text-center p-1${bm.key === 'pinnacle' ? ' bg-yellow-50' : ''}`}>{/* highlight Pinnacle */}
                          <a href={odds.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            {content}
                          </a>
                        </TableCell>
                      ) : (
                        <TableCell key={bm.key} className={`text-center p-1${bm.key === 'pinnacle' ? ' bg-yellow-50' : ''}`}>{content}</TableCell>
                      );
                    })}
                    {idx === 0 && (
                      <TableCell rowSpan={2}>{new Date(odd.commence_time).toLocaleString()}</TableCell>
                    )}
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 