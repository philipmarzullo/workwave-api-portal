import waiveMark from '@/assets/waive-mark.svg'

export function WaiveIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src={waiveMark}
      alt="WAIve"
      width={size}
      height={size}
      className={className}
    />
  )
}
