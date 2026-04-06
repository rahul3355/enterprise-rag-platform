"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import type { UserInfo } from "@/lib/api"
import { validateSession } from "@/lib/api"

interface AuthContextType {
  user: User | null
  session: Session | null
  userInfo: UserInfo | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserInfo: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userInfo: null,
  loading: true,
  signOut: async () => {},
  refreshUserInfo: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const refreshUserInfo = useCallback(async () => {
    const currentSession = await supabase.auth.getSession()
    if (currentSession.data.session?.access_token) {
      try {
        const info = await validateSession(currentSession.data.session.access_token)
        setUserInfo(info)
      } catch {
        setUserInfo(null)
      }
    }
  }, [supabase.auth])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.access_token) {
        try {
          const info = await validateSession(session.access_token)
          setUserInfo(info)
        } catch {
          setUserInfo(null)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{ user, session, userInfo, loading, signOut, refreshUserInfo }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
