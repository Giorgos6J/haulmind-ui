from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String, unique=True, index=True, nullable=False)
    origin_address = Column(String, nullable=False)
    destination_address = Column(String, nullable=False)
    planned_distance_km = Column(Float, nullable=False)
    cargo_weight_kg = Column(Float, nullable=False)
    cargo_type = Column(String, nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    departure_time = Column(String, nullable=False)
    status = Column(String, default="scheduled")

    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)