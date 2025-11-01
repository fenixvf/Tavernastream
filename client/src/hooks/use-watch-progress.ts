import { useState, useEffect, useCallback } from 'react';
import type { WatchProgress } from '@shared/schema';

const STORAGE_KEY = 'tavernastream_watch_progress';

export function useWatchProgress() {
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setWatchProgress(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing watch progress:', error);
      }
    }
  }, []);

  const saveProgress = useCallback((progress: Omit<WatchProgress, 'lastWatchedAt'>) => {
    setWatchProgress((prev) => {
      const existing = prev.find((p) => {
        if (progress.mediaType === 'movie') {
          return p.tmdbId === progress.tmdbId && p.mediaType === 'movie';
        } else {
          return (
            p.tmdbId === progress.tmdbId &&
            p.mediaType === 'tv' &&
            p.seasonNumber === progress.seasonNumber &&
            p.episodeNumber === progress.episodeNumber
          );
        }
      });

      // Marcar como completo se progress >= 80%
      const isCompleted = progress.progress >= 80 || progress.completed;

      const newProgress: WatchProgress = {
        ...progress,
        completed: isCompleted,
        lastWatchedAt: new Date().toISOString(),
      };

      let updated: WatchProgress[];
      if (existing) {
        updated = prev.map((p) =>
          p === existing ? newProgress : p
        );
      } else {
        updated = [newProgress, ...prev];
      }

      // Filtrar itens completados da lista de "Continuar Assistindo" após 7 dias
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      updated = updated.filter((p) => {
        if (p.completed) {
          return new Date(p.lastWatchedAt).getTime() > sevenDaysAgo;
        }
        return true;
      });

      updated.sort((a, b) => 
        new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime()
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getProgress = useCallback((
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number
  ): WatchProgress | undefined => {
    return watchProgress.find((p) => {
      if (mediaType === 'movie') {
        return p.tmdbId === tmdbId && p.mediaType === 'movie';
      } else {
        return (
          p.tmdbId === tmdbId &&
          p.mediaType === 'tv' &&
          p.seasonNumber === seasonNumber &&
          p.episodeNumber === episodeNumber
        );
      }
    });
  }, [watchProgress]);

  const clearProgress = useCallback((tmdbId: number) => {
    setWatchProgress((prev) => {
      const updated = prev.filter((p) => p.tmdbId !== tmdbId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFromContinueWatching = useCallback((
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number
  ) => {
    setWatchProgress((prev) => {
      const updated = prev.filter((p) => {
        if (mediaType === 'movie') {
          return !(p.tmdbId === tmdbId && p.mediaType === 'movie');
        } else {
          return !(
            p.tmdbId === tmdbId &&
            p.mediaType === 'tv' &&
            p.seasonNumber === seasonNumber &&
            p.episodeNumber === episodeNumber
          );
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getContinueWatching = useCallback(() => {
    const now = new Date().getTime();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    return watchProgress
      .filter((p) => !p.completed && new Date(p.lastWatchedAt).getTime() > thirtyDaysAgo)
      .slice(0, 10);
  }, [watchProgress]);

  const clearAllProgress = useCallback(() => {
    setWatchProgress([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }, []);

  return {
    watchProgress,
    saveProgress,
    getProgress,
    clearProgress,
    getContinueWatching,
    removeFromContinueWatching,
    clearAllProgress,
  };
}
