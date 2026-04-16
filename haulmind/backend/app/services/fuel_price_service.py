from __future__ import annotations

import io
import os
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from typing import Any

import pandas as pd
import requests


EU_WEEKLY_OIL_BULLETIN_HISTORY_XLSX_URL = os.getenv(
    "EU_WEEKLY_OIL_BULLETIN_HISTORY_XLSX_URL",
    "https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx",
)

DEFAULT_DIESEL_PRICE = float(os.getenv("DEFAULT_DIESEL_PRICE", "1.8"))


@dataclass
class FuelEstimate:
    target_date: date
    estimated_price_per_liter: float
    latest_known_price_per_liter: float
    latest_known_date: date
    weekly_trend_per_liter: float
    confidence: float
    source: str
    method: str
    details: dict[str, Any]


class FuelPriceService:
    """
    v1:
    - official source: EU Weekly Oil Bulletin history xlsx
    - uses Greece diesel prices with taxes
    - supports calendar estimates up to 31 days ahead
    - falls back to DEFAULT_DIESEL_PRICE if the remote source is temporarily unavailable
    """

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    def _download_excel(self, url: str) -> bytes:
        response = requests.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.content

    def _load_greece_diesel_history(self) -> pd.DataFrame:
        raw = self._download_excel(EU_WEEKLY_OIL_BULLETIN_HISTORY_XLSX_URL)

        df = pd.read_excel(
            io.BytesIO(raw),
            sheet_name="Prices with taxes",
            engine="openpyxl",
        )

        df = df.rename(columns={df.columns[0]: "date"})
        df = df.iloc[2:].copy()

        if "GR_price_with_tax_diesel" not in df.columns:
            raise ValueError("GR_price_with_tax_diesel column not found in EU oil bulletin file.")

        df = df[["date", "GR_price_with_tax_diesel"]].copy()
        df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
        df["GR_price_with_tax_diesel"] = pd.to_numeric(
            df["GR_price_with_tax_diesel"], errors="coerce"
        )

        df = df.dropna(subset=["date", "GR_price_with_tax_diesel"]).sort_values("date")

        # Dataset unit: EUR / 1000 liters -> convert to EUR / liter
        df["price_per_liter"] = df["GR_price_with_tax_diesel"] / 1000.0

        return df.reset_index(drop=True)

    def _weighted_weekly_delta(self, history: pd.DataFrame) -> float:
        recent = history["price_per_liter"].tail(8).reset_index(drop=True)

        if len(recent) < 2:
            return 0.0

        diffs = recent.diff().dropna()

        if diffs.empty:
            return 0.0

        last_2_mean = diffs.tail(2).mean() if len(diffs) >= 2 else diffs.mean()
        last_4_mean = diffs.tail(4).mean()

        weekly_delta = (0.7 * float(last_2_mean)) + (0.3 * float(last_4_mean))
        weekly_delta = max(min(weekly_delta, 0.03), -0.03)

        return round(weekly_delta, 4)

    def _estimate_with_history(self, history: pd.DataFrame, target_date: date) -> FuelEstimate:
        latest_row = history.iloc[-1]

        latest_known_date = latest_row["date"]
        latest_known_price = round(float(latest_row["price_per_liter"]), 3)
        weekly_delta = self._weighted_weekly_delta(history)

        if target_date <= latest_known_date:
            known = history[history["date"] <= target_date].iloc[-1]
            known_price = round(float(known["price_per_liter"]), 3)

            return FuelEstimate(
                target_date=target_date,
                estimated_price_per_liter=known_price,
                latest_known_price_per_liter=latest_known_price,
                latest_known_date=latest_known_date,
                weekly_trend_per_liter=weekly_delta,
                confidence=0.95 if target_date == latest_known_date else 0.90,
                source="EU Weekly Oil Bulletin",
                method="historical_lookup",
                details={
                    "matched_history_date": str(known["date"]),
                    "forecast_days": 0,
                },
            )

        days_ahead = (target_date - latest_known_date).days
        projected = latest_known_price + (weekly_delta * (days_ahead / 7.0))
        projected = max(projected, 0.80)
        projected = round(projected, 3)

        confidence = max(0.55, 0.90 - (days_ahead * 0.01))
        confidence = round(confidence, 2)

        return FuelEstimate(
            target_date=target_date,
            estimated_price_per_liter=projected,
            latest_known_price_per_liter=latest_known_price,
            latest_known_date=latest_known_date,
            weekly_trend_per_liter=weekly_delta,
            confidence=confidence,
            source="EU Weekly Oil Bulletin",
            method="weekly_trend_projection",
            details={
                "forecast_days": days_ahead,
                "projection_weeks": round(days_ahead / 7.0, 2),
            },
        )

    def _fallback_estimate(self, target_date: date, reason: str) -> FuelEstimate:
        today = date.today()
        days_ahead = max((target_date - today).days, 0)

        confidence = max(0.40, 0.70 - (days_ahead * 0.01))

        return FuelEstimate(
            target_date=target_date,
            estimated_price_per_liter=round(DEFAULT_DIESEL_PRICE, 3),
            latest_known_price_per_liter=round(DEFAULT_DIESEL_PRICE, 3),
            latest_known_date=today,
            weekly_trend_per_liter=0.0,
            confidence=round(confidence, 2),
            source="fallback",
            method="default_price_fallback",
            details={"reason": reason},
        )

    def get_estimated_price(self, target_date: date) -> FuelEstimate:
        today = date.today()

        if target_date > today + timedelta(days=31):
            raise ValueError("Forecast supports up to 31 days ahead only.")

        try:
            history = self._load_greece_diesel_history()
            return self._estimate_with_history(history, target_date)
        except Exception as exc:
            return self._fallback_estimate(target_date, str(exc))

    def get_calendar(self, start_date: date, days: int = 31) -> list[dict[str, Any]]:
        if days < 1 or days > 31:
            raise ValueError("days must be between 1 and 31")

        try:
            history = self._load_greece_diesel_history()
            return [
                asdict(self._estimate_with_history(history, start_date + timedelta(days=i)))
                for i in range(days)
            ]
        except Exception as exc:
            return [
                asdict(self._fallback_estimate(start_date + timedelta(days=i), str(exc)))
                for i in range(days)
            ]