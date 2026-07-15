[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Pptx,

    [Parameter(Mandatory = $true)]
    [string]$OutputDir,

    [Parameter(Mandatory = $true)]
    [string]$ProfileDir,

    [string]$SofficePath
)

$ErrorActionPreference = 'Stop'
$pptxPath = (Resolve-Path -LiteralPath $Pptx).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDir)
$profilePath = [System.IO.Path]::GetFullPath($ProfileDir)
New-Item -ItemType Directory -Force -Path $outputPath, $profilePath | Out-Null

if (-not $SofficePath) {
    $command = Get-Command soffice.exe -ErrorAction SilentlyContinue
    if ($command) {
        $SofficePath = $command.Source
    }
}

if (-not $SofficePath) {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'LibreOffice\program\soffice.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'LibreOffice\program\soffice.exe')
    )
    $SofficePath = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}

if (-not $SofficePath -or -not (Test-Path -LiteralPath $SofficePath)) {
    throw 'LibreOffice soffice.exe was not found.'
}

$profileUri = 'file:///' + ($profilePath -replace '\\', '/')
$arguments = @(
    "-env:UserInstallation=$profileUri",
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    $outputPath,
    $pptxPath
)

& $SofficePath @arguments
if ($LASTEXITCODE -ne 0) {
    throw "LibreOffice PDF export failed with exit code $LASTEXITCODE."
}

$expected = Join-Path $outputPath ([System.IO.Path]::GetFileNameWithoutExtension($pptxPath) + '.pdf')
if (-not (Test-Path -LiteralPath $expected)) {
    throw "LibreOffice completed without creating the expected PDF: $expected"
}

(Resolve-Path -LiteralPath $expected).Path
