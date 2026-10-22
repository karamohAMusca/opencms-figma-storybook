// get_design_context(<fileKey>, 1:27), 2026-10-16. Output grezzo (React + Tailwind) di riferimento:
// NON è codice del progetto e non va importato. Button e Input sono in button-1_22.tsx e input-1_23.tsx (identici);
// qui c'è solo la schermata, con le istanze e le loro proprietà.

export default function LoginMobile() {
  return (
    <div className="bg-[var(--surface\/background,#f8fafc)] content-stretch flex flex-col gap-[var(--space\/xl,32px)] items-center justify-center px-[24px] relative size-full" data-node-id="1:27" data-name="Login – Mobile">
      <div className="content-stretch flex flex-col gap-[var(--space\/sm,8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="1:28" data-name="Header">
        <div className="bg-[var(--brand\/primary,#4f46e5)] content-stretch flex items-center justify-center overflow-clip relative rounded-[var(--radius\/lg,16px)] shrink-0 size-[56px]" data-node-id="1:29" data-name="Logo">
          <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[24px] text-white whitespace-nowrap" data-node-id="1:30">
            A
          </p>
        </div>
        <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[28px] text-[color:var(--text\/primary,#0f172a)] text-center whitespace-nowrap" data-node-id="1:31">
          Bentornato
        </p>
        <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[15px] text-[color:var(--text\/secondary,#64748b)] text-center whitespace-nowrap" data-node-id="1:32">
          Accedi per continuare sul tuo account
        </p>
      </div>
      <div className="bg-[var(--surface\/card,white)] border border-[var(--border\/default,#e2e8f0)] border-solid content-stretch flex flex-col gap-[var(--space\/md,16px)] items-start overflow-clip p-[var(--space\/lg,24px)] relative rounded-[var(--radius\/lg,16px)] shadow-[0px_4px_16px_0px_rgba(15,23,41,0.06)] shrink-0 w-full" data-node-id="1:33" data-name="Card">
        <Input className="content-stretch flex flex-col gap-[var(--space\/sm,8px)] items-start relative shrink-0 w-full" />
        <Input className="content-stretch flex flex-col gap-[var(--space\/sm,8px)] items-start relative shrink-0 w-full" label="Password" placeholder="••••••••" />
        <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[13px] text-[color:var(--brand\/primary,#4f46e5)] text-right w-full" data-node-id="1:42">
          Password dimenticata?
        </p>
        <Button className="bg-[var(--brand\/primary,#4f46e5)] content-stretch flex items-center justify-center px-[var(--space\/lg,24px)] py-[12px] relative rounded-[var(--radius\/md,10px)] shrink-0 w-full" />
        <Button className="bg-[var(--surface\/card,white)] border border-[var(--border\/default,#e2e8f0)] border-solid content-stretch flex items-center justify-center px-[var(--space\/lg,24px)] py-[12px] relative rounded-[var(--radius\/md,10px)] shrink-0 w-full" label="Continua con Google" variant="Secondary" />
      </div>
      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--text\/secondary,#64748b)] text-center whitespace-nowrap" data-node-id="1:47">
        Non hai un account? Registrati
      </p>
    </div>
  );
}
