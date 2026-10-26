// Iconos de línea del Figma «Biblioteca de una nueva vida»: un solo trazo, sin relleno.
const TRAZOS = {
  brote: <><path d="M24 44V22" /><path d="M24 24c-9 2-14-4-12-10 2-5 10-5 12 2" /><path d="M24 24c9 2 14-4 12-10-2-5-10-5-12 2" /></>,
  casa: <><path d="M8 22 24 9l16 13" /><path d="M11 20v20h26V20" /><path d="M20 40V29h8v11" /></>,
  rieles: <><path d="M14 10v28M14 18h16v20M8 26h28M30 26v12M8 38h6M30 32h6" /><circle cx="14" cy="26" r="2.6" fill="currentColor" /><circle cx="30" cy="26" r="2.6" fill="currentColor" /></>,
  libro: <><path d="M24 14c-5-4-11-4-16-2v26c5-2 11-2 16 2 5-4 11-4 16-2V12c-5-2-11-2-16 2Z" /><path d="M24 14v26" /></>,
  lupa: <><circle cx="21" cy="21" r="11" /><path d="m29 29 11 11M21 15v12M15 21h12" /></>,
  ficha: <><rect x="9" y="12" width="30" height="24" rx="1.5" /><path d="M15 20h18M15 26h18M15 32h10" /><circle cx="24" cy="12" r="2.4" /></>,
}

export function Icono({ nombre, tamano = 40, titulo }) {
  return <svg className="icono" width={tamano} height={tamano} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" role={titulo ? 'img' : undefined} aria-hidden={titulo ? undefined : true} aria-label={titulo}>{TRAZOS[nombre]}</svg>
}

export function Flecha({ izquierda = false }) {
  return <svg className="flecha" width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{izquierda ? <path d="M15 5H1m4-4L1 5l4 4" /> : <path d="M1 5h14m-4-4 4 4-4 4" />}</svg>
}

export function Cerrar() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" /></svg>
}
