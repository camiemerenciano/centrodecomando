import { Logo } from '@/components/logo'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[oklch(0.62_0.19_40/0.06)] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[oklch(0.62_0.19_55/0.04)] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3">
            <Logo size={36} className="text-primary" />
            <span className="text-xl font-semibold tracking-tight text-foreground">
              Orbit™
            </span>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
