/**
 * Logo SDOC — versión mark (icono solo) y wordmark (icono + texto).
 * Inline SVG para control total de color vía currentColor.
 */
interface LogoProps {
  variant?: "mark" | "wordmark";
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export function Logo({ variant = "mark", size = 32, className, ariaLabel = "SDOC" }: LogoProps) {
  if (variant === "wordmark") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 180 40"
        width={size * 4.5}
        height={size}
        fill="none"
        className={className}
        role="img"
        aria-label={ariaLabel}
      >
        <rect width="40" height="40" rx="10" fill="currentColor" />
        <path
          d="M11 10h12a6 6 0 0 1 6 6v14H17a6 6 0 0 1-6-6V10z"
          fill="var(--sdoc-amber, #F59E0B)"
        />
        <path d="M19 10v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M15 21h10M15 25h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <text
          x="52"
          y="27"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="22"
          fontWeight="600"
          fill="currentColor"
          letterSpacing="-0.5"
        >
          SDOC
        </text>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" />
      <path
        d="M11 10h12a6 6 0 0 1 6 6v14H17a6 6 0 0 1-6-6V10z"
        fill="var(--sdoc-amber, #F59E0B)"
      />
      <path d="M19 10v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 21h10M15 25h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
