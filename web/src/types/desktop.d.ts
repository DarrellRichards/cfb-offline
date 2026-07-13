export type CfbDesktopApi = {
  isDesktop: true;
  getDefaultDir: () => Promise<string>;
  listDynastySaves: (dirPath?: string) => Promise<{
    dir: string;
    saves: Array<{ name: string; fullPath: string; mtimeMs: number; size: number }>;
  }>;
  pickDir: () => Promise<string | null>;
  pickSaveFile: () => Promise<string | null>;
  promptStartupSave: () => Promise<{ alreadyShown: boolean; savePath: string | null }>;
};

declare global {
  interface Window {
    cfbDesktop?: CfbDesktopApi;
  }
}

export {};
