from pydantic import BaseModel


class PredictionResponse(BaseModel):
    id: int
    booking_id: int
    predicted_fuel_liters: float
    predicted_eta_minutes: int | None = None
    predicted_cost: float
    traffic_level: str | None = None
    confidence_score: float | None = None
    model_version: str | None = None
    fuel_price_used: float | None = None

    class Config:
        from_attributes = True