[CmdletBinding()]
param(
    [string]$SourceDir = "media/photos",
    [string]$OutputDir = "media/photos-optimized",
    [int]$MaxLongEdge = 2560,
    [int]$JpegQuality = 82,
    [string[]]$IncludeFiles = @()
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Get-JpegCodec {
    return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.FormatDescription -eq "JPEG" } |
        Select-Object -First 1
}

function Get-ResizeDimensions {
    param(
        [int]$Width,
        [int]$Height,
        [int]$TargetLongEdge
    )

    $longEdge = [Math]::Max($Width, $Height)
    if ($longEdge -le $TargetLongEdge) {
        return @{
            Width = $Width
            Height = $Height
        }
    }

    $scale = $TargetLongEdge / [double]$longEdge
    return @{
        Width = [Math]::Max(1, [int][Math]::Round($Width * $scale))
        Height = [Math]::Max(1, [int][Math]::Round($Height * $scale))
    }
}

function Save-Jpeg {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$DestinationPath,
        [System.Drawing.Imaging.ImageCodecInfo]$Codec,
        [int]$Quality
    )

    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $qualityParam = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]$Quality)
    $encoderParams.Param[0] = $qualityParam
    $Bitmap.Save($DestinationPath, $Codec, $encoderParams)
    $qualityParam.Dispose()
    $encoderParams.Dispose()
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$jpegCodec = Get-JpegCodec
if (-not $jpegCodec) {
    throw "JPEG codec not available."
}

$resolvedInclude = @{}
foreach ($file in $IncludeFiles) {
    $leaf = Split-Path $file -Leaf
    if ($leaf) {
        $resolvedInclude[$leaf.ToLowerInvariant()] = $true
    }
}

$sourceFiles = Get-ChildItem -LiteralPath $SourceDir -File | Where-Object {
    $isJpeg = @(".jpg", ".jpeg") -contains $_.Extension.ToLowerInvariant()
    if (-not $isJpeg) { return $false }
    if ($resolvedInclude.Count -eq 0) { return $true }
    return $resolvedInclude.ContainsKey($_.Name.ToLowerInvariant())
}

$report = foreach ($file in $sourceFiles) {
    $destinationPath = Join-Path $OutputDir $file.Name
    $sourceImage = [System.Drawing.Image]::FromFile($file.FullName)
    try {
        $dims = Get-ResizeDimensions -Width $sourceImage.Width -Height $sourceImage.Height -TargetLongEdge $MaxLongEdge
        $canvas = New-Object System.Drawing.Bitmap($dims.Width, $dims.Height)
        try {
            $canvas.SetResolution($sourceImage.HorizontalResolution, $sourceImage.VerticalResolution)
            $graphics = [System.Drawing.Graphics]::FromImage($canvas)
            try {
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($sourceImage, 0, 0, $dims.Width, $dims.Height)
            } finally {
                $graphics.Dispose()
            }

            Save-Jpeg -Bitmap $canvas -DestinationPath $destinationPath -Codec $jpegCodec -Quality $JpegQuality
        } finally {
            $canvas.Dispose()
        }

        $optimizedFile = Get-Item -LiteralPath $destinationPath
        if ($optimizedFile.Length -ge $file.Length) {
            Copy-Item -LiteralPath $file.FullName -Destination $destinationPath -Force
            $optimizedFile = Get-Item -LiteralPath $destinationPath
        }
        [PSCustomObject]@{
            Name = $file.Name
            OriginalMB = [Math]::Round($file.Length / 1MB, 2)
            OptimizedMB = [Math]::Round($optimizedFile.Length / 1MB, 2)
            Width = $dims.Width
            Height = $dims.Height
            ReductionPct = [Math]::Round((1 - ($optimizedFile.Length / [double]$file.Length)) * 100, 1)
        }
    } finally {
        $sourceImage.Dispose()
    }
}

$report | Sort-Object Name | Format-Table -AutoSize
