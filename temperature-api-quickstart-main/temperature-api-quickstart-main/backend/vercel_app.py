"""
Vercel serverless entry point for PharmaGuard AI FastAPI backend.

This wraps the FastAPI ASGI app so Vercel's Python runtime can invoke it.
"""
import sys
from pathlib import Path

# Ensure the backend package is importable when running inside Vercel's
# serverless function runtime (which uses a temporary working directory).
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from mangum import Mangum
from backend.main import app

handler = Mangum(app)
