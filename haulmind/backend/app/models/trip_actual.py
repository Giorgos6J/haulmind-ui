from sqlalchemy import Column, Integer, Float, String, ForeignKey, Boolean, DateTime
from app.database import Base


class TripActual(Base):
    __tablename__ = "trip_actuals"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)

    actual_fuel_liters = Column(Float, nullable=True)
    actual_eta_minutes = Column(Float, nullable=True)
    actual_distance_km = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)
    completed_at = Column(String, nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)