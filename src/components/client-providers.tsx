'use client'

import { EmpresaProvider } from '@/contexts/empresa-context'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <EmpresaProvider>{children}</EmpresaProvider>
}
