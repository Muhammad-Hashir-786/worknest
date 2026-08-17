export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f1ed] p-3 lg:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1500px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/10 lg:grid-cols-[1.05fr_.95fr] lg:min-h-[calc(100vh-2.5rem)]">
        <section className="relative hidden overflow-hidden bg-[#181716] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
          <div className="relative"><div className="flex items-center gap-3 text-lg font-bold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3342f] text-base shadow-lg shadow-red-950/30">W</span>WorkNest</div><p className="mt-20 max-w-md text-5xl font-bold leading-[1.05] tracking-[-0.05em]">Make work feel <span className="text-[#ff756d]">clear.</span></p><p className="mt-6 max-w-sm text-base leading-7 text-neutral-400">A calm, focused home for projects, clients, and teams that move important work forward.</p></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur"><p className="text-sm leading-6 text-neutral-300">“WorkNest gives our team one source of truth without getting in the way.”</p><div className="mt-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#e3342f] text-xs font-bold">AM</span><div><p className="text-sm font-semibold">Amelia Moore</p><p className="text-xs text-neutral-500">Operations Lead</p></div></div></div>
        </section>
        <section className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center px-5 py-12 sm:px-10 lg:min-h-0 lg:px-16 xl:px-24"><div className="auth-enter w-full max-w-md">{children}</div></section>
      </div>
    </div>
  );
}
