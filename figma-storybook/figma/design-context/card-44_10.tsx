// get_design_context(<fileKey>, 44:10), 2026-10-22. Output grezzo (React + Tailwind) di riferimento:
// NON è codice del progetto e non va importato. Descrizione Figma: "Card con immagine, titolo, testo e Button Primary annidato (etichetta modificabile dall'istanza esposta). In OpenCms: content type fx-card."

type ButtonProps = {
  className?: string;
  label?: string;
  variant?: "Primary";
};

function Button({ className, label = "Accedi", variant = "Primary" }: ButtonProps) {
  return (
    <div className={className || "bg-[var(--brand\\/primary,#4f46e5)] content-stretch flex items-center justify-center px-[var(--space\\/lg,24px)] py-[12px] relative rounded-[var(--radius\\/md,10px)]"} data-node-id="1:18">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[15px] text-[color:var(--text\/on-primary,white)] whitespace-nowrap" data-node-id="1:19">
        {label}
      </p>
    </div>
  );
}

type CardProps = {
  className?: string;
  text?: string;
  title?: string;
};

export default function Card({ className, text = "Accedi alla nuova area riservata per gestire il tuo account e le tue preferenze.", title = "Scopri le novità" }: CardProps) {
  return (
    <div className={className || "bg-[var(--surface\\/card,white)] border border-[var(--border\\/default,#e2e8f0)] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[var(--radius\\/lg,16px)] shadow-[0px_4px_16px_0px_rgba(15,23,41,0.06)] w-[342px]"} data-node-id="44:10" data-name="Card">
      <div className="bg-[var(--surface\/background,#f8fafc)] h-[192px] relative shrink-0 w-full" data-node-id="44:11" data-name="Image" />
      <div className="content-stretch flex flex-col gap-[var(--space\/md,16px)] items-start overflow-clip p-[var(--space\/lg,24px)] relative shrink-0 w-full" data-node-id="44:12" data-name="Body">
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[var(--space\/sm,8px)] items-start leading-[normal] not-italic overflow-clip relative shrink-0 w-full" data-node-id="44:13" data-name="Texts">
          <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[20px] text-[color:var(--text\/primary,#0f172a)] w-full" data-node-id="44:14">
            {title}
          </p>
          <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[15px] text-[color:var(--text\/secondary,#64748b)] w-full" data-node-id="44:15">
            {text}
          </p>
        </div>
        <Button className="bg-[var(--brand\/primary,#4f46e5)] content-stretch flex items-center justify-center px-[var(--space\/lg,24px)] py-[12px] relative rounded-[var(--radius\/md,10px)] shrink-0" label="Scopri di più" />
      </div>
    </div>
  );
}
