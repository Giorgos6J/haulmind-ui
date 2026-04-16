from pydantic import BaseModel, Field, field_validator


class BookingBase(BaseModel):
    booking_code: str = Field(..., min_length=3, max_length=30)
    origin_address: str = Field(..., min_length=2, max_length=150)
    destination_address: str = Field(..., min_length=2, max_length=150)
    planned_distance_km: float = Field(..., gt=0)
    cargo_weight_kg: float = Field(..., ge=0)
    cargo_type: str | None = Field(default=None, max_length=100)
    vehicle_id: int = Field(..., gt=0)
    departure_time: str | None = Field(default=None, max_length=50)
    status: str = Field(default="scheduled")

    @field_validator("booking_code", "origin_address", "destination_address", "status")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value

    @field_validator("cargo_type", "departure_time")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed_statuses = {"scheduled", "in_progress", "completed", "cancelled"}
        if value not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return value


class BookingCreate(BookingBase):
    pass


class BookingResponse(BookingBase):
    id: int

    class Config:
        from_attributes = True