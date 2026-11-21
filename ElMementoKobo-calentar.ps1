# Precalienta el servidor de desarrollo: pide todos los modulos de la app una vez,
# para que el servidor los compile ahora y el navegador no quede en blanco.
param([string]$Base = 'http://127.0.0.1:5173')

$vistos = @{}
$cola = New-Object System.Collections.Queue
$cola.Enqueue('/')
$cola.Enqueue('/src/main.ts')
$total = 0
$inicio = Get-Date

while ($cola.Count -gt 0 -and $vistos.Count -lt 2500) {
  $ruta = $cola.Dequeue()
  if ($vistos.ContainsKey($ruta)) { continue }
  $vistos[$ruta] = $true
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri ($Base + $ruta) -TimeoutSec 300
  } catch { continue }
  $total++
  if ($total % 25 -eq 0) {
    $seg = [int]((Get-Date) - $inicio).TotalSeconds
    Write-Host ("  Preparando... {0} archivos ({1} s)" -f $total, $seg)
  }
  $tipo = [string]$r.Headers['Content-Type']
  if ($tipo -notmatch 'javascript|typescript|text/html') { continue }
  $texto = [string]$r.Content
  foreach ($m in [regex]::Matches($texto, '(?:from|import)\s*\(?\s*["'']([^"'']+)["'']')) {
    $u = $m.Groups[1].Value
    if ($u.StartsWith('/') -and -not $u.StartsWith('//')) { $cola.Enqueue($u) }
  }
}
Write-Host ("  Listo: {0} archivos en {1} s." -f $total, [int]((Get-Date) - $inicio).TotalSeconds)
