interface IconProps { size?: number }

export const Icons = {
  Arrow: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Search: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1"/>
      <path d="m11 11 4 4" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Bag: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 5h10l-1 9H4L3 5Z" stroke="currentColor" strokeWidth="1"/>
      <path d="M6 5V3a2 2 0 1 1 4 0v2" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  User: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1"/>
      <path d="M2 14c1-3 3.5-4 6-4s5 1 6 4" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Whats: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5a6.5 6.5 0 0 0-5.6 9.7L1.5 14.5l3.4-.9A6.5 6.5 0 1 0 8 1.5Z" stroke="currentColor" strokeWidth="1"/>
      <path d="M5.5 6c.5 2 2 3.5 4 4l1-1 1.5.5-.3 1.3c-1.8.3-5.5-.8-6.8-4.8L5.5 5l1.3.5L6.3 7 5.5 6Z" fill="currentColor"/>
    </svg>
  ),
  Plus: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Minus: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1 7h12" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  X: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Upload: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 11V2m0 0L4 6m4-4 4 4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Camera: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="4" width="13" height="9" stroke="currentColor" strokeWidth="1"/>
      <circle cx="8" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M5 4V2.5h6V4" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Check: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Sparkle: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="0.7"/>
    </svg>
  ),
  Grid: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1"/>
      <rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1"/>
      <rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1"/>
      <rect x="8" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  List: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
};
