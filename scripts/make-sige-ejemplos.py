"""Genera los ejemplos agrícolas (XLSForm) con datos INVENTADOS, aptos para publicar.

Uso:  python -I scripts/make-sige-ejemplos.py src/sige/ejemplos  (monitoreo_plagas.xlsx se genera aparte)
Salida: calidad_fruta.xlsx, aforo_riego.xlsx, asistencia.xlsx
"""
import sys
from pathlib import Path

import openpyxl

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
COLS = ['type', 'name', 'label', 'hint', 'required', 'relevant', 'constraint', 'constraint_message',
        'choice_filter', 'appearance', 'calculation', 'default', 'repeat_count', 'parameters']


def zz(v):
    return "if(${%s}='',0,${%s})" % (v, v)


class Form:
    def __init__(self, titulo, form_id):
        self.titulo, self.form_id = titulo, form_id
        self.survey, self.choices = [], []
        self.L('si_no', [('si', 'Sí'), ('no', 'No')])

    def R(self, type_, name, label='', **kw):
        row = {'type': type_, 'name': name, 'label': label}
        row.update(kw)
        self.survey.append(row)

    def G(self, name, label, fn):
        self.R('begin_group', name, label, appearance='field-list')
        fn()
        self.R('end_group', name + '_end')

    def L(self, lista, filas):
        for f in filas:
            n, lab = f[0], f[1]
            extra = f[2] if len(f) > 2 else {}
            self.choices.append({'list_name': lista, 'name': n, 'label': lab, **extra})

    def save(self, archivo):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'survey'
        ws.append(COLS)
        for r in self.survey:
            ws.append([r.get(c, '') for c in COLS])
        cc = ['list_name', 'name', 'label']
        for c in self.choices:
            for k in c:
                if k not in cc:
                    cc.append(k)
        w2 = wb.create_sheet('choices')
        w2.append(cc)
        for c in self.choices:
            w2.append([c.get(k, '') for k in cc])
        w3 = wb.create_sheet('settings')
        w3.append(['form_title', 'form_id', 'version', 'default_language'])
        w3.append([self.titulo, self.form_id, '1', 'es'])
        wb.save(OUT / archivo)
        print('ok', archivo, len(self.survey), 'filas', len(self.choices), 'opciones')


# ---------------------------------------------------------------- Calidad de fruta
f = Form('Calidad de fruta (ejemplo)', 'calidad_fruta_ejemplo')
R = f.R
f.G('p1', 'Paso 1 · Origen', lambda: (
    R('date', 'fecha', 'Fecha', default='today()'),
    R('select_one predios', 'predio', 'Predio', appearance='minimal'),
    R('select_one cuarteles', 'cuartel', 'Cuartel', choice_filter='predio=${predio}', appearance='minimal'),
    R('select_one especies', 'especie', 'Especie', appearance='minimal'),
    R('select_one variedades', 'variedad', 'Variedad', choice_filter='especie=${especie}', appearance='minimal'),
    R('integer', 'n_muestra', 'N° de muestra', constraint='. >= 1', constraint_message='Desde 1')))
f.G('p2', 'Paso 2 · Muestra', lambda: (
    R('integer', 'n_frutos', 'Frutos revisados', constraint='. >= 1', constraint_message='Desde 1'),
    R('select_one calibres', 'calibre', 'Calibre', appearance='columns-pack'),
    R('select_one colores', 'color', 'Color', appearance='columns-pack'),
    R('decimal', 'brix', '°Brix', constraint='. >= 0 and . <= 30', constraint_message='Entre 0 y 30'),
    R('decimal', 'firmeza', 'Firmeza (lb)', constraint='. >= 0'),
    R('decimal', 'peso', 'Peso promedio (g)', constraint='. >= 0')))
f.G('p3', 'Paso 3 · Defectos', lambda: (
    R('select_multiple def_cond', 'def_condicion', 'Defectos de condición', appearance='columns-pack'),
    R('integer', 'n_cond', 'Frutos con defecto de condición', constraint='. >= 0 and . <= ${n_frutos}', constraint_message='No puede superar los frutos revisados'),
    R('select_multiple def_cal', 'def_calidad', 'Defectos de calidad', appearance='columns-pack'),
    R('integer', 'n_cal', 'Frutos con defecto de calidad', constraint='. >= 0 and . <= ${n_frutos}', constraint_message='No puede superar los frutos revisados'),
    R('text', 'otro_defecto', 'Describe el otro defecto', relevant="selected(${def_condicion}, 'otro') or selected(${def_calidad}, 'otro')"),
    R('calculate', 'pct_cond', '', calculation='if(${n_frutos} > 0, round(100 * %s div ${n_frutos}, 1), 0)' % zz('n_cond')),
    R('calculate', 'pct_cal', '', calculation='if(${n_frutos} > 0, round(100 * %s div ${n_frutos}, 1), 0)' % zz('n_cal')),
    R('calculate', 'categoria', '', calculation="if(${pct_cond} > 5, 'Rechazo', if(${pct_cal} > 10, 'Segunda', 'Primera'))"),
    R('note', 'n_pct', 'Condición: **${pct_cond} %** · Calidad: **${pct_cal} %** · Categoría sugerida (umbrales de ejemplo): **${categoria}**')))
f.G('p4', 'Paso 4 · Cierre', lambda: (
    R('image', 'foto', 'Foto de la muestra', appearance='annotate'),
    R('text', 'obs', 'Observaciones', appearance='multiline'),
    R('image', 'firma', 'Firma del responsable', appearance='signature'),
    R('geopoint', 'gps', 'Ubicación')))
f.L('predios', [('norte', 'Predio Norte'), ('sur', 'Predio Sur')])
f.L('cuarteles', [('c1', 'Cuartel 1', {'predio': 'norte'}), ('c2', 'Cuartel 2', {'predio': 'norte'}),
                  ('c3', 'Cuartel 3', {'predio': 'sur'}), ('c4', 'Cuartel 4', {'predio': 'sur'})])
f.L('especies', [('limonero', 'Limonero'), ('naranjo', 'Naranjo'), ('mandarino', 'Mandarino')])
f.L('variedades', [('var_a', 'Variedad A', {'especie': 'limonero'}), ('var_b', 'Variedad B', {'especie': 'limonero'}),
                   ('var_c', 'Variedad C', {'especie': 'naranjo'}), ('var_d', 'Variedad D', {'especie': 'naranjo'}),
                   ('var_e', 'Variedad E', {'especie': 'mandarino'}), ('var_f', 'Variedad F', {'especie': 'mandarino'})])
f.L('calibres', [('extra', 'Extra'), ('grande', 'Grande'), ('mediano', 'Mediano'), ('pequeno', 'Pequeño')])
f.L('colores', [('verde', 'Verde'), ('pinton', 'Pintón'), ('maduro', 'Maduro')])
f.L('def_cond', [('pudricion', 'Pudrición'), ('golpe', 'Golpe'), ('rajadura', 'Rajadura'), ('deshidratacion', 'Deshidratación'), ('otro', 'Otro')])
f.L('def_cal', [('roce', 'Roce'), ('cicatriz', 'Cicatriz'), ('mancha', 'Mancha'), ('deformidad', 'Deformidad'),
                ('color', 'Color insuficiente'), ('trips', 'Daño de trips'), ('otro', 'Otro')])
f.save('calidad_fruta.xlsx')

# ---------------------------------------------------------------- Aforo de riego
f = Form('Aforo de riego (ejemplo)', 'aforo_riego_ejemplo')
R = f.R
f.G('p1', 'Paso 1 · Sector', lambda: (
    R('date', 'fecha', 'Fecha', default='today()'),
    R('time', 'hora', 'Hora'),
    R('select_one predios', 'predio', 'Predio', appearance='minimal'),
    R('select_one sectores', 'sector', 'Sector de riego', choice_filter='predio=${predio}', appearance='minimal'),
    R('select_one fuentes', 'fuente', 'Fuente de agua', appearance='columns-pack'),
    R('select_one metodos', 'metodo', 'Método de aforo', appearance='columns-pack')))
f.G('p2', 'Paso 2 · Medición', lambda: (
    R('decimal', 'volumen', 'Volumen recogido (L)', relevant="${metodo} = 'volumetrico'", constraint='. > 0'),
    R('decimal', 'tiempo', 'Tiempo (s)', relevant="${metodo} = 'volumetrico'", constraint='. > 0'),
    R('decimal', 'velocidad', 'Velocidad del agua (m/s)', relevant="${metodo} = 'molinete'", constraint='. >= 0'),
    R('decimal', 'area', 'Área de la sección (m²)', relevant="${metodo} = 'molinete'", constraint='. >= 0'),
    R('decimal', 'lectura', 'Caudal del medidor (L/s)', relevant="${metodo} = 'medidor'", constraint='. >= 0'),
    R('decimal', 'presion', 'Presión (bar)', constraint='. >= 0'),
    R('calculate', 'caudal', '', calculation="round(if(${metodo}='volumetrico', if(%s > 0, %s div %s, 0), if(${metodo}='molinete', %s * %s * 1000, %s)), 2)"
      % (zz('tiempo'), zz('volumen'), zz('tiempo'), zz('velocidad'), zz('area'), zz('lectura'))),
    R('calculate', 'diseno', '', calculation="instance('sectores')/root/item[name=${sector}]/caudal_diseno"),
    R('calculate', 'pct', '', calculation='if(%s > 0, round(100 * %s div %s, 0), 0)' % (zz('diseno'), zz('caudal'), zz('diseno'))),
    R('note', 'n_caudal', 'Caudal: **${caudal} L/s** · diseño: **${diseno} L/s** · **${pct} %** del diseño')))
f.G('p3', 'Paso 3 · Condición', lambda: (
    R('select_one estados', 'estado', 'Estado del sistema', appearance='columns-pack'),
    R('select_one si_no', 'fugas', '¿Hay fugas?', appearance='columns-pack'),
    R('text', 'ubicacion_fuga', '¿Dónde está la fuga?', relevant="${fugas} = 'si'"),
    R('select_one si_no', 'filtros', '¿Filtros limpios?', appearance='columns-pack'),
    R('text', 'obs', 'Observaciones', appearance='multiline')))
f.G('p4', 'Paso 4 · Cierre', lambda: (
    R('image', 'foto', 'Foto del punto de aforo', appearance='annotate'),
    R('geopoint', 'gps', 'Ubicación'),
    R('image', 'firma', 'Firma del regador', appearance='signature')))
f.L('predios', [('norte', 'Predio Norte'), ('sur', 'Predio Sur')])
f.L('sectores', [('s1', 'Sector 1', {'predio': 'norte', 'caudal_diseno': '12'}),
                 ('s2', 'Sector 2', {'predio': 'norte', 'caudal_diseno': '8'}),
                 ('s3', 'Sector 3', {'predio': 'sur', 'caudal_diseno': '15'})])
f.L('fuentes', [('canal', 'Canal'), ('pozo', 'Pozo'), ('tranque', 'Tranque'), ('vertiente', 'Vertiente')])
f.L('metodos', [('volumetrico', 'Volumétrico'), ('molinete', 'Molinete'), ('medidor', 'Medidor')])
f.L('estados', [('bueno', 'Bueno'), ('regular', 'Regular'), ('malo', 'Malo')])
f.save('aforo_riego.xlsx')

# ---------------------------------------------------------------- Asistencia
f = Form('Asistencia de personal (ejemplo)', 'asistencia_ejemplo')
R = f.R
f.G('p1', 'Paso 1 · Jornada', lambda: (
    R('date', 'fecha', 'Fecha', default='today()'),
    R('select_one cuadrillas', 'cuadrilla', 'Cuadrilla', appearance='columns-pack'),
    R('select_one cuarteles', 'cuartel', 'Cuartel', appearance='minimal'),
    R('select_one labores', 'labor', 'Labor', appearance='minimal')))
f.G('p2', 'Paso 2 · Trabajador', lambda: (
    R('select_one trabajadores', 'trabajador', 'Trabajador', choice_filter='cuadrilla=${cuadrilla}', appearance='minimal'),
    R('select_one estados', 'estado', 'Estado', appearance='columns-pack'),
    R('time', 'hora_entrada', 'Hora de entrada', relevant="${estado} = 'presente'"),
    R('select_one jornadas', 'jornada', 'Jornada', relevant="${estado} = 'presente'", appearance='columns-pack'),
    R('text', 'motivo', 'Motivo', relevant="${estado} != 'presente' and ${estado} != ''")))
f.G('p3', 'Paso 3 · Producción', lambda: (
    R('calculate', 'horas', '', calculation="instance('jornadas')/root/item[name=${jornada}]/horas"),
    R('calculate', 'mide', '', calculation="instance('labores')/root/item[name=${labor}]/mide_rendimiento"),
    R('note', 'n_horas', 'Horas de la jornada: **${horas}**', relevant="${horas} != ''"),
    R('integer', 'kilos', 'Kilos cosechados', relevant="${mide} = 'si'", constraint='. >= 0', constraint_message='Desde 0'),
    R('text', 'obs', 'Observaciones', appearance='multiline')))
f.G('p4', 'Paso 4 · Cierre', lambda: (
    R('image', 'foto', 'Foto (opcional)', appearance='annotate'),
    R('geopoint', 'gps', 'Ubicación'),
    R('image', 'firma', 'Firma del supervisor', appearance='signature')))
f.L('cuadrillas', [('a', 'Cuadrilla A'), ('b', 'Cuadrilla B'), ('c', 'Cuadrilla C')])
f.L('cuarteles', [('c1', 'Cuartel 1'), ('c2', 'Cuartel 2'), ('c3', 'Cuartel 3')])
f.L('labores', [('cosecha', 'Cosecha', {'mide_rendimiento': 'si'}), ('poda', 'Poda', {'mide_rendimiento': 'no'}),
                ('riego', 'Riego', {'mide_rendimiento': 'no'}), ('raleo', 'Raleo', {'mide_rendimiento': 'no'})])
f.L('trabajadores', [('t1', 'Persona 01', {'cuadrilla': 'a'}), ('t2', 'Persona 02', {'cuadrilla': 'a'}),
                     ('t3', 'Persona 03', {'cuadrilla': 'b'}), ('t4', 'Persona 04', {'cuadrilla': 'b'}),
                     ('t5', 'Persona 05', {'cuadrilla': 'c'}), ('t6', 'Persona 06', {'cuadrilla': 'c'})])
f.L('estados', [('presente', 'Presente'), ('ausente', 'Ausente'), ('permiso', 'Permiso'), ('licencia', 'Licencia')])
f.L('jornadas', [('completa', 'Completa', {'horas': '8'}), ('media', 'Media jornada', {'horas': '4'}), ('extra', 'Con horas extra', {'horas': '10'})])
f.save('asistencia.xlsx')
