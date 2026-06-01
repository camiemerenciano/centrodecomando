'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Empresa { id: string; nome: string; cor: string }

interface EmpresaCtx {
  empresaId: string | null
  empresa: Empresa | null
  empresas: Empresa[]
  loading: boolean
  setEmpresaId: (id: string | null) => void
  reload: () => void
}

const Ctx = createContext<EmpresaCtx>({
  empresaId: null, empresa: null, empresas: [],
  loading: true, setEmpresaId: () => {}, reload: () => {},
})

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [empresas, setEmpresas]   = useState<Empresa[]>([])
  const [empresaId, setId]        = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('empresas').select('id, nome, cor')
      .eq('owner_id', user.id).order('created_at')

    const list: Empresa[] = data ?? []
    setEmpresas(list)

    const saved = typeof window !== 'undefined' ? localStorage.getItem('empresa_id') : null
    if (saved && list.find(e => e.id === saved)) {
      setId(saved)
    } else if (list.length > 0) {
      setId(list[0].id)
      localStorage.setItem('empresa_id', list[0].id)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function setEmpresaId(id: string | null) {
    setId(id)
    if (id) localStorage.setItem('empresa_id', id)
    else localStorage.removeItem('empresa_id')
  }

  const empresa = empresas.find(e => e.id === empresaId) ?? null

  return (
    <Ctx.Provider value={{ empresaId, empresa, empresas, loading, setEmpresaId, reload: load }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEmpresa() { return useContext(Ctx) }
