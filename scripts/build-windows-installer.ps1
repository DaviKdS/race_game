$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$appDir = Join-Path $releaseDir "StreetRush"
$installerProject = Join-Path $root "installer\StreetRushInstaller"
$installerPublishDir = Join-Path $releaseDir "installer-publish"
$launcher = Join-Path $appDir "StreetRush.exe"
$installer = Join-Path $releaseDir "StreetRushInstaller.exe"
$payloadZip = Join-Path $installerProject "StreetRushPayload.zip"

Remove-Item -LiteralPath $releaseDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $appDir | Out-Null
New-Item -ItemType Directory -Path $installerPublishDir | Out-Null

Push-Location $root
try {
  npm run build
  npx pkg desktop/server.cjs --targets node22-win-x64 --output $launcher
} finally {
  Pop-Location
}

Copy-Item -Path (Join-Path $root "dist") -Destination (Join-Path $appDir "dist") -Recurse
Copy-Item -Path (Join-Path $root "README.md") -Destination (Join-Path $appDir "README.txt")

Remove-Item -LiteralPath $payloadZip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $appDir "*") -DestinationPath $payloadZip -Force

dotnet publish $installerProject -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $installerPublishDir --source "https://api.nuget.org/v3/index.json"
Copy-Item -Path (Join-Path $installerPublishDir "StreetRushInstaller.exe") -Destination $installer -Force

Write-Host "Launcher gerado: $launcher"
Write-Host "Instalador gerado: $installer"
