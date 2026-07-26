import { createNewsArticle, listNewsArticles } from '@/lib/news';
import { readSnapshot } from '@/lib/data';
import type { NewsArticleInput } from '@/lib/news-types';
import type {
  AwardsSnapshot,
  LeagueSnapshot,
  ScheduleGame,
  ScheduleSnapshot,
  TeamsSnapshot,
} from '@/lib/types';
import { formatRecord } from '@/lib/types';

export type AutoNewsDraft = Omit<NewsArticleInput, 'source'> & { source: 'auto'; key: string };

function margin(game: ScheduleGame) {
  return Math.abs((game.homeScore || 0) - (game.awayScore || 0));
}

function winnerLoser(game: ScheduleGame) {
  const homeWins = (game.homeScore || 0) > (game.awayScore || 0);
  const tie = (game.homeScore || 0) === (game.awayScore || 0);
  if (tie) {
    return {
      winner: game.home,
      loser: game.away,
      winnerScore: game.homeScore,
      loserScore: game.awayScore,
      tie: true,
    };
  }
  return homeWins
    ? {
        winner: game.home,
        loser: game.away,
        winnerScore: game.homeScore,
        loserScore: game.awayScore,
        tie: false,
      }
    : {
        winner: game.away,
        loser: game.home,
        winnerScore: game.awayScore,
        loserScore: game.homeScore,
        tie: false,
      };
}

function matchup(game: ScheduleGame) {
  return `${game.away?.displayName || 'TBD'} @ ${game.home?.displayName || 'TBD'}`;
}

function buildCandidateStories(count: number): AutoNewsDraft[] {
  const league = readSnapshot<LeagueSnapshot>('league');
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const teams = readSnapshot<TeamsSnapshot>('teams');
  const awards = readSnapshot<AwardsSnapshot>('awards');

  const seasonYear =
    league?.season?.currentSeasonYear ||
    schedule?.games?.[0]?.seasonYear ||
    awards?.seasonYear ||
    new Date().getFullYear();
  const week = schedule?.currentWeek ?? league?.season?.currentWeek ?? 1;
  const weekType = schedule?.currentWeekType || league?.season?.currentWeekType || 'RegularSeason';

  const weekGames = (schedule?.games || []).filter(
    (g) => g.seasonYear === seasonYear && g.seasonWeek === week
  );
  const finals = weekGames.filter((g) => g.isFinal || g.homeScore || g.awayScore);
  const candidates: AutoNewsDraft[] = [];

  const push = (key: string, title: string, dek: string, body: string) => {
    if (candidates.some((c) => c.key === key || c.title === title)) return;
    candidates.push({
      key,
      seasonYear,
      week,
      weekType,
      title,
      dek,
      body,
      source: 'auto',
    });
  };

  const gotw = weekGames.find((g) => g.isGameOfTheWeek) || schedule?.gameOfTheWeek || null;
  if (gotw) {
    const wl = winnerLoser(gotw);
    push(
      'gotw',
      gotw.isFinal || gotw.homeScore || gotw.awayScore
        ? `GOTW: ${wl.winner?.displayName || 'Favorite'} holds serve`
        : `Week ${week} Game of the Week is set`,
      matchup(gotw),
      gotw.isFinal || gotw.homeScore || gotw.awayScore
        ? `${matchup(gotw)} delivered the Week ${week} headline, finishing ${gotw.awayScore}-${gotw.homeScore}${
            gotw.isOvertimeGame ? ' in overtime' : ''
          }. ${
            wl.tie
              ? 'The sides played to a draw.'
              : `${wl.winner?.displayName || 'The winner'} came out on top, ${wl.winnerScore}-${wl.loserScore}.`
          }${gotw.broadcastNetwork ? ` It aired on ${gotw.broadcastNetwork}.` : ''}`
        : `The desk’s featured matchup for Week ${week} is ${matchup(gotw)}.${
            gotw.broadcastNetwork ? ` Catch it on ${gotw.broadcastNetwork}.` : ''
          }`
    );
  }

  const userTeamIndex = league?.userTeam?.teamIndex;
  if (userTeamIndex != null) {
    const programGame = weekGames.find(
      (g) => g.home?.teamIndex === userTeamIndex || g.away?.teamIndex === userTeamIndex
    );
    if (programGame) {
      const isHome = programGame.home?.teamIndex === userTeamIndex;
      const program = isHome ? programGame.home : programGame.away;
      const opp = isHome ? programGame.away : programGame.home;
      const programScore = Number(isHome ? programGame.homeScore : programGame.awayScore) || 0;
      const oppScore = Number(isHome ? programGame.awayScore : programGame.homeScore) || 0;
      const played = Boolean(programGame.isFinal || programGame.homeScore || programGame.awayScore);
      const resultWord =
        programScore > oppScore ? 'wins' : programScore < oppScore ? 'falls' : 'ties';
      const resultVerb =
        programScore > oppScore ? 'won' : programScore < oppScore ? 'lost' : 'tied';
      push(
        'program',
        played
          ? `${program?.displayName || 'Your program'} ${resultWord} in Week ${week}`
          : `${program?.displayName || 'Your program'} locked in for Week ${week}`,
        `${program?.displayName || 'Program'} vs ${opp?.displayName || 'opponent'}`,
        played
          ? `${program?.displayName || 'Your program'} ${isHome ? 'hosted' : 'visited'} ${opp?.displayName || 'their opponent'} and ${resultVerb} ${programScore}-${oppScore}. Season so far: ${formatRecord(
              league?.userTeam?.record.wins || 0,
              league?.userTeam?.record.losses || 0,
              league?.userTeam?.record.ties || 0
            )}.`
          : `${program?.displayName || 'Your program'} is slated to face ${opp?.displayName || 'their opponent'} in Week ${week}${
              isHome ? ' at home' : ' on the road'
            }.`
      );
    }
  }

  const closeGames = [...finals].sort((a, b) => margin(a) - margin(b));
  const nailbiter = closeGames.find((g) => margin(g) <= 7);
  if (nailbiter) {
    const wl = winnerLoser(nailbiter);
    push(
      'nailbiter',
      `One-score thriller: ${wl.winner?.displayName || 'Winner'} survives`,
      matchup(nailbiter),
      `${matchup(nailbiter)} came down to the wire, ${nailbiter.awayScore}-${nailbiter.homeScore}. ${
        wl.winner?.displayName || 'The favorite'
      } escaped by ${margin(nailbiter)} in a Week ${week} classic.`
    );
  }

  const blowout = [...finals].sort((a, b) => margin(b) - margin(a))[0];
  if (blowout && margin(blowout) >= 21) {
    const wl = winnerLoser(blowout);
    push(
      'blowout',
      `${wl.winner?.displayName || 'Winner'} runs up the score`,
      matchup(blowout),
      `${wl.winner?.displayName || 'The winner'} steamrolled ${wl.loser?.displayName || 'the opposition'}, ${blowout.awayScore}-${blowout.homeScore}. The ${margin(blowout)}-point margin was Week ${week}'s clearest statement.`
    );
  }

  const media = teams?.rankings?.media || [];
  if (media[0]) {
    const top = media[0] as {
      displayName?: string;
      rank?: number;
      record?: { wins: number; losses: number; ties: number };
    };
    push(
      'poll',
      `${top.displayName || 'No. 1'} sits atop the media poll`,
      `Week ${week} poll desk`,
      `${top.displayName || 'The top team'} holds No. ${top.rank || 1} in the media poll${
        top.record ? ` at ${formatRecord(top.record.wins, top.record.losses, top.record.ties)}` : ''
      }. The Top 10 stays the measuring stick as Week ${week} settles.`
    );
  }

  const weeklyAwards = awards?.current?.weeklyAwards || [];
  if (weeklyAwards.length) {
    const lines = weeklyAwards.slice(0, 5).map((row) => {
      const name = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Honoree';
      return `• ${row.awardLabel || row.awardType || 'Award'}: ${name}${
        row.teamDisplayName ? ` (${row.teamDisplayName})` : ''
      }`;
    });
    push(
      'awards',
      `Week ${week} award watch`,
      'Honors from the latest slate',
      `The awards desk rolled out Week ${week} hardware:\n\n${lines.join('\n')}`
    );
  }

  if (finals.length >= 3) {
    const lines = finals.slice(0, 8).map((g) => `• ${matchup(g)} — ${g.awayScore}-${g.homeScore}`);
    push(
      'roundup',
      `Week ${week} scoreboard roundup`,
      `${finals.length} results in the books`,
      `A quick pass through the Week ${week} finals:\n\n${lines.join('\n')}${
        finals.length > 8 ? `\n• …and ${finals.length - 8} more` : ''
      }`
    );
  }

  if (weekGames.length && candidates.length < count) {
    push(
      'slate',
      `The Week ${week} slate is loaded`,
      `${weekGames.length} games on the board`,
      `Dynasty Week ${week} (${weekType.replace(/_/g, ' ')}) carries ${weekGames.length} scheduled games${
        finals.length ? `, with ${finals.length} already final` : ''
      }. The desk will keep stacking notes as the results settle.`
    );
  }

  // Pad with conference notebooks if we still need more slots.
  const conferences = league?.conferences || teams?.conferences || [];
  for (const conf of conferences.slice(0, 8)) {
    if (candidates.length >= Math.max(count, 8)) break;
    const confName = 'name' in conf ? String(conf.name || '') : '';
    if (!confName) continue;
    const confTeams = (teams?.teams || []).filter((t) => t.conference?.name === confName).slice(0, 3);
    if (!confTeams.length) continue;
    push(
      `conf-${confName}`,
      `${confName} notebook: Week ${week}`,
      `${confTeams.length}+ programs under the microscope`,
      `${confName} stays busy in Week ${week}. Keep an eye on ${confTeams
        .map((t) => t.displayName)
        .join(', ')} as the conference race takes shape.`
    );
  }

  while (candidates.length < count) {
    const n = candidates.length + 1;
    push(
      `filler-${n}`,
      `Desk note ${n}: Week ${week} chatter`,
      `${seasonYear} season diary`,
      `Another Week ${week} item for the wire: practices, travel, and poll talk continue around the ${seasonYear} dynasty as the desk waits on the next wave of results.`
    );
  }

  return candidates.slice(0, Math.max(count * 2, count));
}

export function generateAutoNewsForCurrentWeek(options?: { count?: number }) {
  const countRaw = Number(options?.count);
  const count = Number.isFinite(countRaw) ? Math.min(12, Math.max(1, Math.trunc(countRaw))) : 5;

  const league = readSnapshot<LeagueSnapshot>('league');
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const seasonYear =
    league?.season?.currentSeasonYear ||
    schedule?.games?.[0]?.seasonYear ||
    new Date().getFullYear();
  const week = schedule?.currentWeek ?? league?.season?.currentWeek ?? 1;

  if (!schedule && !league) {
    return {
      ok: false as const,
      created: [],
      skipped: 0,
      seasonYear,
      week,
      message: 'Extract league/schedule before auto news can run.',
    };
  }

  const existing = listNewsArticles({ seasonYear, week });
  const existingAuto = existing.filter((a) => a.source === 'auto');
  const existingTitles = new Set(existing.map((a) => a.title.toLowerCase()));
  const need = Math.max(0, count - existingAuto.length);

  if (need === 0) {
    return {
      ok: true as const,
      created: [],
      skipped: existingAuto.length,
      seasonYear,
      week,
      message: `Week ${week} already has ${existingAuto.length} auto stories (target ${count}).`,
    };
  }

  const drafts = buildCandidateStories(count)
    .filter((draft) => !existingTitles.has(draft.title.toLowerCase()))
    .slice(0, need);

  const created = drafts.map((draft) => {
    const { key: _key, ...input } = draft;
    return createNewsArticle(input);
  });

  return {
    ok: true as const,
    created,
    skipped: existingAuto.length,
    seasonYear,
    week,
    message: `Created ${created.length} auto stories for ${seasonYear} Week ${week}.`,
  };
}
