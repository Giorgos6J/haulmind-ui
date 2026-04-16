from pydantic import BaseModel


class RoutePreviewRequest(BaseModel):
    origin_address: str
    destination_address: str


class RoutePreviewResponse(BaseModel):
    origin_address: str
    destination_address: str
    distance_km: float
    eta_minutes: float
