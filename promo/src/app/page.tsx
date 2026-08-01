import { FieldBackground } from "@/components/FieldBackground";
import { RevealSection } from "@/components/RevealSection";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchLatestRelease, getGithubRepo } from "@/lib/github-release";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function HomePage() {
  const repo = getGithubRepo();
  const releasesUrl = `https://github.com/${repo}/releases`;

  let release = null as Awaited<ReturnType<typeof fetchLatestRelease>>;
  let fetchError = false;

  try {
    release = await fetchLatestRelease();
  } catch {
    fetchError = true;
  }

  const downloadUrl = release?.windowsInstaller?.url ?? null;
  const hasInstaller = Boolean(downloadUrl);
  const primaryHref = downloadUrl ?? (release?.releaseUrl || releasesUrl);
  const versionLabel = release?.version ? `v${release.version}` : null;
  const sizeLabel = release?.windowsInstaller
    ? formatBytes(release.windowsInstaller.size)
    : null;

  const metaParts = ["Windows 10/11 · x64"];
  if (versionLabel) metaParts.push(versionLabel);
  if (sizeLabel) metaParts.push(sizeLabel);

  return (
    <>
      <SiteHeader />

      <main id="top">
        <section className="hero" aria-label="CFB Offline">
          <FieldBackground />
          <div className="heroCopy">
            <p className="brand">
              CFB <span>OFFLINE</span>
            </p>
            <h1>Your dynasty, on a desk that stays local.</h1>
            <p className="lede">
              Pull scores, polls, leaders, and the recruiting board straight from your College
              Football save — no account, no cloud sync.
            </p>
            <div className="ctaRow">
              <a
                className="button"
                href={hasInstaller ? primaryHref : "#download"}
                {...(hasInstaller
                  ? { rel: "noopener noreferrer" }
                  : {})}
              >
                Download for Windows
              </a>
              <a className="buttonGhost" href="#how">
                See how it works
              </a>
            </div>
          </div>
        </section>

        <RevealSection id="what">
          <p className="eyebrow">What it is</p>
          <h2>A dynasty desk for an offline season.</h2>
          <p className="sectionLead">
            CFB Offline reads your EA Sports College Football dynasty file and turns it into a
            focused local app: schedule and weather, Game of the Week, rankings, team pages, stats
            leaders, and recruiting.
          </p>
        </RevealSection>

        <RevealSection id="how" className="sectionAlt">
          <p className="eyebrow">How it works</p>
          <h2>Install once. Point at a save. Play the week.</h2>
          <ol className="steps">
            <li>
              <strong>Install the Windows app</strong>
              <span>One installer from GitHub Releases. Runs entirely on your machine.</span>
            </li>
            <li>
              <strong>Select a DYNASTY save</strong>
              <span>Usually under Documents · EA SPORTS College Football 27 · saves.</span>
            </li>
            <li>
              <strong>Extract and explore</strong>
              <span>
                League, schedule, teams, stats, and recruiting land on your desk in one pass.
              </span>
            </li>
          </ol>
        </RevealSection>

        <RevealSection id="download" className="download">
          <p className="eyebrow">Get the app</p>
          <h2>Download CFB Offline</h2>
          <p className="sectionLead">
            Free Windows build from the latest GitHub release. Runs on your PC, reads your dynasty
            save, and keeps everything local.
          </p>
          <div className="ctaRow">
            {hasInstaller ? (
              <a className="button" href={primaryHref} rel="noopener noreferrer">
                Download installer
              </a>
            ) : (
              <a className="button" href={releasesUrl} rel="noopener noreferrer" target="_blank">
                View GitHub Releases
              </a>
            )}
            <a
              className="buttonGhost"
              href={release?.releaseUrl || releasesUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              All releases
            </a>
          </div>
          <p className="meta">
            {fetchError
              ? `Could not reach GitHub right now — check ${releasesUrl}`
              : !release
                ? `No published release yet — watch ${releasesUrl}`
                : !hasInstaller
                  ? `${metaParts[0]}${versionLabel ? ` · ${versionLabel}` : ""} · installer not attached yet`
                  : metaParts.join(" · ")}
          </p>
        </RevealSection>
      </main>

      <footer className="foot">
        <p>CFB Offline is an unofficial fan tool. Not affiliated with EA Sports.</p>
      </footer>
    </>
  );
}
