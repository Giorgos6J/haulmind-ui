from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine

from app.models.vehicle import Vehicle
from app.models.booking import Booking
from app.models.prediction import Prediction
from app.models.trip_actual import TripActual

from app.routes.vehicle_routes import router as vehicle_router
from app.routes.booking_routes import router as booking_router
from app.routes.prediction_routes import router as prediction_router
from app.routes.trip_actual_routes import router as trip_actual_router
from app.routes.comparison_routes import router as comparison_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.maps_routes import router as maps_router
from app.routes.fuel_routes import router as fuel_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HaulMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicle_router)
app.include_router(booking_router)
app.include_router(prediction_router)
app.include_router(trip_actual_router)
app.include_router(comparison_router)
app.include_router(dashboard_router)
app.include_router(maps_router)
app.include_router(fuel_router)


@app.get("/")
def read_root():
    return {"message": "HaulMind backend is running"}