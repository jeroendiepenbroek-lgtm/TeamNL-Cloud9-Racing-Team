import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AccessStatus {
  has_access: boolean
  status: 'approved' | 'pending' | 'rejected' | 'no_request'
  message: string
  roles: string[]
  is_admin: boolean
}

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  accessStatus: AccessStatus | null
  accessLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInWithDiscord: () => Promise<{ error: Error | null }>
  signInWithGithub: () => Promise<{ error: Error | null }>
  signInWithAzure: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshAccessStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null)
  const [accessLoading, setAccessLoading] = useState(false)

  // Check access status voor een user
  const checkAccessStatus = async (userId: string) => {
    try {
      setAccessLoading(true)
      console.log('[AuthContext] Checking access status for user:', userId)
      
      // STEP 1: Check if user has roles in user_roles table
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      
      if (rolesError) {
        console.error('[AuthContext] Role check failed:', rolesError)
      }
      
      const userRoles = roles?.map(r => r.role) || []
      const isAdmin = userRoles.includes('admin')
      
      console.log('[AuthContext] User roles from user_roles:', userRoles)
      
      // STEP 2: If no roles, check if user is a rider in the riders table
      if (userRoles.length === 0) {
        console.log('[AuthContext] No roles found, checking if user is a team rider...')
        
        // Get user's email from Supabase auth
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const userEmail = authUser?.email
        
        console.log('[AuthContext] User email:', userEmail)
        
        // Check if email matches a rider in the database
        // Special case: jeroen.diepenbroek@gmail.com = rider 150437
        if (userEmail === 'jeroen.diepenbroek@gmail.com') {
          console.log('[AuthContext] ✅ Recognized team member: Jeroen (rider 150437)')
          
          // Try to auto-grant admin role (will fail if table doesn't exist yet)
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'admin',
              granted_by: userId,
              granted_at: new Date().toISOString()
            })
          
          if (insertError) {
            if (insertError.code === '23505') {
              console.log('[AuthContext] Admin role already exists')
            } else if (insertError.code === '42P01') {
              console.warn('[AuthContext] ⚠️ user_roles table does not exist yet!')
              console.warn('[AuthContext] Please run SETUP_SAFE.sql in Supabase')
              // STILL GRANT ACCESS - table will be created later
            } else {
              console.error('[AuthContext] Failed to auto-grant admin role:', insertError)
            }
          } else {
            console.log('[AuthContext] ✅ Auto-granted admin role in database!')
          }
          
          // ALWAYS grant access for Jeroen, regardless of database state
          setAccessStatus({
            has_access: true,
            status: 'approved',
            message: 'Team member access granted (admin)',
            roles: ['admin'],
            is_admin: true
          })
          return
        }
        
        // TODO: Add more rider email checks or link to rider_id
        // For now, deny access if not in user_roles and not recognized rider
        console.log('[AuthContext] ❌ Not a recognized team member')
        setAccessStatus({
          has_access: false,
          status: 'pending',
          message: 'Alleen teamleden hebben toegang. Neem contact op met de admin.',
          roles: [],
          is_admin: false
        })
        
        // Redirect to pending page
        window.location.href = '/auth/pending'
        return
      }
      
      // User has roles - grant access
      setAccessStatus({
        has_access: true,
        status: 'approved',
        message: 'Access granted',
        roles: userRoles,
        is_admin: isAdmin
      })
      
    } catch (error) {
      console.error('[AuthContext] Access status error:', error)
      // On error, deny access for security
      setAccessStatus({
        has_access: false,
        status: 'pending',
        message: 'Error checking access',
        roles: [],
        is_admin: false
      })
    } finally {
      setAccessLoading(false)
    }
  }

  const refreshAccessStatus = async () => {
    if (user?.id) {
      await checkAccessStatus(user.id)
    }
  }

  useEffect(() => {
    console.log('[AuthContext] Initializing...')
    
    // Timeout fallback - als auth na 3 seconden niet reageert, gewoon doorgaan
    const timeout = setTimeout(() => {
      console.warn('[AuthContext] Timeout - continuing without auth')
      setLoading(false)
    }, 3000)

    // Haal huidige sessie op met error handling
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        console.log('[AuthContext] Session loaded:', !!session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Check access status als er een sessie is
        if (session?.user?.id) {
          checkAccessStatus(session.user.id)
        }
      })
      .catch((error) => {
        clearTimeout(timeout)
        console.error('[AuthContext] Session error:', error)
        setLoading(false)
        // Continue zonder auth als Supabase niet bereikbaar is
      })

    // Luister naar auth veranderingen
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[AuthContext] Auth state changed:', _event, !!session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Check access status bij SIGNED_IN event (na Discord/OAuth login)
        if (_event === 'SIGNED_IN' && session?.user?.id) {
          console.log('[AuthContext] New sign-in detected, checking access...')
          checkAccessStatus(session.user.id)
        }
      })

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    } catch (error) {
      clearTimeout(timeout)
      console.error('[AuthContext] Listener error:', error)
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      console.error('Supabase signIn error:', error)
      return { error: error as Error }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      })
      return { error }
    } catch (error) {
      console.error('Google signIn error:', error)
      return { error: error as Error }
    }
  }

  const signInWithDiscord = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      })
      return { error }
    } catch (error) {
      console.error('Discord signIn error:', error)
      return { error: error as Error }
    }
  }

  const signInWithGithub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      })
      return { error }
    } catch (error) {
      console.error('GitHub signIn error:', error)
      return { error: error as Error }
    }
  }

  const signInWithAzure = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'email openid profile',
        }
      })
      return { error }
    } catch (error) {
      console.error('Azure signIn error:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Supabase signOut error:', error)
    }
  }

  const value = {
    session,
    user,
    loading,
    accessStatus,
    accessLoading,
    signIn,
    signInWithGoogle,
    signInWithDiscord,
    signInWithGithub,
    signInWithAzure,
    signOut,
    refreshAccessStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth moet gebruikt worden binnen een AuthProvider')
  }
  return context
}
