param (
    [string]$serviceAccountKey,
    [string]$serviceEndpoint,
    [string]$apkFile,
    [string]$track,
    [string]$updatePriority,
    [string]$userFraction,
    [string]$changeLogFile
) 
  
$env:INPUT_serviceAccountKey = $serviceAccountKey
$env:INPUT_serviceEndpoint = $serviceEndpoint
$env:INPUT_apkFile = $apkFile
$env:INPUT_track = $track
$env:INPUT_updatePriority = $updatePriority
$env:INPUT_userFraction = $userFraction
$env:INPUT_changeLogFile = $changeLogFile

node GooglePlay.js
