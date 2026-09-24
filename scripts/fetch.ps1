param([string]$Jobs='data/vector-jobs.json')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$items=Get-Content (Join-Path $root $Jobs) -Raw | ConvertFrom-Json
$i=0
foreach($item in $items){
    $i++
    $path=Join-Path $root $item.file
    if((Test-Path $path) -and (Get-Item $path).Length -gt 50){continue}
    New-Item -ItemType Directory -Force (Split-Path $path -Parent) | Out-Null
    for($attempt=1;$attempt -le 3;$attempt++){
        try{Invoke-WebRequest $item.url -OutFile $path -TimeoutSec 45;break}
        catch{if($attempt -eq 3){Write-Host "FAILED $($item.file): $_"}else{Start-Sleep -Seconds 1}}
    }
    if($i % 20 -eq 0){Write-Host "$i / $($items.Count)"}
}
Write-Host "Finished $($items.Count) downloads"
