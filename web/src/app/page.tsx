import Link from 'next/link';
import { readSnapshot } from '@/lib/data';
import type { LeagueSnapshot, ScheduleSnapshot, TeamsSnapshot } from '@/lib/types';
import { formatRecord } from '@/lib/types';
import { Scoreboard } from '@/components/Scoreboard';
import { HomeExtractCTA } from '@/components/HomeExtractCTA';
import { HomeCtaRow, HomeDeskLinks, HomeHeroLead } from '@/components/HomeLanding';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const league = readSnapshot<LeagueSnapshot>('league');
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const teams = readSnapshot<TeamsSnapshot>('teams');
  const hasData = Boolean(league && schedule);

  if (!hasData) {
    return (
      <section className="hero heroEmpty">
        <p className="eyebrow">College football dynasty desk</p>
        <div className="heroBrand">
          CFB <span>OFFLINE</span>
        </div>
        <HomeHeroLead empty />
        <HomeExtractCTA />
      </section>
    );
  }

  const gotw = schedule!.gameOfTheWeek;
  const top10 = (teams?.rankings.media || []).slice(0, 10) as Array<{
    rank: number;
    displayName: string;
    record: { wins: number; losses: number; ties: number };
  }>;

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Live from your dynasty</p>
        <div className="heroBrand">
          CFB <span>OFFLINE</span>
        </div>
        <HomeHeroLead />
        <div className="heroMeta">
          {league!.userTeam && (
            <span className="heroChip">
              <em>Program</em> {league!.userTeam.label}
            </span>
          )}
          <span className="heroChip">
            <em>Week</em> {league!.season.currentWeek} · {league!.season.currentWeekType}
          </span>
          {league!.userTeam && (
            <span className="heroChip">
              <em>Record</em>{' '}
              {formatRecord(
                league!.userTeam.record.wins,
                league!.userTeam.record.losses,
                league!.userTeam.record.ties
              )}
            </span>
          )}
        </div>
        <HomeCtaRow />
      </section>

      {gotw && (
        <section className="section">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Featured matchup</p>
              <h2>Game of the Week</h2>
            </div>
            <Link href="/gotw" className="textLink">
              Full breakdown →
            </Link>
          </div>
          <Scoreboard game={gotw} featured />
        </section>
      )}

      <section className="section sectionSplit">
        <div>
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Media poll</p>
              <h2>Top 10</h2>
            </div>
            <Link href="/rankings" className="textLink">
              All polls →
            </Link>
          </div>
          <div className="panel pollStrip">
            {top10.length === 0 && <div className="emptyState">No poll data yet.</div>}
            {top10.map((row) => (
              <div className="pollRow" key={`${row.rank}-${row.displayName}`}>
                <div className="pollRank">{row.rank}</div>
                <div className="pollTeam">{row.displayName}</div>
                <div className="pollRecord">
                  {formatRecord(row.record.wins, row.record.losses, row.record.ties)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Jump in</p>
              <h2>Desk</h2>
            </div>
          </div>
          <HomeDeskLinks />
        </div>
      </section>
    </>
  );
}
