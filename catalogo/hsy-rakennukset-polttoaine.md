# Combustible de calefacción por edificio

| Campo | Valor |
|---|---|
| id | `hsy-rakennukset-polttoaine` |
| Proveedor | HSY |
| Familia | Ambiental / energía |
| Documentación | https://kartta.hsy.fi/ |
| Recurso probado | WFS `kartta.hsy.fi` · capa `ilmasto_ja_energia:rakennukset_polttoaine` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 154.586 polígonos · campos `polttoaine`, `lamm_tapa` (primera fila nula) |
| Licencia | Por verificar (sin ficha HRI localizada) |
| **personas** | Indirectamente si se cruza con direcciones. |
| Semáforo | 🟡 amarillo (licencia sin confirmar) |
| Vigencia | Sin fecha en la capa — por verificar |
| Qué pregunta ayuda a responder | Mezcla energética de la calefacción por zona. |
| Límites y trampas | Duplica en parte `hsy-rakennukset-paivittyva` (`lammitysaine_s`). Elegir uno y documentar por qué. |
| Siguiente paso | Comparar completitud contra el registro de edificios. |
