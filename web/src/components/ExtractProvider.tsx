'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

export type SaveInfo = { name: string; fullPath: string; mtimeMs: number; size: number };

export type ExtractStepId = 'league' | 'schedule' | 'teams' | 'stats' | 'recruits';

export const EXTRACT_STEPS: Array<{ id: ExtractStepId; label: string }> = [
  { id: 'league', label: 'League' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'teams', label: 'Teams' },
  { id: 'stats', label: 'Stats' },
  { id: 'recruits', label: 'Recruits' },
];

type StepState = 'pending' | 'running' | 'done' | 'error';

type ExtractContextValue = {
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  busy: boolean;
  status: string;
  steps: Record<ExtractStepId, StepState>;
  dir: string;
  setDir: (dir: string) => void;
  saves: SaveInfo[];
  savePath: string;
  setSavePath: (path: string) => void;
  lastSaveName: string;
  isDesktop: boolean;
  refreshSaves: () => Promise<void>;
  pickLatest: () => void;
  pickSaveFile: () => Promise<string | null>;
  extractLatest: () => Promise<void>;
  extractSelected: (scope?: string) => Promise<boolean>;
  extractPath: (pathToExtract: string, scope?: string) => Promise<boolean>;
};

const ExtractContext = createContext<ExtractContextValue | null>(null);

const STORAGE_KEY = 'cfb-offline-last-save';

function emptySteps(): Record<ExtractStepId, StepState> {
  return {
    league: 'pending',
    schedule: 'pending',
    teams: 'pending',
    stats: 'pending',
    recruits: 'pending',
  };
}

function isDesktopRuntime() {
  return typeof window !== 'undefined' && Boolean(window.cfbDesktop?.isDesktop);
}

export function ExtractProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [steps, setSteps] = useState(emptySteps);
  const [dir, setDir] = useState('');
  const [saves, setSaves] = useState<SaveInfo[]>([]);
  const [savePath, setSavePath] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const startupHandled = useRef(false);
  const runExtractRef = useRef<(path: string, scope?: string) => Promise<boolean>>(async () => false);

  const lastSaveName = useMemo(() => {
    if (!savePath) return '';
    const hit = saves.find((s) => s.fullPath === savePath);
    return hit?.name || savePath.split(/[/\\]/).pop() || savePath;
  }, [savePath, saves]);

  const loadSaves = useCallback(async (nextDir?: string) => {
    if (isDesktopRuntime() && window.cfbDesktop) {
      const targetDir =
        nextDir ||
        (await window.cfbDesktop.getDefaultDir().catch(() => '')) ||
        '';
      setDir(targetDir);
      const savesJson = await window.cfbDesktop.listDynastySaves(targetDir);
      const list: SaveInfo[] = savesJson.saves || [];
      setSaves(list);

      const stored = window.localStorage.getItem(STORAGE_KEY);
      const preferred =
        (stored && list.find((s) => s.fullPath === stored)?.fullPath) ||
        list[0]?.fullPath ||
        stored ||
        '';
      if (preferred) setSavePath(preferred);
      return list;
    }

    const defRes = await fetch('/api/saves/default-dir');
    const defJson = await defRes.json();
    const targetDir = nextDir ?? defJson.dir ?? '';
    setDir(targetDir);

    const savesRes = await fetch(`/api/saves?dir=${encodeURIComponent(targetDir)}&includeRepo=1`);
    const savesJson = await savesRes.json();
    const list: SaveInfo[] = savesJson.saves || [];
    setSaves(list);

    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const preferred =
      (stored && list.find((s) => s.fullPath === stored)?.fullPath) ||
      list[0]?.fullPath ||
      stored ||
      '';
    if (preferred) setSavePath(preferred);
    return list;
  }, []);

  const runExtract = useCallback(
    async (pathToExtract: string, scope = 'all') => {
      if (!pathToExtract) {
        setStatus('Pick a dynasty file first.');
        setPanelOpen(true);
        return false;
      }

      window.localStorage.setItem(STORAGE_KEY, pathToExtract);
      setSavePath(pathToExtract);
      setBusy(true);
      setPanelOpen(true);
      setSteps(emptySteps());

      const stepIds: ExtractStepId[] =
        scope === 'all'
          ? EXTRACT_STEPS.map((s) => s.id)
          : (scope.split(',').map((s) => s.trim()).filter(Boolean) as ExtractStepId[]);

      try {
        for (const stepId of stepIds) {
          setSteps((prev) => ({ ...prev, [stepId]: 'running' }));
          setStatus(`Extracting ${stepId}…`);
          const res = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ savePath: pathToExtract, scope: stepId }),
          });
          const json = await res.json();
          if (!res.ok) {
            setSteps((prev) => ({ ...prev, [stepId]: 'error' }));
            throw new Error(json.error || `Failed on ${stepId}`);
          }
          setSteps((prev) => ({ ...prev, [stepId]: 'done' }));
        }
        setStatus('Dynasty snapshot ready.');
        router.refresh();
        setPanelOpen(false);
        return true;
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  runExtractRef.current = runExtract;

  useEffect(() => {
    setIsDesktop(isDesktopRuntime());
    loadSaves().catch((err) => setStatus(err instanceof Error ? err.message : String(err)));
  }, [loadSaves]);

  useEffect(() => {
    if (startupHandled.current) return;
    startupHandled.current = true;

    (async () => {
      try {
        const stored =
          typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;

        if (stored) {
          const name = stored.split(/[/\\]/).pop() || stored;
          setStatus(`Loading last dynasty: ${name}…`);
          const ok = await runExtractRef.current(stored, 'all');
          if (ok) return;
          setStatus(`Could not load ${name}. Choose another dynasty save.`);
        }

        if (isDesktopRuntime() && window.cfbDesktop?.promptStartupSave) {
          setStatus('Choose a dynasty save to get started…');
          const result = await window.cfbDesktop.promptStartupSave();
          if (result.alreadyShown) return;
          if (result.savePath) {
            setStatus(`Selected ${result.savePath.split(/[/\\]/).pop()}`);
            await runExtractRef.current(result.savePath, 'all');
            return;
          }
        }

        setPanelOpen(true);
        setStatus('Select a dynasty save to load the desk.');
      } catch (err) {
        setPanelOpen(true);
        setStatus(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const refreshSaves = useCallback(async () => {
    setStatus('Looking for dynasty saves…');
    const list = await loadSaves(dir);
    setStatus(`${list.length} dynasty file${list.length === 1 ? '' : 's'} found`);
  }, [dir, loadSaves]);

  const pickLatest = useCallback(() => {
    if (!saves[0]) {
      setStatus('No dynasty files found yet.');
      return;
    }
    setSavePath(saves[0].fullPath);
    setStatus(`Selected latest: ${saves[0].name}`);
  }, [saves]);

  const pickSaveFile = useCallback(async () => {
    if (window.cfbDesktop?.pickSaveFile) {
      const selected = await window.cfbDesktop.pickSaveFile();
      if (selected) {
        window.localStorage.setItem(STORAGE_KEY, selected);
        setSavePath(selected);
        setStatus(`Selected ${selected.split(/[/\\]/).pop()}`);
      }
      return selected;
    }
    setPanelOpen(true);
    return null;
  }, []);

  const extractSelected = useCallback(
    async (scope = 'all') => runExtract(savePath, scope),
    [runExtract, savePath]
  );

  const extractLatest = useCallback(async () => {
    if (isDesktopRuntime() && window.cfbDesktop?.pickSaveFile) {
      const selected = await window.cfbDesktop.pickSaveFile();
      if (!selected) {
        setPanelOpen(true);
        setStatus('Select a dynasty save to continue.');
        return;
      }
      await runExtract(selected, 'all');
      return;
    }

    let list = saves;
    if (!list.length) {
      list = await loadSaves(dir);
    }
    const latest = list[0];
    if (!latest) {
      setStatus('No dynasty files found. Open Extract to set your saves folder.');
      setPanelOpen(true);
      return;
    }
    setSavePath(latest.fullPath);
    await runExtract(latest.fullPath, 'all');
  }, [saves, loadSaves, dir, runExtract]);

  const value: ExtractContextValue = {
    panelOpen,
    openPanel: () => setPanelOpen(true),
    closePanel: () => setPanelOpen(false),
    busy,
    status,
    steps,
    dir,
    setDir,
    saves,
    savePath,
    setSavePath,
    lastSaveName,
    isDesktop,
    refreshSaves,
    pickLatest,
    pickSaveFile,
    extractLatest,
    extractSelected,
    extractPath: runExtract,
  };

  return <ExtractContext.Provider value={value}>{children}</ExtractContext.Provider>;
}

export function useExtract() {
  const ctx = useContext(ExtractContext);
  if (!ctx) throw new Error('useExtract must be used within ExtractProvider');
  return ctx;
}
