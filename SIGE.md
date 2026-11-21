# ElMemento Kobo — adaptación SigeApp de Form Forge

Basado en [Form Forge for ODK](https://github.com/punkch/form-forge) (MIT, de punkch). Este archivo lista lo
propio, para poder traer versiones nuevas del original (`git fetch upstream && git merge upstream/main`) sin
perder nada, y deja los pendientes.

## Regla
Repositorio **público**: solo datos ficticios. Nada de agrícolas, cuarteles, usuarios ni catálogos reales.

## Dónde está lo propio
- `src/sige/` — todo lo nuevo (paleta por categorías, panel izquierdo, ejemplos, preview→selección).
- Ganchos mínimos en archivos originales, marcados con el comentario `SIGE`:
  `views/FormEditorView.vue`, `views/FormLibraryView.vue`, `components/palette/QuestionPalette.vue`,
  `components/properties/{PropertyPanel,BasicSection}.vue` (+ `tests/component/basic-section-default-image.spec.ts`), `components/preview/{PreviewHost,PreviewPanel}.vue`,
  `theme/constants.ts` (acento rosa), `i18n/locales/es/{library,appSettings}.json` (nombre y créditos),
  `index.html` y `vite.config.ts` (nombre), `tests/unit/theme-constants.spec.ts`.
- `scripts/make-sige-ejemplos.py` — genera los ejemplos agrícolas (XLSForm con datos inventados).
- `ElMementoKobo*.bat|.ps1` — encender/apagar en Windows (servidor de desarrollo precalentado).
- No tocar `src/styles/generated/` ni `LICENSE`/`NOTICE.md` (créditos obligatorios).

## Pendientes (para implementar después)
Inspirados en Elementor. Orden sugerido: 1 → 3.

1. **Edición en línea (inline) sobre el celular y el lienzo.** Doble clic en una etiqueta, ayuda u opción para
   escribirla ahí mismo (Enter confirma, Esc cancela), con deshacer de un solo paso. Sobre el lienzo del árbol es
   directo; sobre el celular requiere un recuadro flotante, porque lo dibuja el motor oficial de ODK
   (`@getodk/web-forms`). Reutilizar `form.updateNode` (una entrada de deshacer) y la alineación de
   `src/sige/preview/selectFromPreview.ts` para saber qué nodo se tocó.
2. ~~**Menú contextual**~~ ✅ hecho (`src/sige/contextMenu/`; falta «Juntar con la siguiente pantalla»: decidir qué pasa con `relevant` y el nombre del grupo que desaparece). Original: (clic derecho sobre una pregunta, en el lienzo y en el celular): Duplicar, Eliminar,
   Subir/Bajar, Agregar antes/después, Agregar dentro (grupos), Cambiar tipo, Copiar/Cortar/Pegar, «Juntar con la
   siguiente pantalla». Mostrar los atajos al lado (Ctrl+D, Supr, Alt+↑/↓). Usar las acciones que ya existen en
   `useSelectionActions` y `form.*`; no duplicar lógica.
3. ~~**Valor inicial amigable**~~ ✅ hecho (`src/sige/defaultPresets.ts` + `DefaultPresetField.vue`, gancho SIGE en
   `BasicSection`). Hora actual en `time` NO se ofrece (experimental en Kobo). Falta, si se quiere, `once(today())`
   en un `calculate`: el patrón no existe en el repo, se omitió.
4. Flujo por plaga: ¿presente? → ¿en qué estructuras? → conteo de la principal (siempre) → aviso si llega a fruto.
5. Plantilla/bloque de conteo por nivel (NA0–NA4) nativo, avisos de compatibilidad con Kobo, tablas relacionadas
   más visibles, buscador Ctrl+K.
6. Publicar compilado (GitHub Pages del fork) y arranque automático en Windows — requieren visto bueno.

## Plan de funciones del constructor (2026-11-21, de la investigación en C:\sigeapp\kobo\investigacion_*.md)
Nada de esto está construido. Ctrl+K y el historial de versiones NO existen en el fork (solo en el prototipo antiguo; la tabla `snapshots` se guarda pero no hay pantalla).
**Ola 1 (costo S, sin dependencias):** edición en línea en el árbol · aviso fijo «la vista previa no es KoboCollect» ·
reglas de lint nuevas (required/constraint sin mensaje, `relevant` imposible, escalera NA0-NA4 incompleta) ·
hoja de atajos (Ctrl+?) y buscador Ctrl+K · indicador del punto de soltado al arrastrar (CSS) · selector de dispositivo (tamaños/girar).
**Ola 2 (S-M):** panel de problemas con «Ir al problema» · pestaña «Lógica» (lista de todos los relevant/constraint/calculate, solo lectura) ·
historial como lista con Restaurar (sobre `snapshots`) · pegar solo los ajustes (Ctrl+Shift+V) · menú `@` para recordar respuestas en etiquetas (verificar valor alternativo en Kobo).
**Ola 3 (M):** bloque insertable de conteo NA0-NA4 + flujo por plaga (guardar selección como bloque en templates-repo) · reglas de destino al arrastrar (canMoveIn).
**Descartado:** arrastrar elementos nuevos al celular (lo dibuja el motor ODK, costo L), widgets globales, versiones/notas compartidas (requieren tablas o servicio).

## Registro de procedencia (qué se usó de otros repos)
Regla (2026-11-21): basarse en open source y anotar aquí TODO lo tomado: código, patrón o idea, con licencia. Sin dependencias nuevas por defecto.
| Origen | Licencia | Qué se usó | Dónde |
|---|---|---|---|
| Form Forge for ODK (punkch/form-forge) | MIT | Todo el fork: editor, motor XLSForm, vista previa | repo completo (LICENSE y NOTICE.md intactos) |
| @getodk/web-forms (ODK) | Apache-2.0 | Motor oficial de la vista previa del celular | dependencia original |
| PrimeVue, Pinia, Vue, SortableJS (vue-draggable-plus) | MIT | Interfaz, estado, arrastrar y soltar | dependencias originales |
| Documentación de ODK | CC BY 4.0 | Ayuda en la app (crédito en el cajón de ayuda y Ajustes → Acerca de) | NOTICE.md |
| Elementor (elementor/elementor) | GPL-3.0 | SOLO IDEAS de organización (panel por pestañas, menú contextual, buscador); ningún código copiado | src/sige/ (propio) |
| Informes de investigación 2026-11-21 | — | Ideas de SurveyJS, Craft.js, Formbricks, GrapesJS, AppSheet, Glide, etc.: solo ideas, fuentes en `C:\sigeapp\kobo\investigacion_*.md` | plan de funciones (sin código aún) |
Pendiente: al construir una función inspirada en un proyecto concreto, agregar su fila aquí en el mismo commit.
