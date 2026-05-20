import pytest

from app.geocode import extract_uk_postcode, format_uk_postcode


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("LS104HJ", "LS10 4HJ"),
        ("ls10 4hj", "LS10 4HJ"),
        ("SW1A1AA", "SW1A 1AA"),
        ("  ec1a1bb  ", "EC1A 1BB"),
        ("not a code", None),
        ("LS10", None),
    ],
)
def test_format_uk_postcode(raw: str, expected: str | None):
    assert format_uk_postcode(raw) == expected


def test_extract_from_address():
    assert extract_uk_postcode("Flat 2, 14 High Street, LS104HJ") == "LS10 4HJ"
    assert extract_uk_postcode("LS104HJ") == "LS10 4HJ"
