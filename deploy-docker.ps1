# Docker Deployment Script for Rathinam Techpark

Write-Host "🚀 Starting Docker deployment..." -ForegroundColor Cyan

# Step 1: Build React app
Write-Host "`n📦 Building React application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1 
}

# Step 2: Copy to server/client/dist
Write-Host "`n📂 Copying build files..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "server\client\dist\" -Recurse -Force

# Step 3: Build Docker image
Write-Host "`n🐳 Building Docker image..." -ForegroundColor Yellow
docker build -t naveen171007/rathinam-techpark:latest .
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1 
}

# Step 4: Tag with version (optional)
$version = Get-Date -Format "yyyy.MM.dd-HHmm"
docker tag naveen171007/rathinam-techpark:latest naveen171007/rathinam-techpark:$version
Write-Host "✅ Tagged as version: $version" -ForegroundColor Green

# Step 5: Push to Docker Hub
Write-Host "`n⬆️  Pushing to Docker Hub..." -ForegroundColor Yellow
docker push naveen171007/rathinam-techpark:latest
docker push naveen171007/rathinam-techpark:$version

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully deployed to Docker Hub!" -ForegroundColor Green
    Write-Host "   - Image: naveen171007/rathinam-techpark:latest" -ForegroundColor Cyan
    Write-Host "   - Version: naveen171007/rathinam-techpark:$version" -ForegroundColor Cyan
    Write-Host "`n🚀 To run: docker-compose up -d" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Push failed! Make sure you're logged in: docker login" -ForegroundColor Red
    exit 1
}
