'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface Empresa { id: string; nome: string; cor: string; team?: boolean }

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
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setId]      = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/empresas')
      if (!res.ok) { setLoading(false); return }
      const list: Empresa[] = await res.json()
      setEmpresas(list)

      const saved = typeof window !== 'undefined' ? localStorage.getItem('empresa_id') : null
      if (saved && list.find(e => e.id === saved)) {
        setId(saved)
      } else if (list.length > 0) {
        setId(list[0].id)
        localStorage.setItem('empresa_id', list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [])

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
