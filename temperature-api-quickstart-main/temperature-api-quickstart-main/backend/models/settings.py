from sqlalchemy import Column, Integer, Float, String
from backend.database import Base

class BackendSettings(Base):
    __tablename__ = "backend_settings"

    id = Column(Integer, primary_key=True, default=1)
    fortyguard_api_key = Column(String, nullable=True)
    
    # Custom Risk Score weights
    weight_temperature = Column(Float, default=0.30)
    weight_heat = Column(Float, default=0.20)
    weight_compliance = Column(Float, default=0.20)
    weight_route = Column(Float, default=0.10)
    weight_worker = Column(Float, default=0.10)
    weight_carbon = Column(Float, default=0.10)
