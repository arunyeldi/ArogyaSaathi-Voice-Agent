from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class UserProfile:
    """Dataclass representing a caller's persistent memory profile."""

    user_id: str
    name: str
    language_preference: str = "Hindi/English"
    age_band: str = "Unspecified"
    facts: dict[str, Any] = field(default_factory=dict)
    last_interaction: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        """Convert profile to a dictionary representation."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "language_preference": self.language_preference,
            "age_band": self.age_band,
            "facts": self.facts,
            "last_interaction": self.last_interaction,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "UserProfile":
        """Create a UserProfile instance from a dictionary."""
        return cls(
            user_id=data.get("user_id", ""),
            name=data.get("name", "Caller"),
            language_preference=data.get("language_preference", "Hindi/English"),
            age_band=data.get("age_band", "Unspecified"),
            facts=data.get("facts", {}),
            last_interaction=data.get(
                "last_interaction", datetime.now(timezone.utc).isoformat()
            ),
        )
