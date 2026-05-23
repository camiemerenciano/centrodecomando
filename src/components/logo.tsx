export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <clipPath id="logo-front">
          <rect x="-100" y="100" width="500" height="300" transform="rotate(33, 100, 100)" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="100" rx="112" ry="30"
        transform="rotate(-33, 100, 100)"
        stroke="currentColor" strokeWidth="8.5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="66"
        stroke="currentColor" strokeWidth="8.5" />
      <ellipse cx="100" cy="100" rx="112" ry="30"
        transform="rotate(-33, 100, 100)"
        stroke="currentColor" strokeWidth="8.5" strokeLinecap="round"
        clipPath="url(#logo-front)" />
    </svg>
  )
}
