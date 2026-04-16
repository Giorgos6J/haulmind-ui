from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(String, nullable=False)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    fuel_type = Column(String, nullable=False)
    max_load_kg = Column(Float, nullable=False)
    base_consumption_per_100km = Column(Float, nullable=False)

    registration_day = Column(Integer, nullable=True)
    registration_month = Column(Integer, nullable=True)
    registration_year = Column(Integer, nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)