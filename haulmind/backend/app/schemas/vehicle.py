from pydantic import BaseModel, Field, field_validator, model_validator


class VehicleBase(BaseModel):
    plate_number: str = Field(..., min_length=3, max_length=20)
    vehicle_type: str = Field(..., min_length=2, max_length=50)
    manufacturer: str = Field(..., min_length=2, max_length=50)
    model: str = Field(..., min_length=1, max_length=50)
    fuel_type: str = Field(..., min_length=3, max_length=30)
    max_load_kg: float = Field(..., gt=0)
    base_consumption_per_100km: float = Field(..., gt=0)

    registration_day: int | None = Field(default=None, ge=1, le=31)
    registration_month: int | None = Field(default=None, ge=1, le=12)
    registration_year: int | None = Field(default=None, ge=1900, le=2100)

    @field_validator("plate_number", "vehicle_type", "manufacturer", "model", "fuel_type")
    @classmethod
    def strip_and_validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value

    @model_validator(mode="after")
    def validate_registration_date_parts(self):
        parts = [self.registration_day, self.registration_month, self.registration_year]
        filled = [part is not None for part in parts]

        if any(filled) and not all(filled):
            raise ValueError("registration_day, registration_month, and registration_year must all be provided together")

        return self


class VehicleCreate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    id: int

    class Config:
        from_attributes = True