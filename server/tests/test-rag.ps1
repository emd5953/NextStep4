# Test RAG Endpoint
$body = @{
    message = "What is NextStep?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:4000/api/rag-chat" -Method Post -ContentType "application/json" -Body $body

Write-Host "`n=== RAG Response ===" -ForegroundColor Green
Write-Host "Response: $($response.response)" -ForegroundColor Cyan
Write-Host "`nSources:" -ForegroundColor Yellow
$response.sources | ForEach-Object {
    Write-Host "  - $($_.document) (score: $($_.score))" -ForegroundColor White
    Write-Host "    $($_.chunk.Substring(0, [Math]::Min(100, $_.chunk.Length)))..." -ForegroundColor Gray
}
