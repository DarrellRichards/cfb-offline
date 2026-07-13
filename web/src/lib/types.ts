export type TeamRef = {
  row: number;
  teamIndex: number;
  displayName: string;
  nickname?: string;
  label: string;
};

export type LeagueSnapshot = {
  generatedAt: string;
  savePath: string;
  season: {
    currentYear: number;
    currentSeasonYear: number;
    baseCalendarYear: number;
    currentWeek: number;
    currentWeekType: string;
    currentStage: string;
    isRecruitingPeriodActive: boolean;
    isSigningPeriodActive: boolean;
    regularSeasonLastWeekScheduled: number;
  };
  userTeam: {
    row: number;
    teamIndex: number;
    displayName: string;
    nickname: string;
    label: string;
    conference: { name: string; enum: string } | null;
    coachName: string;
    overall: number;
    record: { wins: number; losses: number; ties: number; confWins: number; confLosses: number };
    mediaPollRank: number;
    coachesPollRank: number;
    cfpRank: number;
  } | null;
  conferences: Array<{ row: number; name: string; enum: string; teamRows: number[]; teamIndexes: number[] }>;
};

export type ScheduleGame = {
  row: number;
  seasonYear: number;
  seasonWeek: number;
  seasonWeekType: string;
  seasonGameNum: number;
  dayOfWeek: string;
  gameDateMonth: number;
  gameDateDay: number;
  home: TeamRef | null;
  away: TeamRef | null;
  homeScore: number;
  awayScore: number;
  quarters: { home: number[]; away: number[] } | null;
  gameStatus: string;
  isFinal: boolean;
  isOvertimeGame: boolean;
  isGameOfTheWeek: boolean;
  isWorstOfTheWeek: boolean;
  gameOfTheWeekScore: number;
  isSimmed: boolean;
  attendance: number;
  broadcastNetwork: string;
  weather: string;
  temperature: number;
};

export type ScheduleSnapshot = {
  generatedAt: string;
  savePath: string;
  currentWeek: number;
  currentWeekType: string;
  weeks: number[];
  gameCount: number;
  gameOfTheWeek: ScheduleGame | null;
  games: ScheduleGame[];
};

export type TeamRecord = {
  row: number;
  teamIndex: number;
  displayName: string;
  nickname: string;
  label: string;
  assetName: string;
  primaryColor: { r: number; g: number; b: number };
  conference: { name: string; enum: string } | null;
  record: {
    wins: number;
    losses: number;
    ties: number;
    confWins: number;
    confLosses: number;
    confTies: number;
    nonConfWins: number;
    nonConfLosses: number;
    homeWins: number;
    homeLosses: number;
    roadWins: number;
    roadLosses: number;
    winPct: number;
  };
  standings: { conference: number; division: number; league: number; lastWeekConference: number };
  polls: {
    media: { rank: number; lastWeekRank: number; points: number; firstPlaceVotes: number };
    coaches: { rank: number; lastWeekRank: number; points: number; firstPlaceVotes: number };
    cfp: { rank: number; lastWeekRank: number; points: number };
  };
  ratings: Record<string, number>;
};

export type TeamsSnapshot = {
  generatedAt: string;
  savePath: string;
  teamCount: number;
  conferences: Array<{ name: string; enum: string; teamIndexes: number[] }>;
  rankings: {
    media: Array<Record<string, unknown>>;
    coaches: Array<Record<string, unknown>>;
    cfp: Array<Record<string, unknown>>;
  };
  teams: TeamRecord[];
};

export type StatsSnapshot = {
  generatedAt: string;
  savePath: string;
  playerCount: number;
  leaders: Record<string, Array<Record<string, unknown>>>;
  teamTotals: Array<Record<string, unknown>>;
  teamRankings: Record<string, Array<Record<string, unknown>>>;
};

export type RecruitBoardSnapshot = {
  generatedAt: string;
  savePath: string;
  rowCount: number;
  teamContext: Record<string, unknown>;
  recruits: Array<Record<string, unknown>>;
};

export function formatRecord(wins: number, losses: number, ties = 0) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function movementLabel(movement: number) {
  if (!movement) return '—';
  if (movement > 0) return `↑${movement}`;
  return `↓${Math.abs(movement)}`;
}
