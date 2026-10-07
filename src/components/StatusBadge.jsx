const ESTILOS = {
  configuracao: {
    texto: 'Em configuração',
    classes: 'bg-white/5 text-arena-muted border-white/10',
  },
  inscricoes: {
    texto: 'Inscrições abertas',
    classes: 'bg-arena-secondary/10 text-arena-secondary border-arena-secondary/30',
  },
  sorteio: {
    texto: 'Sorteio',
    classes: 'bg-arena-secondary/10 text-arena-secondary border-arena-secondary/30',
  },
  grupos: {
    texto: 'Fase de grupos',
    classes: 'bg-arena-primary/10 text-arena-primary border-arena-primary/30',
  },
  mata_mata: {
    texto: 'Mata-mata',
    classes: 'bg-arena-primary/10 text-arena-primary border-arena-primary/30',
  },
  finalizado: {
    texto: 'Finalizado',
    classes: 'bg-white/5 text-arena-muted border-white/10',
  },
  cancelado: {
    texto: 'Cancelado',
    classes: 'bg-arena-danger/10 text-arena-danger border-arena-danger/30',
  },
}

export default function StatusBadge({ status }) {
  const estilo = ESTILOS[status] ?? ESTILOS.configuracao
  const ativo = ['inscricoes', 'sorteio', 'grupos', 'mata_mata'].includes(status)

  return (
    <span
      className={`recorte inline-flex items-center gap-1.5 font-display px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${estilo.classes}`}
    >
      {ativo && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current opacity-40" />
        </span>
      )}
      {estilo.texto}
    </span>
  )
}
