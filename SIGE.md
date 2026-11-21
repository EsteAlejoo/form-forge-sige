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
2. **Menú contextual** (clic derecho sobre una pregunta, en el lienzo y en el celular): Duplicar, Eliminar,
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
