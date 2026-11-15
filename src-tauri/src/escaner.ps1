# Guion de escáner de Escaneator. Usa WIA, el sistema de escaneo que trae Windows.
param(
    [string]$Accion = "listar",
    [string]$Id = "",
    [int]$Ppp = 200,
    [int]$Color = 1
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$JPEG = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"

function Poner($propiedades, [int]$numero, $valor) {
    foreach ($p in $propiedades) {
        if ($p.PropertyID -eq $numero) {
            try { $p.Value = $valor } catch { }
        }
    }
}

try {
    $gestor = New-Object -ComObject WIA.DeviceManager

    if ($Accion -eq "listar") {
        $lista = @()
        foreach ($d in $gestor.DeviceInfos) {
            if ($d.Type -eq 1) {
                $nombre = ""
                foreach ($p in $d.Properties) { if ($p.Name -eq "Name") { $nombre = [string]$p.Value } }
                $lista += [pscustomobject]@{ id = [string]$d.DeviceID; nombre = $nombre }
            }
        }
        if ($lista.Count -eq 0) { Write-Output "[]" }
        else { Write-Output (ConvertTo-Json -InputObject @($lista) -Compress) }
        exit 0
    }

    $info = $null
    foreach ($d in $gestor.DeviceInfos) { if ($d.DeviceID -eq $Id) { $info = $d } }
    if ($null -eq $info) { throw "No se encuentra el escáner. Comprueba que está encendido y conectado." }

    $equipo = $info.Connect()
    $item = $equipo.Items.Item(1)

    # 6146 = tipo de imagen (1 color, 2 grises) · 6147/6148 = puntos por pulgada
    if ($Color -eq 1) { Poner $item.Properties 6146 1 } else { Poner $item.Properties 6146 2 }
    Poner $item.Properties 6147 $Ppp
    Poner $item.Properties 6148 $Ppp
    # 6151/6152 = tamaño de la zona a escanear en puntos: todo el cristal a la resolución elegida
    $anchoMax = 0; $altoMax = 0
    foreach ($p in $equipo.Properties) {
        if ($p.PropertyID -eq 3074) { $anchoMax = [int]$p.Value }   # ancho del cristal en milésimas de pulgada
        if ($p.PropertyID -eq 3075) { $altoMax = [int]$p.Value }
    }
    if ($anchoMax -gt 0 -and $altoMax -gt 0) {
        Poner $item.Properties 6149 0
        Poner $item.Properties 6150 0
        Poner $item.Properties 6151 ([int]($anchoMax * $Ppp / 1000))
        Poner $item.Properties 6152 ([int]($altoMax * $Ppp / 1000))
    }

    $imagen = $item.Transfer($JPEG)
    if ($imagen.FormatID -ne $JPEG) {
        $proceso = New-Object -ComObject WIA.ImageProcess
        $proceso.Filters.Add($proceso.FilterInfos.Item("Convert").FilterID)
        $proceso.Filters.Item(1).Properties.Item("FormatID").Value = $JPEG
        $proceso.Filters.Item(1).Properties.Item("Quality").Value = 85
        $imagen = $proceso.Apply($imagen)
    }

    $archivo = Join-Path $env:TEMP ("escaneator_" + [guid]::NewGuid().ToString("N") + ".jpg")
    $imagen.SaveFile($archivo)
    $bytes = [System.IO.File]::ReadAllBytes($archivo)
    Remove-Item $archivo -Force
    Write-Output ([Convert]::ToBase64String($bytes))
    exit 0
}
catch {
    Write-Output $_.Exception.Message
    exit 1
}
