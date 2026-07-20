import Image from "next/image";

type MProtoBrandProps = {
  /** Compact lockup for narrow bars (e.g. mobile top bar). */
  compact?: boolean;
  /** Light wordmark for dark surfaces (sidebar / hero). */
  onDark?: boolean;
  className?: string;
};

/**
 * M-Proto brand mark + wordmark (no tagline — too small in the sidebar).
 */
export function MProtoBrand({
  compact = false,
  onDark = false,
  className = "",
}: MProtoBrandProps) {
  const wordmark = onDark ? "text-white" : "text-text";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/dashboard/m-proto-mark.png"
        alt=""
        width={130}
        height={130}
        priority
        aria-hidden="true"
        className={
          compact
            ? "h-8 w-8 shrink-0 object-contain"
            : "h-9 w-9 shrink-0 object-contain lg:h-10 lg:w-10"
        }
      />
      <span
        className={
          compact
            ? `font-heading text-sm font-semibold tracking-tight ${wordmark}`
            : `font-heading text-base font-semibold tracking-tight lg:text-[17px] ${wordmark}`
        }
      >
        M-Proto
      </span>
    </div>
  );
}
