# Young Leaders Hub - local preview
# Run:  powershell -ExecutionPolicy Bypass -File .\start-site.ps1

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$port = 3000
if ($env:PORT) { $port = [int]$env:PORT }

# 1. Node installed?
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  Node.js nahi mila." -ForegroundColor Red
  Write-Host "  Ek baar install karein:  winget install -e --id OpenJS.NodeJS.LTS"
  Write-Host "  Phir PowerShell band karke dobara kholein aur ye file chalayein."
  Write-Host ""
  Read-Host "Enter dabayein band karne ke liye"
  exit 1
}

# 2. Port already busy? (purana server band karein)
$busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  Write-Host "  Port $port pehle se chal raha hai - purana server band kiya ja raha hai..." -ForegroundColor Yellow
  $busy | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
    try { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } catch {}
  }
  Start-Sleep -Seconds 1
}

# 3. LAN IP (mobile / iPad testing ke liye)
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|Hyper-V'
  } | Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "   YOUNG LEADERS HUB - local preview" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "   PC par     :  http://localhost:$port/"
Write-Host "   Admin panel:  http://localhost:$port/admin.html"
if ($ip) {
  Write-Host "   Mobile/iPad:  http://${ip}:$port/   (same WiFi par)" -ForegroundColor Green
}
Write-Host ""
Write-Host "   Band karne ke liye: Ctrl + C" -ForegroundColor DarkGray
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:$port/"
node server/server.js
