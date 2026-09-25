# ASIDE-GPT local Gemini bridge — Windows setup.
# Run from the repository root:  powershell -ExecutionPolicy Bypass -File scripts\install.ps1
$ErrorActionPreference = "Stop"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 22.13+ is required: https://nodejs.org/" }
$version = [version]((node --version).TrimStart("v"))
if ($version -lt [version]"22.13.0") { throw "Node.js 22.13+ is required (found $version)" }

Write-Host "Installing dependencies and building..."
npm ci
npm run build

Write-Host "Linking the aside-gpt command..."
npm link

Write-Host "Launching Chrome with the dedicated Gemini profile..."
aside-gpt chrome

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. In the Chrome window that opened, sign in to Gemini once with your Google AI Pro account."
Write-Host "  2. aside-gpt doctor"
Write-Host "  3. aside-gpt ask `"Reply with only: ASIDE_GEMINI_OK`""
Write-Host "  4. Optional: aside-gpt setup-agy    (register Aside + Gemini MCP servers with Antigravity)"
Write-Host "  5. Optional: aside-gpt probe-aside  (check whether Aside REPL calls consume credits)"
