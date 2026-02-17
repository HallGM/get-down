"""Generic business configuration for invoice generation."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Address:
    """Represents a business address."""
    line_1: str
    line_2: Optional[str] = None
    line_3: Optional[str] = None
    line_4: Optional[str] = None
    line_5: Optional[str] = None

    def to_lines(self) -> list[str]:
        """Return address as a list of non-empty lines."""
        lines = [self.line_1]
        for line in [self.line_2, self.line_3, self.line_4, self.line_5]:
            if line:
                lines.append(line)
        return lines


@dataclass
class BusinessConfig:
    """Configuration for generic invoice generation."""
    business_name: str
    address: Address
    phone_number: str
    email_address: str
    account_number: str
    sort_code: str
    logo_path: Optional[str] = None  # Path to logo file, or None for text-only
    deposit_percentage: float = 20.0  # Default 20% deposit
