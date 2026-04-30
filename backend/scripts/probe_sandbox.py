"""Probe eBay sandbox to discover which queries actually return inventory.

Sandbox is a sparse test environment, so we can't assume "Air Fryer" or "Stand
Mixer" will work. This script hits a battery of common queries and reports
which ones come back with real items (and what those items look like), so we
can pick search-able product categories for the seeded recalls.
"""
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from services import EbayClient


PROBES = [
    # Electronics / phones / tablets
    "iphone", "iphone 7", "iphone 11", "iphone 12", "samsung galaxy", "ipad",
    "macbook", "laptop", "chromebook", "kindle",
    # Audio
    "headphones", "airpods", "bluetooth speaker", "earbuds",
    # Computer accessories
    "mouse", "keyboard", "monitor", "webcam", "usb hub", "hard drive",
    # Cameras
    "camera", "gopro", "nikon", "canon",
    # Clothing
    "t-shirt", "shirt", "jeans", "hoodie", "jacket", "sneakers", "shoes",
    "dress", "watch",
    # Home goods
    "lamp", "rug", "curtain", "pillow", "bed", "chair", "table", "desk",
    # Kitchen
    "pan", "knife", "blender", "toaster", "kettle", "mug",
    # Toys
    "lego", "barbie", "doll", "puzzle", "board game", "action figure",
    # Sports
    "bike", "helmet", "ball", "yoga mat", "dumbbell",
    # Books / media
    "book", "comic", "vinyl", "dvd", "magazine",
    # Beauty / personal
    "perfume", "lipstick", "razor",
    # Random staples
    "backpack", "bag", "wallet", "sunglasses",
    # Vehicle
    "car", "tire", "bicycle", "scooter",
    # Pet
    "dog toy", "cat litter",
    # Tools
    "drill", "hammer", "wrench",
    # Brands likely seeded by eBay
    "apple", "samsung", "sony", "nike", "adidas",
]


def main():
    client = EbayClient()
    summary = []
    sample_titles = defaultdict(list)

    for q in PROBES:
        try:
            items = client.search_items(query=q, limit=10)
        except Exception as exc:
            summary.append((q, -1, f"ERROR: {exc}"))
            continue

        count = len(items)
        summary.append((q, count, ""))
        for it in items[:3]:
            title = (it.get("listingTitle") or "(no title)").strip()
            if title:
                sample_titles[q].append(title[:80])

    print()
    print("=" * 90)
    print("  Sandbox probe results — sorted by inventory count")
    print("=" * 90)
    summary.sort(key=lambda row: -row[1])
    for q, count, err in summary:
        if err:
            print(f"  {q:25} {err}")
        else:
            print(f"  {q:25} {count:>3} items")

    print()
    print("=" * 90)
    print("  Sample titles for queries with >= 3 items")
    print("=" * 90)
    for q, count, err in summary:
        if err or count < 3:
            continue
        titles = sample_titles.get(q, [])
        # de-dupe
        seen = set()
        unique = []
        for t in titles:
            if t not in seen:
                seen.add(t)
                unique.append(t)
        print(f"\n  Query: {q!r}  ({count} total)")
        for t in unique:
            print(f"    • {t}")


if __name__ == "__main__":
    main()
