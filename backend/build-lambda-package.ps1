# Build Lambda deployment package
# Requires Docker Desktop installed and running

$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BUILD_DIR = "$env:TEMP\lambda-build-$([System.IO.Path]::GetRandomFileName())"
$OUTPUT_ZIP = "$PROJECT_DIR\deployment-package.zip"

# Clean up any previous build
Remove-Item -Path $BUILD_DIR -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $OUTPUT_ZIP -Force -ErrorAction SilentlyContinue

Write-Host "Building Lambda package..." -ForegroundColor Cyan

# Create temp directories
New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null
New-Item -ItemType Directory -Path "$BUILD_DIR\package" -Force | Out-Null

# Copy source code
Copy-Item -Path "$PROJECT_DIR\lambda_function.py" -Destination "$BUILD_DIR\package\" -Force
Copy-Item -Path "$PROJECT_DIR\app.py" -Destination "$BUILD_DIR\package\" -Force
Copy-Item -Path "$PROJECT_DIR\routes" -Destination "$BUILD_DIR\package\routes" -Recurse -Force
Copy-Item -Path "$PROJECT_DIR\services" -Destination "$BUILD_DIR\package\services" -Recurse -Force
Copy-Item -Path "$PROJECT_DIR\models" -Destination "$BUILD_DIR\package\models" -Recurse -Force
Copy-Item -Path "$PROJECT_DIR\database" -Destination "$BUILD_DIR\package\database" -Recurse -Force

Write-Host "Source code copied." -ForegroundColor Green

# Copy requirements
Copy-Item -Path "$PROJECT_DIR\requirements-lambda.txt" -Destination "$BUILD_DIR\requirements.txt" -Force

# Use Docker to install Linux-compatible dependencies
Write-Host "Installing dependencies in Docker (for Linux compatibility)..." -ForegroundColor Cyan

$DOCKERFILE = @"
FROM public.ecr.aws/lambda/python:3.10
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt --target /package
"@

Set-Content -Path "$BUILD_DIR\Dockerfile" -Value $DOCKERFILE

docker build -t lambda-builder "$BUILD_DIR" 2>&1 | Out-Null
docker run --rm -v "${BUILD_DIR}:/host" lambda-builder cp -r /package/. /host/package/ 2>&1 | Out-Null

Write-Host "Dependencies installed." -ForegroundColor Green

# Create zip
Write-Host "Creating deployment package..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory("$BUILD_DIR\package", $OUTPUT_ZIP)

Write-Host "Done! Package created: $OUTPUT_ZIP" -ForegroundColor Green

# Cleanup
Remove-Item -Path $BUILD_DIR -Recurse -Force -ErrorAction SilentlyContinue
