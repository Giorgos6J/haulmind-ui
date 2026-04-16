from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)

    predicted_fuel_liters = Column(Float, nullable=False)
    predicted_eta_minutes = Column(Integer, nullable=True)
    predicted_cost = Column(Float, nullable=False)

    traffic_level = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    model_version = Column(String, nullable=True)

    fuel_price_used = Column(Float, nullable=True)

    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)