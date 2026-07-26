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
    totalOffense?: Array<Record<string, unknown>>;
    totalDefense?: Array<Record<string, unknown>>;
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

export type RosterPlayerSeasonStats = {
  seasonYear: number;
  rawSeasonYear?: number;
  isCurrent?: boolean;
  gamesPlayed: number;
  offense: {
    seasYear?: number;
    gamesPlayed?: number;
    passYards?: number;
    passAttempts?: number;
    passCompletions?: number;
    passTds?: number;
    passInts?: number;
    rushYards?: number;
    rushAttempts?: number;
    rushTds?: number;
    receiveYards?: number;
    receiveCatches?: number;
    receiveTds?: number;
  } | null;
  defense: {
    seasYear?: number;
    gamesPlayed?: number;
    tackles?: number;
    sacks?: number;
    ints?: number;
    tfl?: number;
    deflections?: number;
    forcedFumbles?: number;
  } | null;
  kicking: {
    seasYear?: number;
    gamesPlayed?: number;
    fgMade?: number;
    fgAttempts?: number;
    fgLong?: number;
    xpMade?: number;
    xpAttempts?: number;
    puntYards?: number;
    puntAttempts?: number;
  } | null;
};

export type RosterPlayer = {
  playerRow: number;
  teamIndex: number;
  teamDisplayName: string;
  teamLabel: string;
  firstName: string;
  lastName: string;
  position: string;
  overall: number | null;
  jersey: number | null;
  schoolYear: string;
  redshirtStatus: string;
  height: number | null;
  weight: number | null;
  yearsPlayed: number | null;
  playerType: string;
  archetypeLabel: string;
  devTrait: string;
  physicalAbilities: string;
  physicalAbilityEntries: Array<{
    slot: number;
    name: string;
    tier: string;
    label: string;
  }>;
  ratings: Record<string, number>;
  seasons?: RosterPlayerSeasonStats[];
};

export type RosterSnapshot = {
  generatedAt: string;
  savePath: string;
  currentSeasonYear?: number | null;
  teamCount: number;
  playerCount: number;
  teams: Array<{
    teamIndex: number;
    displayName: string;
    label: string;
    playerCount: number;
  }>;
  players: RosterPlayer[];
};

export type AwardPerson = {
  firstName?: string;
  lastName?: string;
  position?: string;
  teamIndex?: number | null;
  teamDisplayName?: string;
  conferenceName?: string | null;
  awardType?: string;
  awardLabel?: string;
  period?: string;
  periodIndex?: number;
  awardScore?: number;
  overall?: number;
  rank?: number;
  currentRank?: number;
  lastWeekRank?: number;
};

export type NationalChampionEntry = {
  seasonYear: number;
  periodIndex: number;
  champion: {
    teamIndex: number | null;
    displayName: string;
    rank: number;
    score: number;
    wins: number;
    losses: number;
    coachFirstName?: string;
    coachLastName?: string;
  };
  runnerUp: {
    teamIndex: number | null;
    displayName: string;
    rank: number;
    score: number;
    wins: number;
    losses: number;
    coachFirstName?: string;
    coachLastName?: string;
  };
};

export type ConferenceChampionEntry = {
  seasonYear: number;
  periodIndex: number;
  conferenceName: string;
  champion: {
    teamIndex: number | null;
    displayName: string;
    rank: number;
    score: number;
    wins: number;
    losses: number;
    ties?: number;
    coachFirstName?: string;
    coachLastName?: string;
  };
  runnerUp: {
    teamIndex: number | null;
    displayName: string;
    rank: number;
    score: number;
    wins: number;
    losses: number;
    ties?: number;
  };
};

export type AnnualAwardEntry = {
  seasonYear: number;
  periodIndex: number;
  awardType: string;
  awardLabel: string;
  firstName: string;
  lastName: string;
  position: string;
  teamDisplayName: string;
  teamIndex: number | null;
};

export type AwardsSnapshot = {
  generatedAt: string;
  savePath: string;
  seasonYear: number;
  baseCalendarYear: number;
  currentWeek: number;
  currentWeekType: string;
  seasonYears: number[];
  nationalChampions: NationalChampionEntry[];
  conferenceChampions: ConferenceChampionEntry[];
  annualAwards: AnnualAwardEntry[];
  coachAwards: AwardPerson[];
  current: {
    heismanRace: AwardPerson[];
    weeklyAwards: AwardPerson[];
    preseasonAllAmericans: AwardPerson[];
    otherSeasonAwards: AwardPerson[];
  };
  counts?: Record<string, number>;
};

export function formatRecord(wins: number, losses: number, ties = 0) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function movementLabel(movement: number) {
  if (!movement) return '—';
  if (movement > 0) return `↑${movement}`;
  return `↓${Math.abs(movement)}`;
}
