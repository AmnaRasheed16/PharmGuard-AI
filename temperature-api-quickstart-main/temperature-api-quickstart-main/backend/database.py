import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

# Vercel serverless environment: filesystem is read-only except /tmp.
# Use a writable SQLite path in /tmp when running on Vercel without an external DB.
db_url = settings.database_url
if db_url.startswith("sqlite") and os.getenv("VERCEL"):
    db_url = "sqlite:////tmp/pharmaguard.db"

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

engine = create_engine(
    db_url, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
