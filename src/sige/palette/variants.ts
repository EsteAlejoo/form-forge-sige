/**
 * Paleta por categorías con variantes (aporte SigeApp).
 *
 * Cada variante es un tipo del registro de Form Forge + un «preajuste»
 * (apariencia, etiqueta, validación, valor inicial). Así «Texto largo» es un
 * `text` con `multiline`, y «Hoy» es un `date` con valor inicial `today()`.
 * Los textos son solo en español (capa propia, no usa vue-i18n) para no
 * chocar con los catálogos del proyecto original.
 */
export type SampleKind =
  | 'text' | 'multiline' | 'number' | 'select' | 'radio' | 'columns' | 'checks'
  | 'likert' | 'date' | 'time' | 'photo' | 'gps' | 'map' | 'media' | 'note'
  | 'calc' | 'group' | 'repeat' | 'barcode' | 'signature'

export interface VariantPreset {
  /** Apariencia XLSForm (p. ej. `minimal`, `columns`, `multiline`). */
  appearance?: string
  /** Etiqueta inicial de la pregunta. */
  label?: string
  /** Expresión de validación. */
  constraint?: string
  constraintMessage?: string
  /** Valor inicial (puede ser una expresión como `today()`). */
  defaultValue?: string
  /** Para `calculate`: expresión inicial. */
  calculation?: string
}

export interface Variant {
  id: string
  category: string
  /** Tipo del registro de Form Forge. */
  type: string
  title: string
  description: string
  sample: SampleKind
  preset: VariantPreset
  /** Apariencia soportada por KoboCollect (Android). `false` = solo web. */
  collect?: boolean
}

export interface Category {
  id: string
  title: string
  description: string
  icon: string
}

export const CATEGORIES: Category[] = [
  { id: 'texto', title: 'Texto', description: 'Respuestas escritas', icon: 'pi pi-align-left' },
  { id: 'numeros', title: 'Números', description: 'Conteos y medidas', icon: 'pi pi-hashtag' },
  { id: 'opciones', title: 'Opciones', description: 'Elegir de una lista', icon: 'pi pi-list' },
  { id: 'fecha', title: 'Fecha y hora', description: 'Calendario y reloj', icon: 'pi pi-calendar' },
  { id: 'medios', title: 'Ubicación y medios', description: 'GPS, fotos, audio, archivos', icon: 'pi pi-camera' },
  { id: 'estructura', title: 'Estructura', description: 'Pantallas, grupos y tablas', icon: 'pi pi-sitemap' },
  { id: 'logica', title: 'Cálculos y lógica', description: 'Calculados y avisos', icon: 'pi pi-calculator' },
]

const v = (
  category: string, id: string, type: string, title: string, description: string,
  sample: SampleKind, preset: VariantPreset = {}, collect = true,
): Variant => ({ id, category, type, title, description, sample, preset, collect })

export const VARIANTS: Variant[] = [
  // Texto
  v('texto', 'text', 'text', 'Texto corto', 'Una línea', 'text', { label: 'Texto' }),
  v('texto', 'textml', 'text', 'Texto largo', 'Varias líneas', 'multiline', { appearance: 'multiline', label: 'Observaciones' }),
  v('texto', 'numbers', 'text', 'Teclado numérico', 'Texto con dígitos', 'text', { appearance: 'numbers', label: 'Código' }),
  v('texto', 'masked', 'text', 'Texto oculto', 'Como contraseña', 'text', { appearance: 'masked', label: 'Clave' }),
  // Números
  v('numeros', 'integer', 'integer', 'Entero', 'Conteos, mínimo 0', 'number', { label: 'Cantidad', constraint: '. >= 0', constraintMessage: 'Debe ser 0 o mayor' }),
  v('numeros', 'intrange', 'integer', 'Entero con mín y máx', 'Entre 0 y 100', 'number', { label: 'Valor (0-100)', constraint: '. >= 0 and . <= 100', constraintMessage: 'Entre 0 y 100' }),
  v('numeros', 'decimal', 'decimal', 'Decimal', 'Medidas', 'number', { label: 'Medida' }),
  v('numeros', 'thousands', 'integer', 'Con separador de miles', 'Cifras grandes', 'number', { appearance: 'thousands-sep', label: 'Monto' }),
  v('numeros', 'percent', 'integer', 'Porcentaje', 'Entero entre 0 y 100', 'number', { label: 'Porcentaje (%)', constraint: '. >= 0 and . <= 100', constraintMessage: 'Entre 0 y 100' }),
  v('numeros', 'range', 'range', 'Deslizador', 'Valor en una barra', 'number', { label: 'Nivel' }),
  // Opciones
  v('opciones', 'one', 'select_one', 'Lista (una opción)', 'Botones de radio', 'radio', { label: 'Elige una opción' }),
  v('opciones', 'onemin', 'select_one', 'Desplegable', 'Menú de una línea', 'select', { appearance: 'minimal', label: 'Elige una opción' }),
  v('opciones', 'onecols', 'select_one', 'En columnas', 'Varias columnas', 'columns', { appearance: 'columns', label: 'Elige una opción' }),
  v('opciones', 'likert', 'select_one', 'Escala', 'Una línea, estilo escala', 'likert', { appearance: 'likert', label: '¿Con qué frecuencia?' }, false),
  v('opciones', 'autoc', 'select_one', 'Con buscador', 'Escribir para filtrar', 'select', { appearance: 'autocomplete', label: 'Busca y elige' }),
  v('opciones', 'many', 'select_multiple', 'Varias (casillas)', 'Marcar varias', 'checks', { label: 'Marca las que apliquen' }),
  v('opciones', 'manycols', 'select_multiple', 'Varias en columnas', 'Casillas en columnas', 'columns', { appearance: 'columns', label: 'Marca las que apliquen' }),
  v('opciones', 'manymin', 'select_multiple', 'Varias desplegable', 'Lista que se abre', 'select', { appearance: 'minimal', label: 'Marca las que apliquen' }),
  v('opciones', 'rank', 'rank', 'Ordenar', 'Poner en orden', 'radio', { label: 'Ordena por prioridad' }),
  // Fecha y hora
  v('fecha', 'date', 'date', 'Fecha', 'Calendario', 'date', { label: 'Fecha' }),
  v('fecha', 'datetoday', 'date', 'Fecha de hoy', 'Ya viene rellena', 'date', { label: 'Fecha', defaultValue: 'today()' }),
  v('fecha', 'monthyear', 'date', 'Mes y año', 'Sin día', 'date', { appearance: 'month-year', label: 'Mes y año' }),
  v('fecha', 'year', 'date', 'Solo año', 'Número de año', 'date', { appearance: 'year', label: 'Año' }),
  v('fecha', 'time', 'time', 'Hora', 'Reloj', 'time', { label: 'Hora' }),
  v('fecha', 'datetime', 'datetime', 'Fecha y hora', 'Las dos', 'date', { label: 'Fecha y hora' }),
  // Ubicación y medios
  v('medios', 'gps', 'geopoint', 'Ubicación GPS', 'Punto automático', 'gps', { label: 'Ubicación' }),
  v('medios', 'gpsmap', 'geopoint', 'Marcar en mapa', 'Tocar el mapa', 'map', { appearance: 'placement-map', label: 'Marca el lugar' }),
  v('medios', 'trace', 'geotrace', 'Recorrido', 'Línea en el mapa', 'map', { label: 'Recorrido' }),
  v('medios', 'shape', 'geoshape', 'Polígono', 'Superficie en el mapa', 'map', { label: 'Superficie' }),
  v('medios', 'photo', 'image', 'Foto', 'Cámara o galería', 'photo', { label: 'Foto' }),
  v('medios', 'annotate', 'image', 'Foto con dibujo', 'Dibujar encima', 'photo', { appearance: 'annotate', label: 'Foto' }),
  v('medios', 'signature', 'image', 'Firma', 'Firmar en pantalla', 'signature', { appearance: 'signature', label: 'Firma' }),
  v('medios', 'camonly', 'image', 'Solo cámara', 'Sin galería', 'photo', { appearance: 'new', label: 'Foto' }),
  v('medios', 'audio', 'audio', 'Audio', 'Grabación', 'media', { label: 'Audio' }),
  v('medios', 'video', 'video', 'Video', 'Grabación', 'media', { label: 'Video' }),
  v('medios', 'file', 'file', 'Archivo', 'Adjuntar', 'media', { label: 'Archivo' }),
  v('medios', 'barcode', 'barcode', 'Código de barras', 'Escanear', 'barcode', { label: 'Código' }),
  // Estructura
  v('estructura', 'note', 'note', 'Título o aviso', 'Solo texto', 'note', { label: 'Texto del aviso' }),
  v('estructura', 'screen', 'group', 'Pantalla nueva', 'Varias preguntas en una vista', 'group', { appearance: 'field-list', label: 'Pantalla' }),
  v('estructura', 'group', 'group', 'Grupo', 'Agrupa sin cambiar pantallas', 'group', { label: 'Grupo' }),
  v('estructura', 'repeat', 'repeat', 'Tabla repetible', 'Filas que se agregan', 'repeat', { label: 'Fila' }),
  // Cálculos y lógica
  v('logica', 'calc', 'calculate', 'Cálculo oculto', 'No se ve; calcula', 'calc', { calculation: '' }),
  v('logica', 'ack', 'acknowledge', 'Confirmación', 'Casilla «Acepto»', 'checks', { label: 'Confirmo que los datos son correctos' }),
]

export const variantsOf = (categoryId: string): Variant[] =>
  VARIANTS.filter((x) => x.category === categoryId)
