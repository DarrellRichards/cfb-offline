'use client';

import Link from 'next/link';
import { useSettings } from './SettingsProvider';

export function HomeCtaRow() {
  const { settings, ready } = useSettings();
  const showRecruiting = ready && settings.recruiting;

  return (
    <div className="ctaRow">
      <Link className="button" href="/gotw">
        Game of the Week
      </Link>
      <Link className="buttonGhost" href="/schedule">
        Full Schedule
      </Link>
      {showRecruiting && (
        <Link className="buttonGhost" href="/recruiting">
          Recruiting Board
        </Link>
      )}
    </div>
  );
}

export function HomeDeskLinks() {
  const { settings, ready } = useSettings();
  const showRecruiting = ready && settings.recruiting;

  return (
    <div className="quickLinks">
      <Link className="quickLink" href="/stats">
        <strong>Stats</strong>
        <span>Leaders and team yards</span>
      </Link>
      <Link className="quickLink" href="/teams">
        <strong>Teams</strong>
        <span>Directory and ratings</span>
      </Link>
      <Link className="quickLink" href="/schedule">
        <strong>Scores</strong>
        <span>Week-by-week slate</span>
      </Link>
      {showRecruiting && (
        <Link className="quickLink" href="/recruiting">
          <strong>Board</strong>
          <span>Recruiting pipeline</span>
        </Link>
      )}
    </div>
  );
}

export function HomeHeroLead({ empty = false }: { empty?: boolean }) {
  const { settings, ready } = useSettings();
  const showRecruiting = !ready || settings.recruiting;

  if (empty) {
    return (
      <p className="heroLead">
        {showRecruiting
          ? 'Scores, polls, leaders, and the recruiting board — pulled straight from your save.'
          : 'Scores, polls, and leaders — pulled straight from your save.'}
      </p>
    );
  }

  return (
    <p className="heroLead">
      {showRecruiting
        ? 'Week-night broadcast energy for an offline season — one desk for the slate, the polls, and the board.'
        : 'Week-night broadcast energy for an offline season — one desk for the slate and the polls.'}
    </p>
  );
}
