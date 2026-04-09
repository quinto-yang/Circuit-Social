type TabButtonProps = {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  dot?: boolean;
  onClick: () => void;
};

export function TabButton({ active, label, icon, badge, dot, onClick }: TabButtonProps) {
  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex min-h-0 flex-col items-center justify-center rounded-xl px-1.5 py-0.5 text-[11px] font-medium leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
        active
          ? "bg-[linear-gradient(180deg,rgba(25,195,125,0.2)_0%,rgba(25,195,125,0.1)_100%)] text-jade-deep"
          : "text-slate-400"
      )}
    >
      {dot ? (
        <>
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
          <span className="absolute right-2 top-1 h-2 w-2 animate-ping rounded-full bg-red-400" />
        </>
      ) : null}
      {badge ? (
        <span className="absolute right-1.5 top-0.5 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-coral px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
          {badge}
        </span>
      ) : null}
      {icon}
      <span className="mt-px max-w-full truncate px-0.5">{label}</span>
    </button>
  );
}

