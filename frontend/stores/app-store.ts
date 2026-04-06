import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AppState {
  selectedWorkspace: string | null
  setSelectedWorkspace: (id: string | null) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  citationsPanelOpen: boolean
  setCitationsPanelOpen: (open: boolean) => void
  selectedSession: string | null
  setSelectedSession: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedWorkspace: null,
      setSelectedWorkspace: (id) => set({ selectedWorkspace: id }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      citationsPanelOpen: true,
      setCitationsPanelOpen: (open) => set({ citationsPanelOpen: open }),
      selectedSession: null,
      setSelectedSession: (id) => set({ selectedSession: id }),
    }),
    {
      name: "app-state",
      partialize: (state) => ({
        selectedWorkspace: state.selectedWorkspace,
        sidebarCollapsed: state.sidebarCollapsed,
        citationsPanelOpen: state.citationsPanelOpen,
      }),
    }
  )
)
