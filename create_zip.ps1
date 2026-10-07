Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "d:\smART FLOW AI"
$zipPath = "d:\smART FLOW AI\smartflow-ai.zip"

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$allFiles = Get-ChildItem -Path $baseDir -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules(\\|$)' -and
    $_.FullName -notmatch '\\dist(\\|$)' -and
    $_.FullName -notmatch '\\\.git(\\|$)' -and
    $_.FullName -notmatch 'create_zip\.ps1$' -and
    $_.Name -ne 'smartflow-ai.zip'
}

Write-Host "Found $($allFiles.Count) files to compress."

foreach ($f in $allFiles) {
    $relativePath = $f.FullName.Substring($baseDir.Length + 1)
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, 
        $f.FullName, 
        $relativePath, 
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
}

$zip.Dispose()

$zipItem = Get-Item $zipPath
Write-Host "=========================================="
Write-Host "SUCCESS: Created $zipPath"
Write-Host "Total Size: $([math]::Round($zipItem.Length / 1KB, 2)) KB ($([math]::Round($zipItem.Length / 1MB, 2)) MB)"
Write-Host "=========================================="
