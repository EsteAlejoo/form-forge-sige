# ElMemento Kobo — adaptación SigeApp de Form Forge

Basado en [Form Forge for ODK](https://github.com/punkch/form-forge) (MIT, de punkch). Este archivo lista lo
propio, para poder traer versiones nuevas del original (`git fetch upstream && git merge upstream/main`) sin
perder nada, y deja los pendientes.

## Regla
Repositorio **público**: solo datos ficticios. Nada de agrícolas, cuarteles, usuarios ni catálogos reales.

## Dónde está lo propio
- `src/sige/` — todo lo nuevo (paleta por categorías, panel izquierdo, ejemplos, preview→selección).
- Ganchos mínimos en archivos originales, marcados con el comentario `SIGE`:
  `views/FormEditorView.vue`, `components/canvas/NodeList.vue`, `components/canvas/TreeNodeCard.vue`, `views/FormLibraryView.vue`, `components/palette/QuestionPalette.vue`,
  `components/properties/{PropertyPanel,BasicSection}.vue` (+ `tests/component/basic-section-default-image.spec.ts`), `components/preview/{PreviewHost,PreviewPanel,PreviewToolbar}.vue`, `src/sige/commands/bridge.ts`,
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
| Documentación ODK (form-datasets) | CC BY 4.0 | Patrón `instance('lista')/root/item[...]` para «Traer columna» | src/sige/relaciones/lookupExpression.ts |
| Investigación de tablas (AppSheet, Airtable, HoPF, ptype-cat) | solo ideas | Llave = única y sin vacíos; conversión guiada con vista previa | src/sige/relaciones/ |
| Elementor (idea) | GPL-3.0 | Patrón «clic en el lienzo abre su panel», solo idea | src/sige/preview/ |
| Elementor (idea) | GPL-3.0 | «Copy/Paste Style»: copiar la apariencia y pegarla en otros elementos, solo idea | src/sige/contextMenu/menuActions.ts |
Pendiente: al construir una función inspirada en un proyecto concreto, agregar su fila aquí en el mismo commit.

## Estado de construcción (2026-11-21)
Hecho en la rama sigeapp-adaptacion (sin push): menú contextual, valor inicial amigable, edición en línea de la etiqueta, reglas de revisión Kobo (src/sige/lint), lupa Ctrl+K (src/sige/commands), tablas relacionadas fase 1 (src/sige/relaciones: importar tabla y «Traer columna», más profileColumns).
Hecho también: clic en el celular que lleva a la pestaña/campo de la parte tocada (src/sige/preview/previewParts.ts, detectPart.ts) + conmutador Editar/Probar. Selectores frágiles: asterisco y medios (clases del Vue de web-forms; si fallan, solo selecciona).
Siguen: motor de sugerencias de origen de datos (usa profileColumns), repeat por opción de catálogo, validación por rango desde tabla, edición en línea en el celular, hoja de atajos, panel de problemas «Ir al problema», historial con Restaurar. Antes: probar en Kobo real instance()/pulldata con 3.000+ filas.

## Decisión 2026-11-25
Vista previa: por defecto «ajustar a ancho de panel» (preset fill; migración única con clave localStorage sige.preview.init2) y se abre sola al seleccionar un área (FormEditorView.vue). Sin verificar en navegador aún.

## Decisión 2026-11-25 (2)
Botón «Sincronizar» en la barra de la vista previa (src/sige/preview/sync.ts, localStorage sige.preview.sync, por defecto encendido): gobierna los dos sentidos (seleccionar en el constructor → desplaza la vista previa y la abre; tocar la vista previa → selecciona). Formulario Kobo (C:\sigeapp\kobo\build_xlsform.py): en observaciones cuantificables las casillas dicen «Escala 0..4» (sin «NA»); aviso de suma ≠ 10 reescrito («Contaste X estructuras…»). `${campo}` literal en la vista previa del constructor es normal: no calcula; en Kobo sí.

## Decisión 2026-11-26
Barra de la vista previa: «Sincronizar» es solo icono (texto «Sincronizar paneles» en hover); el ancho (celular/tablet/panel) es un desplegable (testids preview-width-menu y preview-preset-<x>; e2e actualizado). Menú contextual: «Copiar estilo / Pegar estilo» = copia body.appearance; el destino conserva solo lo que su tipo admite; contenedor↔pregunta no se transfiere. Sin prueba unitaria aún (adaptAppearance no exportada).

## Decisión 2026-11-26 (2)
Arrastrar tarjetas de «Elementos» (paleta por categorías) al esquema o a la vista previa: src/sige/palette/variantDrop.ts (HTML5 nativo, sin dependencias; inserta antes/después según la mitad bajo el cursor; vacío = al final; indicador sige-drop-before/after). Probado con eventos simulados en navegador. La paleta «Lista» ya arrastraba al esquema (SortableJS original) pero no a la vista previa. Selector de apariencia (AppearancePicker): nombres amigables (Botón sin círculo = no-buttons, Selección rápida = quick, Escala Likert = likert), combinación «Botones en fila» (columns-pack no-buttons) y nombres en español para todas las apariencias. Especie vacía en el ejemplo = comportamiento correcto del filtro en cascada (requiere elegir Agrícola); se agregó hint «Primero elige la agrícola» en build_xlsform.py.

## Decisión 2026-11-26 (3)
Separador de pantallas: clic derecho en una pregunta → «Empezar pantalla nueva aquí» (menuActions.splitScreenAt/canSplitScreen). Esa pregunta y las siguientes de su lista pasan a un grupo field-list nuevo, justo después; si ya estaba en una pantalla, la parte en dos; desactivado si es la primera de su pantalla. Probado en navegador (Ubicación → Ubicación + Pantalla). Ya existía la tarjeta «Pantalla nueva» (Estructura). Idea de procedencia: saltos de página de SurveyJS/Typeform (solo idea). Pendiente: botón visible en el esquema entre tarjetas y «Juntar pantallas».
