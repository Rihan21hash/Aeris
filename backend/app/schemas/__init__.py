from app.schemas.aqi import (
    AqiCurrentResponse,
    PollutantData,
    PollutantsResponse,
    AqiHistoryPoint,
    AqiHistoryResponse,
    AqiExtremesResponse,
    HealthRecommendation,
)
from app.schemas.location import (
    LocationSearchResult,
    LocationSearchResponse,
    LocationDetail,
    SavedLocationRequest,
    SavedLocationResponse,
)
from app.schemas.notification import (
    PushSubscriptionRequest,
    NotificationPreferenceRequest,
    NotificationPreferenceResponse,
)
from app.schemas.user import UserResponse, UserUpdateRequest

__all__ = [
    "AqiCurrentResponse",
    "PollutantData",
    "PollutantsResponse",
    "AqiHistoryPoint",
    "AqiHistoryResponse",
    "AqiExtremesResponse",
    "HealthRecommendation",
    "LocationSearchResult",
    "LocationSearchResponse",
    "LocationDetail",
    "SavedLocationRequest",
    "SavedLocationResponse",
    "PushSubscriptionRequest",
    "NotificationPreferenceRequest",
    "NotificationPreferenceResponse",
    "UserResponse",
    "UserUpdateRequest",
]
