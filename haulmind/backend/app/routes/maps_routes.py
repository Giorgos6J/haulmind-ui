from fastapi import APIRouter
from app.schemas.route_preview import RoutePreviewRequest, RoutePreviewResponse
from app.services.google_routes_service import compute_google_route

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.post("/preview", response_model=RoutePreviewResponse)
async def preview_route(payload: RoutePreviewRequest):
    result = await compute_google_route(
        origin_address=payload.origin_address,
        destination_address=payload.destination_address,
    )
    return result