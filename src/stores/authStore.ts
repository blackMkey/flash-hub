// Auth Store - manages authentication state, token, and user info
import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { TokenStorage } from '@/lib/tokenStorage'
import { testConnection, type User } from '@/services/jiraFetchers'

export interface AuthState {
  // State
  isConnected: boolean
  encodedToken: string | null
  user: User | null
  isLoading: boolean
  isLoadingExistingToken: boolean
  hasCheckedExistingAuth: boolean
  error: string | null

  // Actions
  setLoading: (loading: boolean) => void
  setLoadingExistingToken: (loading: boolean) => void
  setHasCheckedExistingAuth: (checked: boolean) => void
  setError: (error: string | null) => void
  setConnected: (connected: boolean) => void
  setUser: (user: User | null) => void
  
  // Async Actions
  saveToken: (originalToken: string) => Promise<void>
  testConnection: () => Promise<boolean>
  clearAuth: () => void
  checkExistingAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        isConnected: false,
        encodedToken: null,
        user: null,
        isLoading: false,
        isLoadingExistingToken: false,
        hasCheckedExistingAuth: false,
        error: null,

        // Simple Actions
        setLoading: (loading) => set({ isLoading: loading }, false, 'auth/setLoading'),
        setLoadingExistingToken: (loading) => set({ isLoadingExistingToken: loading }, false, 'auth/setLoadingExistingToken'),
        setHasCheckedExistingAuth: (checked) => set({ hasCheckedExistingAuth: checked }, false, 'auth/setHasCheckedExistingAuth'),
        setError: (error) => set({ error }, false, 'auth/setError'),
        setConnected: (connected) => set({ isConnected: connected }, false, 'auth/setConnected'),
        setUser: (user) => set({ user }, false, 'auth/setUser'),

      // Save token (encode and store)
      saveToken: async (originalToken: string) => {
        try {
          set({ isLoading: true, error: null }, false, 'auth/saveToken/start')

          // Encode token via API
          const response = await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: originalToken.trim() }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to encode token')
          }

          const data = await response.json()
          
          // Save encoded token to localStorage
          TokenStorage.saveEncodedToken(data.encodedToken)
          
          set({ 
            encodedToken: data.encodedToken,
            isConnected: true,
            isLoading: false 
          }, false, 'auth/saveToken/success')

          // Test connection and get user info
          await get().testConnection()
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save token'
          set({ 
            error: errorMessage, 
            isLoading: false,
            isConnected: false 
          }, false, 'auth/saveToken/error')
          throw error
        }
      },

      // Test connection and get user info
      testConnection: async () => {
        try {
          set({ isLoading: true, error: null }, false, 'auth/testConnection/start')
          
          const result = await testConnection()
          if (result.user) {
            result.user.emailAddress = result.user.name?.toLocaleLowerCase() + '@fpt.com'
          }

          if (result.success && result.user) {
            set({ 
              isConnected: true, 
              user: result.user as User,
              isLoading: false 
            })
            return true
          } else {
            set({ 
              isConnected: false, 
              error: result.error || 'Connection failed',
              isLoading: false 
            })
            get().clearAuth()
            return false
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Connection test failed'
          set({ 
            error: errorMessage, 
            isConnected: false,
            isLoading: false 
          })
          get().clearAuth()
          return false
        }
      },

      // Clear authentication
      clearAuth: () => {
        TokenStorage.clearToken()
        set({
          isConnected: false,
          encodedToken: null,
          user: null,
          error: null,
          hasCheckedExistingAuth: false // Reset flag so auth can be checked again
        }, false, 'auth/clearAuth')
      },

      // Check existing authentication on app start
      checkExistingAuth: async () => {
        const state = get()
        
        // Skip if already checked during this session
        if (state.hasCheckedExistingAuth) {
          return
        }

        try {
          set({ isLoadingExistingToken: true, error: null }, false, 'auth/checkExistingAuth/start')
          
          const existingToken = TokenStorage.getEncodedToken()
          if (existingToken) {
            set({ encodedToken: existingToken }, false, 'auth/checkExistingAuth/foundToken')
            const isValid = await get().testConnection()
            if (!isValid) {
              get().clearAuth()
            }
          }
        } catch (error) {
          console.error('Failed to check existing auth:', error)
          get().clearAuth()
        } finally {
          set({ 
            isLoadingExistingToken: false,
            hasCheckedExistingAuth: true
          })
        }
      },
    }),
    {
      name: 'jira-auth', // localStorage key
      partialize: (state) => ({ 
        encodedToken: state.encodedToken,
        user: state.user 
      }), // Only persist these fields
    }
  ),
  {
    name: 'AuthStore', // DevTools name
    serialize: true, // Better serialization for complex objects
  }
))