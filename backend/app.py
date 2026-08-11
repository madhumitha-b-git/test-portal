import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import candidate, proctoring, execution

# Create FastAPI app instance
app = FastAPI(title="Online Assessment Portal", version="1.0.0")

# CORS - allows React frontend to talk to this backend
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://drwywdzm7fvk7.cloudfront.net",
    "https://d1t6qh90xvpukg.cloudfront.net",
    
   
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(candidate.router)
app.include_router(proctoring.router)
app.include_router(execution.router)

@app.get("/")
def health_check():
    return {"status": "Server is running"}
