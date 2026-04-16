from pydantic import BaseModel, Field, field_validator


class TripActualBase(BaseModel):
    booking_id: int = Field(..., gt=0)
    actual_fuel_liters: float | None = Field(default=None, ge=0)
    actual_eta_minutes: float | None = Field(default=None, ge=0)
    actual_distance_km: float | None = Field(default=None, ge=0)
    actual_cost: float | None = Field(default=None, ge=0)
    completed_at: str | None = Field(default=None, max_length=50)

    @field_validator("completed_at")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None


class TripActualCreate(TripActualBase):
    pass


class TripActualResponse(TripActualBase):
    id: int

    class Config:
        from_attributes = True