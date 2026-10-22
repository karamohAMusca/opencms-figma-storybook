// get_design_context(<fileKey>, 1:23), 2026-10-16. Output grezzo (React + Tailwind) di riferimento:
// NON è codice del progetto e non va importato. Descrizione Figma: "Campo di testo con etichetta. Proprietà: Label, Placeholder."

type InputProps = {
  className?: string;
  label?: string;
  placeholder?: string;
};

export default function Input({ className, label = "Email", placeholder = "nome@esempio.it" }: InputProps) {
  return (
    <div className={className || "content-stretch flex flex-col gap-[var(--space\\/sm,8px)] items-start relative w-[326px]"} data-node-id="1:23" data-name="Input">
      <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[13px] text-[color:var(--text\/primary,#0f172a)] whitespace-nowrap" data-node-id="1:24">
        {label}
      </p>
      <div className="bg-[var(--surface\/card,white)] border border-[var(--border\/default,#e2e8f0)] border-solid content-stretch flex items-start overflow-clip px-[16px] py-[14px] relative rounded-[var(--radius\/md,10px)] shrink-0 w-full" data-node-id="1:25" data-name="Field">
        <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[15px] text-[color:var(--text\/secondary,#64748b)] whitespace-nowrap" data-node-id="1:26">
          {placeholder}
        </p>
      </div>
    </div>
  );
}
