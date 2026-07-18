from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI!"}

@app.get("/api/dashboard")
def dashboard():
    return {
        "protectedHours": 14,
        "blockedSites": 27,
        "alerts": 3,
        "lastSync": "2 min ago",
        "focusMode": "Balanced",
        "categories": ["Violence", "Gambling", "Social engineering"],
    }
