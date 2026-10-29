<#
.SYNOPSIS
  Deploys the latest code to the server in one command, from your own PowerShell window.

.DESCRIPTION
  Over SSH it pulls the repository, installs dependencies, builds everything, applies any new database
  migrations, copies the built website to where nginx serves it, and reloads the API under PM2.
  It never writes passwords: use SSH key login, and keep the server's packages/backend/.env up to date by hand.

.EXAMPLE
  .\deploy\deploy.ps1 -Server matias@167.104.102.21
#>
param(
  # SSH user@host (key login recommended)
  [Parameter(Mandatory = $true)][string]$Server,
  # The repository folder on the server
  [string]$Path = '~/Project-Website',
  # The folder nginx serves the site from (see deploy/nginx.lablace.conf)
  [string]$Web = '/var/www/lablace',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

$script = @"
set -euo pipefail
cd $Path
git fetch --all --prune
git checkout $Branch
git pull --ff-only
npm ci
npm run build
npm run db:migrate:prod -w packages/backend
sudo mkdir -p $Web
sudo rsync -a --delete packages/frontend/dist/ $Web/
pm2 reload coreloop-api --update-env || pm2 start packages/backend/ecosystem.config.cjs
pm2 save
curl -fsS http://127.0.0.1:8787/api/health
echo
echo 'deployed.'
"@

Write-Host "Deploying $Branch to $Server ..." -ForegroundColor Cyan
# bash on the server must not see Windows line endings
ssh $Server ($script -replace "`r", '')
if ($LASTEXITCODE -ne 0) { throw "Deploy failed (exit code $LASTEXITCODE). Nothing was changed after the failing step." }
