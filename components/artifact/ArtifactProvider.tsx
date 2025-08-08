'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Artifact } from './types';

interface ArtifactContextType {
  artifacts: Map<string, Artifact>;
  activeArtifact: Artifact | null;
  previewVisible: boolean;
  createArtifact: (artifact: Artifact) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  setActiveArtifact: (id: string | null) => void;
  togglePreview: (visible?: boolean) => void;
  getArtifact: (id: string) => Artifact | undefined;
  clearArtifacts: () => void;
}

const ArtifactContext = createContext<ArtifactContextType | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState(new Map<string, Artifact>());
  const [activeArtifact, setActiveArtifactState] = useState<Artifact | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const createArtifact = useCallback((artifact: Artifact) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      newMap.set(artifact.id, artifact);
      return newMap;
    });
  }, []);

  const updateArtifact = useCallback((id: string, updates: Partial<Artifact>) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      if (existing) {
        newMap.set(id, { ...existing, ...updates, updatedAt: new Date() });
      }
      return newMap;
    });
    
    // Update active artifact if it's the one being updated
    if (activeArtifact?.id === id) {
      setActiveArtifactState(prev => 
        prev ? { ...prev, ...updates, updatedAt: new Date() } : null
      );
    }
  }, [activeArtifact]);

  const setActiveArtifact = useCallback((id: string | null) => {
    if (id === null) {
      setActiveArtifactState(null);
      setPreviewVisible(false);
    } else {
      const artifact = artifacts.get(id);
      if (artifact) {
        setActiveArtifactState(artifact);
        setPreviewVisible(true);
      }
    }
  }, [artifacts]);

  const togglePreview = useCallback((visible?: boolean) => {
    setPreviewVisible(prev => visible !== undefined ? visible : !prev);
  }, []);

  const getArtifact = useCallback((id: string) => {
    return artifacts.get(id);
  }, [artifacts]);

  const clearArtifacts = useCallback(() => {
    setArtifacts(new Map());
    setActiveArtifactState(null);
    setPreviewVisible(false);
  }, []);

  return (
    <ArtifactContext.Provider value={{
      artifacts,
      activeArtifact,
      previewVisible,
      createArtifact,
      updateArtifact,
      setActiveArtifact,
      togglePreview,
      getArtifact,
      clearArtifacts
    }}>
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifact must be used within an ArtifactProvider');
  }
  return context;
}

// Safe version that returns null if not in provider
export function useArtifactSafe() {
  return useContext(ArtifactContext);
}