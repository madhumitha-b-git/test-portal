from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import candidate, proctoring

# Create FastAPI app instance
app = FastAPI(title="I Assessment Portal", version="1.0.0")

# CORS - allows React frontend (localhost:3000) to talk to this backend (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(candidate.router)
app.include_router(proctoring.router)

@app.get("/")
def health_check():
    return {"status": "Server is running"}
