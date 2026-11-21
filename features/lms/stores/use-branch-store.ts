'use client'
// ---------------------------------------------------------------------------
// stores/use-branch-store.ts
// Zustand store for Branches & Classrooms module dialogs and state
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface BranchDialogState {
  open: boolean
  mode: 'create' | 'edit'
  editId?: string
}

interface RoomDialogState {
  open: boolean
  mode: 'create' | 'edit'
  editId?: string
  campusId?: string // injected from parent context
}

interface BranchState {
  branchDialog: BranchDialogState
  roomDialog: RoomDialogState
  selectedBranchId: string | null

  // Branch actions
  openCreateBranch: () => void
  openEditBranch: (id: string) => void
  closeBranch: () => void

  // Room actions
  openCreateRoom: (campusId: string) => void
  openEditRoom: (id: string, campusId: string) => void
  closeRoom: () => void

  // Selection
  selectBranch: (id: string | null) => void
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultBranchDialog: BranchDialogState = {
  open: false,
  mode: 'create',
}

const defaultRoomDialog: RoomDialogState = {
  open: false,
  mode: 'create',
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useBranchStore = create<BranchState>()((set) => ({
  branchDialog: defaultBranchDialog,
  roomDialog: defaultRoomDialog,
  selectedBranchId: null,

  // Branch
  openCreateBranch: () =>
    set({ branchDialog: { open: true, mode: 'create', editId: undefined } }),

  openEditBranch: (id: string) =>
    set({ branchDialog: { open: true, mode: 'edit', editId: id } }),

  closeBranch: () =>
    set({ branchDialog: { ...defaultBranchDialog } }),

  // Room
  openCreateRoom: (campusId: string) =>
    set({ roomDialog: { open: true, mode: 'create', editId: undefined, campusId } }),

  openEditRoom: (id: string, campusId: string) =>
    set({ roomDialog: { open: true, mode: 'edit', editId: id, campusId } }),

  closeRoom: () =>
    set({ roomDialog: { ...defaultRoomDialog } }),

  // Selection
  selectBranch: (id: string | null) =>
    set({ selectedBranchId: id }),
}))

// ---------------------------------------------------------------------------
// Selectors & Pre-built Hooks
// ---------------------------------------------------------------------------

// Branch Dialog selector
const branchDialogSelector = (s: BranchState) => ({
  branchDialog: s.branchDialog,
  openCreateBranch: s.openCreateBranch,
  openEditBranch: s.openEditBranch,
  closeBranch: s.closeBranch,
})

export function useBranchDialog() {
  return useBranchStore(useShallow(branchDialogSelector))
}

// Room Dialog selector
const roomDialogSelector = (s: BranchState) => ({
  roomDialog: s.roomDialog,
  openCreateRoom: s.openCreateRoom,
  openEditRoom: s.openEditRoom,
  closeRoom: s.closeRoom,
})

export function useRoomDialog() {
  return useBranchStore(useShallow(roomDialogSelector))
}

// Selected Branch selector
const selectedBranchSelector = (s: BranchState) => ({
  selectedBranchId: s.selectedBranchId,
  selectBranch: s.selectBranch,
})

export function useSelectedBranch() {
  return useBranchStore(useShallow(selectedBranchSelector))
}
