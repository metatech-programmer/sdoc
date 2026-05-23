import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    iconStart,
    iconEnd,
    fullWidth,
    disabled,
    children,
    className,
    ...rest
  },
  ref
) {
  const classes = [
    styles.btn,
    styles[`v_${variant}`],
    styles[`s_${size}`],
    fullWidth ? styles.full : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : iconStart ? (
        <span className={styles.icon}>{iconStart}</span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {iconEnd ? <span className={styles.icon}>{iconEnd}</span> : null}
    </button>
  );
});
