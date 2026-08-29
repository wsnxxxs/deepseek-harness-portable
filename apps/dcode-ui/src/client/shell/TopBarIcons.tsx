interface TopBarIconProps {
  readonly size?: number
  readonly className?: string
}

export function TopBarDownloadIcon({ size = 14, className }: TopBarIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 16 16"
      width={size}
    >
      <path
        d="M8 2.75V9.5M5.45 6.95 8 9.5l2.55-2.55"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
      <path
        d="M2.35 8.85v2.6c0 .8.65 1.45 1.45 1.45h8.4c.8 0 1.45-.65 1.45-1.45v-2.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  )
}

export function TopBarListIcon({ size = 16, className }: TopBarIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 16 16"
      width={size}
    >
      <circle cx="3.75" cy="4.25" r="1.85" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7.75 4.25h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      <circle cx="3.75" cy="11.75" r="1.85" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7.75 11.75h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
    </svg>
  )
}
