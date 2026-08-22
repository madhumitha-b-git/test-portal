import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import candidate, proctoring, execution

# Create FastAPI app instance
app = FastAPI(title="Online Assessment Portal", version="1.0.0")

# CORS - allows React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
