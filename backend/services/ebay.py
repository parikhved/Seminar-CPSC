import base64
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

EBAY_APP_SCOPE = "https://api.ebay.com/oauth/api_scope"


class EbayConfigError(RuntimeError):
    pass


class EbayApiError(RuntimeError):
    pass


def _parse_listing_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        return None


def _parse_price(value: Optional[str]) -> Optional[float]:
    if value in (None, ""):
        return None

    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def _build_address(location: Optional[Dict[str, Any]]) -> Optional[str]:
    if not location:
        return None

    parts = [
        location.get("city"),
        location.get("stateOrProvince"),
        location.get("country"),
    ]
    cleaned = [part.strip() for part in parts if isinstance(part, str) and part.strip()]
    return ", ".join(cleaned) if cleaned else None


class EbayClient:
    def __init__(self) -> None:
        self.environment = os.getenv("EBAY_ENV", "production").strip().lower()
        self.marketplace_id = os.getenv("EBAY_MARKETPLACE_ID", "EBAY_US").strip() or "EBAY_US"
        self.client_id = os.getenv("EBAY_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("EBAY_CLIENT_SECRET", "").strip()
        self._token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    @property
    def api_base_url(self) -> str:
        if self.environment == "sandbox":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    def _require_credentials(self) -> None:
        if self.client_id and self.client_secret:
            return

        raise EbayConfigError(
            "eBay credentials are missing. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET before scanning listings."
        )

    def _get_access_token(self) -> str:
        self._require_credentials()

        now = datetime.now(timezone.utc)
        if self._token and self._token_expires_at and now < self._token_expires_at:
            return self._token

        token_url = f"{self.api_base_url}/identity/v1/oauth2/token"
        credentials = f"{self.client_id}:{self.client_secret}".encode("utf-8")
        auth_header = base64.b64encode(credentials).decode("utf-8")

        try:
            response = httpx.post(
                token_url,
                headers={
                    "Authorization": f"Basic {auth_header}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": EBAY_APP_SCOPE,
                },
                timeout=20.0,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            raise EbayApiError(f"Unable to retrieve an eBay OAuth token: {detail}") from exc
        except httpx.HTTPError as exc:
            raise EbayApiError(f"Unable to reach eBay OAuth services: {exc}") from exc

        payload = response.json()
        token = payload.get("access_token")
        expires_in = int(payload.get("expires_in", 7200))

        if not token:
            raise EbayApiError("eBay OAuth token response did not include an access token.")

        self._token = token
        self._token_expires_at = now + timedelta(seconds=max(expires_in - 60, 60))
        return token

    def search_items(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        token = self._get_access_token()

        logger.info("eBay search | env=%s marketplace=%s query=%r limit=%s",
                    self.environment, self.marketplace_id, query, limit)

        try:
            response = httpx.get(
                f"{self.api_base_url}/buy/browse/v1/item_summary/search",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                    "X-EBAY-C-MARKETPLACE-ID": self.marketplace_id,
                },
                params={
                    "q": query,
                    "limit": limit,
                },
                timeout=20.0,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            logger.error("eBay search HTTP %s | body: %s", exc.response.status_code, detail)
            raise EbayApiError(f"eBay listing search failed: {detail}") from exc
        except httpx.HTTPError as exc:
            raise EbayApiError(f"Unable to reach the eBay Browse API: {exc}") from exc

        payload = response.json()
        items = payload.get("itemSummaries", [])
        listings: List[Dict[str, Any]] = []

        for item in items:
            price = item.get("price") or {}
            image = item.get("image") or {}
            seller = item.get("seller") or {}

            listings.append(
                {
                    "externalListingId": item.get("legacyItemId") or item.get("itemId"),
                    "listingTitle": item.get("title"),
                    "listingURL": item.get("itemWebUrl"),
                    "marketplaceName": "eBay",
                    "sellerName": seller.get("username"),
                    "sellerFeedbackScore": seller.get("feedbackScore"),
                    "sellerFeedbackPercentage": seller.get("feedbackPercentage"),
                    "listingDate": _parse_listing_date(
                        item.get("itemOriginDate") or item.get("itemCreationDate")
                    ),
                    "price": _parse_price(price.get("value")),
                    "currency": price.get("currency"),
                    "listingDesc": item.get("shortDescription"),
                    "address": _build_address(item.get("itemLocation")),
                    "imageURL": image.get("imageUrl"),
                }
            )

        return listings
