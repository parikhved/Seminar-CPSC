import re
from difflib import SequenceMatcher
from typing import Any, Dict, Iterable, List, Set

STOPWORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}

SAFETY_TERMS = {
    "burn",
    "crash",
    "choking",
    "crush",
    "electric",
    "entrapment",
    "fall",
    "fatal",
    "fire",
    "injury",
    "lead",
    "overheat",
    "shock",
    "smoldering",
}


def _as_text(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", _as_text(value)).strip()


def tokenize(value: Any) -> Set[str]:
    return {
        token
        for token in normalize_text(value).split()
        if len(token) > 2 and token not in STOPWORDS
    }


def _token_overlap(reference_tokens: Set[str], listing_tokens: Set[str]) -> float:
    if not reference_tokens:
        return 0.0
    return len(reference_tokens & listing_tokens) / len(reference_tokens)


_PAREN_RE = re.compile(r"\([^)]*\)")
_NUMERIC_SUFFIX_RE = re.compile(r"\b\d+[a-z]*\b", re.IGNORECASE)


def _looks_like_fake_brand(token: str) -> bool:
    """A heuristic: synthetic-brand prefixes tend to be a single CamelCase or
    smushed-compound word with no spaces (FunZone, ChillMax, BrightSparks).
    Real product nouns (Smoke, Crib, Helmet) wouldn't be flagged because they
    appear elsewhere in the name and we keep them via the token set."""
    if not token or " " in token:
        return False
    if not token[0].isalpha() or not token[0].isupper():
        return False
    inner_caps = sum(1 for ch in token[1:] if ch.isupper())
    return inner_caps >= 1 or len(token) >= 7


def build_recall_query(recall: Any) -> str:
    """Produce an eBay-friendly search query.

    Real eBay listings do not carry our synthetic brand names ("SafeAlert"),
    so jamming them into the query causes zero results. Strategy:
    - drop parenthesized clauses ("(40L)") — they hurt recall
    - drop a leading CamelCase brand-style token if present
    - drop the manufacturer entirely (also fictional)
    - keep at most the last 5 substantive words so the query stays tight
    """
    raw_name = (getattr(recall, "productName", None) or "").strip()
    if not raw_name:
        return (getattr(recall, "manufacturerName", None) or "").strip()

    cleaned = _PAREN_RE.sub(" ", raw_name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    words = cleaned.split()
    if words and _looks_like_fake_brand(words[0]):
        words = words[1:]

    keepers = [w for w in words if not _NUMERIC_SUFFIX_RE.fullmatch(w)]
    if not keepers:
        keepers = words

    return " ".join(keepers[-5:]).strip() or raw_name


def score_listing_match(
    recall: Any,
    listing: Dict[str, Any],
    threshold: float = 0.25,
) -> Dict[str, Any]:
    recall_name = _as_text(getattr(recall, "productName", ""))
    recall_maker = _as_text(getattr(recall, "manufacturerName", ""))
    recall_hazard = _as_text(getattr(recall, "hazard", ""))

    listing_title = _as_text(listing.get("listingTitle"))
    listing_desc = _as_text(listing.get("listingDesc"))
    listing_seller = _as_text(listing.get("sellerName"))
    listing_text = " ".join(part for part in [listing_title, listing_desc, listing_seller] if part).strip()

    recall_tokens = tokenize(recall_name)
    manufacturer_tokens = tokenize(recall_maker)
    hazard_tokens = tokenize(recall_hazard) & SAFETY_TERMS
    listing_tokens = tokenize(listing_text)

    title_similarity = SequenceMatcher(None, normalize_text(recall_name), normalize_text(listing_title)).ratio()
    product_overlap = _token_overlap(recall_tokens, listing_tokens)
    manufacturer_overlap = _token_overlap(manufacturer_tokens, listing_tokens)
    hazard_overlap = _token_overlap(hazard_tokens, listing_tokens)

    manufacturer_bonus = 0.15 if manufacturer_tokens and manufacturer_tokens <= listing_tokens else 0.0
    score = (
        (title_similarity * 0.5)
        + (product_overlap * 0.3)
        + (manufacturer_overlap * 0.1)
        + (hazard_overlap * 0.1)
        + manufacturer_bonus
    )

    matched_terms = sorted((recall_tokens | manufacturer_tokens | hazard_tokens) & listing_tokens)

    return {
        "matchScore": round(min(score, 1.0), 3),
        "matchedTerms": matched_terms,
        "isDetectedMatch": score >= threshold,
    }
