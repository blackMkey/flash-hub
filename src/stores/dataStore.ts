// Data Store - manages epic data, search history, and current selections
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { type JiraEpic } from '@/services/jiraFetchers'

interface EpicSearchHistory {
  epicKey: string
  timestamp: number
  summary?: string
}

export interface DataState {
  // Epic Data
  currentEpic: JiraEpic | null
  currentEpicKey: string
  searchHistory: EpicSearchHistory[]
  
  // UI State
  isLoadingEpic: boolean
  epicError: string | null
  
  // Actions
  setCurrentEpicKey: (epicKey: string) => void
  setCurrentEpic: (epic: JiraEpic | null) => void
  setEpicError: (error: string | null) => void
  setLoadingEpic: (loading: boolean) => void
  
  // History Actions
  addToSearchHistory: (epicKey: string, summary?: string) => void
  clearSearchHistory: () => void
  clearCurrentEpic: () => void
}

export const useDataStore = create<DataState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        currentEpic: null,
        currentEpicKey: '',
        searchHistory: [],
        isLoadingEpic: false,
        epicError: null,

        // Simple Actions
        setCurrentEpicKey: (epicKey) => set({ currentEpicKey: epicKey }, false, 'data/setCurrentEpicKey'),
        setCurrentEpic: (epic) => set({ currentEpic: epic }, false, 'data/setCurrentEpic'),
        setEpicError: (error) => set({ epicError: error }, false, 'data/setEpicError'),
        setLoadingEpic: (loading) => set({ isLoadingEpic: loading }, false, 'data/setLoadingEpic'),

      // Add to search history (keep last 10 searches)
      addToSearchHistory: (epicKey: string, summary?: string) => {
        const { searchHistory } = get()
        
        // Remove existing entry if it exists
        const filteredHistory = searchHistory.filter(item => item.epicKey !== epicKey)
        
        // Add new entry at the beginning
        const newHistory = [
          {
            epicKey,
            summary,
            timestamp: Date.now()
          },
          ...filteredHistory
        ].slice(0, 10) // Keep only last 10 searches

        set({ searchHistory: newHistory }, false, 'data/addToSearchHistory')
      },

      // Clear search history
      clearSearchHistory: () => set({ searchHistory: [] }, false, 'data/clearSearchHistory'),

      // Clear current epic
      clearCurrentEpic: () => set({ 
        currentEpic: null, 
        currentEpicKey: '', 
        epicError: null 
      }, false, 'data/clearCurrentEpic'),
    }),
    {
      name: 'jira-data', // localStorage key
      partialize: (state) => ({ 
        searchHistory: state.searchHistory,
        currentEpicKey: state.currentEpicKey
      }), // Only persist these fields
    }
  ),
  {
    name: 'DataStore', // DevTools name
    serialize: true, // Better serialization for complex objects
  }
))