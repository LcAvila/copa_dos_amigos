export default function Loading({ texto = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative size-10">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-arena-secondary border-t-arena-primary" />
        <span className="absolute inset-0 m-auto size-2 animate-[pulsar_1.2s_ease-in-out_infinite] rounded-full bg-arena-primary" />
      </div>
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-arena-muted">
        {texto}
      </p>
    </div>
  )
}
