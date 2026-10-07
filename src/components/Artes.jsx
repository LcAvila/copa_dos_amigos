// Kit de artes de futebol — SVGs desenhados localmente (sem imagens externas).

export function Bola({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="bola-grad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d7e0f0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bola-grad)" stroke="#141a2b" strokeWidth="3" />
      <path
        fill="#141a2b"
        d="M32 25.6 39.9 29.8l-2.6 8.7H26.7l-2.6-8.7z"
      />
      <g stroke="#141a2b" strokeWidth="5" strokeLinecap="round">
        <line x1="32" y1="25.6" x2="32" y2="5" />
        <line x1="39.9" y1="29.8" x2="54" y2="17.4" />
        <line x1="37.3" y1="38.5" x2="46.9" y2="50" />
        <line x1="26.7" y1="38.5" x2="17.1" y2="50" />
        <line x1="24.1" y1="29.8" x2="10" y2="17.4" />
      </g>
      <g fill="#141a2b">
        <circle cx="32" cy="4.6" r="2.6" />
        <circle cx="53.2" cy="16.9" r="2.6" />
        <circle cx="46.4" cy="51.3" r="2.6" />
        <circle cx="17.6" cy="51.3" r="2.6" />
        <circle cx="10.8" cy="16.9" r="2.6" />
      </g>
    </svg>
  )
}

export function Trofeu({ className = '' }) {
  return (
    <svg viewBox="0 0 96 72" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="trof-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe28a" />
          <stop offset="45%" stopColor="#ffcf3f" />
          <stop offset="100%" stopColor="#e8a117" />
        </linearGradient>
      </defs>
      <path
        d="M33 40c0 7 12 10 15 10s15-3 15-10"
        fill="none"
        stroke="url(#trof-grad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M33 40 27 57h42l-6-17z" fill="url(#trof-grad)" />
      <path d="M27 57v4h42v-4z" fill="#e8a117" />
      <path
        d="M18 13c-7 6-8 17-1 25 5-1 9-8 10-13s0-10-9-12z"
        fill="url(#trof-grad)"
        stroke="#e8a117"
        strokeWidth="2"
      />
      <path
        d="M78 13c7 6 8 17 1 25-5-1-9-8-10-13s0-10 9-12z"
        fill="url(#trof-grad)"
        stroke="#e8a117"
        strokeWidth="2"
      />
      <circle cx="48" cy="22" r="10" fill="url(#trof-grad)" stroke="#e8a117" strokeWidth="2" />
      <path
        d="M40.5 21.5c0-4.4 3.4-8 7.5-8s7.5 3.6 7.5 8c0 5.5-3.4 8-7.5 8s-7.5-2.5-7.5-8z"
        fill="none"
        stroke="#e8a117"
        strokeWidth="2"
      />
      <path d="M48 21.5v8" stroke="#e8a117" strokeWidth="2" />
      <path d="M48 31v8" stroke="url(#trof-grad)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function Taca({ className = '' }) {
  return (
    <svg viewBox="0 0 80 74" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="taca-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe28a" />
          <stop offset="50%" stopColor="#ffcf3f" />
          <stop offset="100%" stopColor="#e8a117" />
        </linearGradient>
      </defs>
      <path
        d="M20 22c0 12 9 18 20 18s20-6 20-18"
        fill="none"
        stroke="url(#taca-grad)"
        strokeWidth="4"
      />
      <path d="M20 22h40" stroke="#e8a117" strokeWidth="4" />
      <path
        d="M13 18c-5 6-5 16 1 21 4-2 7-9 8-15s-3-8-9-6z"
        fill="url(#taca-grad)"
        stroke="#e8a117"
        strokeWidth="2"
      />
      <path
        d="M67 18c5 6 5 16-1 21-4-2-7-9-8-15s3-8 9-6z"
        fill="url(#taca-grad)"
        stroke="#e8a117"
        strokeWidth="2"
      />
      <rect x="37" y="40" width="6" height="8" rx="1" fill="#ffcf3f" />
      <rect x="30" y="48" width="20" height="4" rx="1" fill="#ffcf3f" />
      <rect x="34" y="52" width="12" height="5" rx="1" fill="#ffcf3f" />
      <rect x="26" y="57" width="28" height="4" rx="1" fill="#ffe28a" />
    </svg>
  )
}

const CORES_MEDALHA = {
  ouro: {
    fita: '#2e5fb0',
    disco: '#ffcf3f',
    disco2: '#e8a117',
    brilho: '#ffe28a',
    estrela: '#fff',
  },
  prata: {
    fita: '#2e8cff',
    disco: '#dbe2ef',
    disco2: '#aab4c8',
    brilho: '#f4f7fc',
    estrela: '#eef2f8',
  },
  bronze: {
    fita: '#b06a2a',
    disco: '#e39b5b',
    disco2: '#b06a2a',
    brilho: '#ebbb85',
    estrela: '#f7e3cd',
  },
}

export function Medalha({ className = '', cor = 'ouro' }) {
  const c = CORES_MEDALHA[cor] ?? CORES_MEDALHA.ouro
  return (
    <svg viewBox="0 0 56 72" className={className} aria-hidden="true">
      <path d="M14 0 28 24 42 0z" fill={c.fita} />
      <path d="M14 0 28 24l-14 2z" fill={c.disco2} opacity="0.35" />
      <path d="M14 8l14 16 14-16z" fill={c.disco2} opacity="0.5" />
      <circle cx="28" cy="46" r="20" fill={c.disco} stroke={c.disco2} strokeWidth="3" />
      <circle cx="28" cy="46" r="14" fill="none" stroke={c.brilho} strokeWidth="1.6" opacity="0.8" />
      <path
        d="M28 38.5 30.4 43l4.9.5-3.6 3.4 1 4.8-4.7-2.5-4.7 2.5 1-4.8-3.6-3.4 4.9-.5z"
        fill={c.estrela}
      />
    </svg>
  )
}

export function Escudo({ className = '' }) {
  return (
    <svg viewBox="0 0 56 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="esc-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2e8cff" />
          <stop offset="100%" stopColor="#1b5fd0" />
        </linearGradient>
      </defs>
      <path d="M28 2 52 10v24c0 12-10 22-24 28C14 56 4 46 4 34V10z" fill="url(#esc-grad)" stroke="#74a8ff" strokeWidth="3" />
      <path d="M28 2 52 10v24c0 12-10 22-24 28-5-3-8-6-10-9 4 2 8 3 12 3 10 0 19-8 19-18V10z" fill="#1b5fd0" opacity="0.5" />
      <path d="M14 38 28 16l14 22z" fill="#10172b" />
      <path d="M28 16l14 22H14z" fill="#ffcf3f" />
      <path d="M28 16 14 38l7-1 7-7 7 7 7 1z" fill="#ffe28a" opacity="0.5" />
      <path d="M28 30l2.5 4.5 5.1.6-3.7 3.5 1 5-4.9-2.6-4.9 2.6 1-5-3.7-3.5 5.1-.6z" fill="#fff" />
      <path d="M13 8h8l-2 6-4-2z" fill="#ffcf3f" />
      <path d="M36 8h8l-2 6-4-2z" fill="#ffcf3f" />
    </svg>
  )
}

export function Estadio({ className = '' }) {
  return (
    <svg viewBox="0 0 96 56" className={className} aria-hidden="true">
      <circle cx="48" cy="42" r="10" fill="none" stroke="#2e8cff" strokeWidth="2" />
      <circle cx="48" cy="42" r="16" fill="none" stroke="#2e8cff" strokeWidth="1.4" opacity="0.5" />
      <path d="M48 50v6" stroke="#2e8cff" strokeWidth="2" />
      <rect x="18" y="40" width="11" height="6" rx="1" fill="#131b30" stroke="#2e8cff" strokeWidth="1.5" />
      <rect x="67" y="40" width="11" height="6" rx="1" fill="#131b30" stroke="#2e8cff" strokeWidth="1.5" />
      <path d="M18 44h11M67 44h11" stroke="#2e8cff" strokeWidth="1.5" />
      <path d="M14 36c0-8 6-10 14-10 8 0 13 10 20 10s9-8 14-8 11 5 11 12v14H14z" fill="#0b1120" stroke="#2e8cff" strokeWidth="2" />
      <path d="M16 44c0-6 5-8 10-8 4 0 6 4 9 4s5-6 9-5 5 8 9 8 7-10 12-9 6 9 6 9H16z" fill="#131b30" />
    </svg>
  )
}

export function CoroaLiga({ className = '' }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <path d="M6 32 14 8 24 22 32 4 40 22 50 8 58 32z" fill="#ffcf3f" stroke="#e8a117" strokeWidth="2" strokeLinejoin="round" />
      <rect x="16" y="32" width="32" height="5" rx="1.5" fill="#ffcf3f" />
      <path d="M18 32h28l-2-6H20z" fill="#e8a117" opacity="0.4" />
      <path d="M32 4v-2m0 0h-4m4 0h4" stroke="#ffe28a" strokeWidth="2" />
    </svg>
  )
}