import { create } from "zustand";
import type { Document } from "@sdoc/types";

export interface CollaboratorInfo {
  userId: string;
  name: string;
  color: string;
  cursor?: { anchor: number; head: number };
}

interface DocumentState {
  currentDocument: Document | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  collaborators: CollaboratorInfo[];
  isCollaborating: boolean;

  setCurrentDocument: (doc: Document | null) => void;
  markDirty: () => void;
  markSaving: () => void;
  markSaved: () => void;
  addCollaborator: (user: CollaboratorInfo) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaboratorCursor: (userId: string, cursor: CollaboratorInfo["cursor"]) => void;
  clearCollaborators: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  currentDocument: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  collaborators: [],
  isCollaborating: false,

  setCurrentDocument: (doc) =>
    set({ currentDocument: doc, isDirty: false, lastSavedAt: null }),

  markDirty: () => set({ isDirty: true }),
  markSaving: () => set({ isSaving: true }),
  markSaved: () =>
    set({ isDirty: false, isSaving: false, lastSavedAt: new Date() }),

  addCollaborator: (user) =>
    set((state) => {
      const exists = state.collaborators.some((c) => c.userId === user.userId);
      if (exists) return state;
      return {
        collaborators: [...state.collaborators, user],
        isCollaborating: true,
      };
    }),

  removeCollaborator: (userId) =>
    set((state) => {
      const updated = state.collaborators.filter((c) => c.userId !== userId);
      return { collaborators: updated, isCollaborating: updated.length > 0 };
    }),

  updateCollaboratorCursor: (userId, cursor) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.userId === userId ? { ...c, cursor } : c
      ),
    })),

  clearCollaborators: () => set({ collaborators: [], isCollaborating: false }),
}));
