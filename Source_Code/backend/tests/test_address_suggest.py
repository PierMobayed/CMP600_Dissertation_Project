import pytest

from app.address_suggest import _parse_line_query
from app.geocode import _is_postcode_only_query, extract_uk_postcode


@pytest.mark.parametrize(
    ("line", "hn", "name"),
    [
        ("14", "14", None),
        ("14a", "14a", None),
        ("Acme House", None, "Acme House"),
        ("", None, None),
    ],
)
def test_parse_line_query(line: str, hn: str | None, name: str | None):
    assert _parse_line_query(line) == (hn, name)


def test_postcode_only_vs_full_address():
    pc = extract_uk_postcode("14, LS10 4HJ")
    assert pc == "LS10 4HJ"
    assert _is_postcode_only_query("LS10 4HJ", pc) is True
    assert _is_postcode_only_query("14, LS10 4HJ", pc) is False
