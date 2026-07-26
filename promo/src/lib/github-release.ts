export type ReleaseDownload = {
  version: string;
  tagName: string;
  name: string;
  publishedAt: string | null;
  releaseUrl: string;
  windowsInstaller: {
    name: string;
    url: string;
    size: number;
  } | null;
  assets: Array<{ name: string; url: string; size: number }>;
};

type GitHubAsset = {
  name: string;
  size: number;
  browser_download_url: string;
};

type GitHubRelease = {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  assets: GitHubAsset[];
};

const DEFAULT_REPO = "DarrellRichards/cfb-offline";

export function getGithubRepo(): string {
  return (
    process.env.NEXT_PUBLIC_GITHUB_REPO?.trim() ||
    process.env.GITHUB_REPO?.trim() ||
    DEFAULT_REPO
  );
}

function pickWindowsInstaller(assets: GitHubAsset[]): GitHubAsset | null {
  const exes = assets.filter((a) => /\.exe$/i.test(a.name));
  if (exes.length === 0) return null;

  const preferred =
    exes.find((a) => /setup/i.test(a.name) && /offline|cfb/i.test(a.name)) ||
    exes.find((a) => /setup/i.test(a.name)) ||
    exes.find((a) => /offline|cfb/i.test(a.name)) ||
    exes[0];

  return preferred ?? null;
}

export async function fetchLatestRelease(): Promise<ReleaseDownload | null> {
  const repo = getGithubRepo();
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "cfb-offline-promo",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 300 },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub releases API failed (${res.status}) for ${repo}`);
  }

  const release = (await res.json()) as GitHubRelease;
  const installer = pickWindowsInstaller(release.assets ?? []);
  const version = release.tag_name.replace(/^v/i, "");

  return {
    version,
    tagName: release.tag_name,
    name: release.name || release.tag_name,
    publishedAt: release.published_at,
    releaseUrl: release.html_url,
    windowsInstaller: installer
      ? {
          name: installer.name,
          url: installer.browser_download_url,
          size: installer.size,
        }
      : null,
    assets: (release.assets ?? []).map((a) => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
    })),
  };
}
