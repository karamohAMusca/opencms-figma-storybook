// get_design_context(<fileKey>, 1:22), 2026-10-16. Output grezzo (React + Tailwind) di riferimento:
// NON è codice del progetto e non va importato. Descrizione Figma: "Bottone principale. Varianti Primary e Secondary;
// la proprietà Label imposta il testo."

type ButtonProps = {
  className?: string;
  label?: string;
  variant?: "Primary" | "Secondary";
};

export default function Button({ className, label = "Accedi", variant = "Primary" }: ButtonProps) {
  const isSecondary = variant === "Secondary";
  return (
    <div className={className || `${String.raw`content-stretch flex items-center justify-center px-[var(--space\/lg,24px)] py-[12px] relative rounded-[var(--radius\/md,10px)] `}${isSecondary ? String.raw`bg-[var(--surface\/card,white)] border border-[var(--border\/default,#e2e8f0)] border-solid` : String.raw`bg-[var(--brand\/primary,#4f46e5)]`}`} id={isSecondary ? "node-1_20" : "node-1_18"}>
      {variant === "Primary" && (
        <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[15px] text-[color:var(--text\/on-primary,white)] whitespace-nowrap" data-node-id="1:19">
          {label}
        </p>
      )}
      {isSecondary && (
        <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[15px] text-[color:var(--text\/primary,#0f172a)] whitespace-nowrap" data-node-id="1:21">
          {label}
        </p>
      )}
    </div>
  );
}
