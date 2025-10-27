import { useState, useCallback, useEffect, useRef } from 'react';
import { projectViewSettingsApi } from '../api/projectViewSettings';
import type { ProjectViewSettings, CorpusSettings, SaveProjectViewSettingsDto } from '../types';

interface UseProjectViewSettingsResult {
  settings: ProjectViewSettings | null;
  loading: boolean;
  error: Error | null;
  updateCorpusSettings: (corpusId: string, updates: Partial<CorpusSettings>) => void;
  getCorpusSettings: (corpusId: string) => CorpusSettings | null;
  updateScrollX: (scrollX: number) => void;
  saveNow: () => Promise<void>;
}

const DEFAULT_CORPUS_SETTINGS: CorpusSettings = {
  scrollPosition: 0,
  columnWidth: 1,
  stackView: false,
  expandedStacks: [],
};

/**
 * Hook for managing project view settings with automatic debounced persistence
 * @param projectId - The project ID to load/save settings for
 * @param debounceMs - Milliseconds to wait before auto-saving (default: 1000ms)
 */
export const useProjectViewSettings = (
  projectId: string | undefined,
  debounceMs: number = 1000
): UseProjectViewSettingsResult => {
  const [settings, setSettings] = useState<ProjectViewSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const pendingSettingsRef = useRef<SaveProjectViewSettingsDto | null>(null);
  const isSavingRef = useRef(false);
  const settingsRef = useRef<ProjectViewSettings | null>(null);
  const latestScrollXRef = useRef<number>(0);

  // Keep ref in sync with state
  useEffect(() => {
    settingsRef.current = settings;
    if (settings) {
      latestScrollXRef.current = settings.settings.scrollX || 0;
    }
  }, [settings]);

  // Load settings on mount
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await projectViewSettingsApi.get(projectId);
        setSettings(data);
      } catch (err) {
        console.error('Failed to load project view settings:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [projectId]);

  // Save settings to backend with debouncing
  const saveSettings = useCallback(async (settingsToSave: SaveProjectViewSettingsDto) => {
    if (isSavingRef.current) {
      // If already saving, queue the new settings
      pendingSettingsRef.current = settingsToSave;
      return;
    }

    try {
      isSavingRef.current = true;
      await projectViewSettingsApi.save(settingsToSave);
      // Don't update state here - we already did an optimistic update
      // Updating again can cause infinite loops

      // If there are pending settings, save them now
      if (pendingSettingsRef.current) {
        const pending = pendingSettingsRef.current;
        pendingSettingsRef.current = null;
        isSavingRef.current = false;
        await saveSettings(pending);
      }
    } catch (err) {
      console.error('Failed to save project view settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to save settings'));
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // Debounced save function
  const debouncedSave = useCallback((settingsToSave: SaveProjectViewSettingsDto) => {
    // Clear existing timer
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer
    saveTimerRef.current = window.setTimeout(() => {
      saveSettings(settingsToSave);
    }, debounceMs);
  }, [debounceMs, saveSettings]);

  // Update corpus settings locally and trigger debounced save
  const updateCorpusSettings = useCallback((corpusId: string, updates: Partial<CorpusSettings>) => {
    if (!projectId) return;

    setSettings(prev => {
      const currentSettings = prev?.settings.corpuses[corpusId] || DEFAULT_CORPUS_SETTINGS;
      const updatedCorpusSettings = { ...currentSettings, ...updates };

      const newSettings: SaveProjectViewSettingsDto = {
        projectId,
        settings: {
          scrollX: prev?.settings.scrollX || 0,
          corpuses: {
            ...(prev?.settings.corpuses || {}),
            [corpusId]: updatedCorpusSettings,
          },
        },
      };

      // Trigger debounced save
      debouncedSave(newSettings);

      // Return optimistically updated state
      return {
        id: prev?.id || '',
        userId: prev?.userId || '',
        projectId,
        settings: newSettings.settings,
        createdAt: prev?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [projectId, debouncedSave]);

  // Update scrollX locally and trigger debounced save
  const updateScrollX = useCallback((scrollX: number) => {
    if (!projectId) return;

    // Store the latest scrollX in a ref to avoid stale closures
    latestScrollXRef.current = scrollX;

    // CRITICAL: Capture the current corpuses from settingsRef to avoid stale closure
    const currentCorpuses = settingsRef.current?.settings.corpuses || {};

    // Use the functional update form to avoid stale closures
    setSettings(prev => {
      const newSettings: SaveProjectViewSettingsDto = {
        projectId,
        settings: {
          scrollX: scrollX, // Use the parameter directly, not the ref
          corpuses: currentCorpuses, // Use ref value to ensure latest corpuses
        },
      };

      // Trigger debounced save
      debouncedSave(newSettings);

      // Return optimistically updated state
      return {
        id: prev?.id || '',
        userId: prev?.userId || '',
        projectId,
        settings: newSettings.settings,
        createdAt: prev?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [projectId, debouncedSave]);

  // Get corpus settings (with defaults if not set)
  const getCorpusSettings = useCallback((corpusId: string): CorpusSettings | null => {
    if (!settings) return null;
    return settings.settings.corpuses[corpusId] || DEFAULT_CORPUS_SETTINGS;
  }, [settings]);

  // Save immediately without debouncing
  const saveNow = useCallback(async () => {
    if (!projectId || !settingsRef.current) return;

    // Clear debounce timer
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Save immediately
    await saveSettings({
      projectId,
      settings: settingsRef.current.settings,
    });
  }, [projectId, saveSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    settings,
    loading,
    error,
    updateCorpusSettings,
    getCorpusSettings,
    updateScrollX,
    saveNow,
  };
};
