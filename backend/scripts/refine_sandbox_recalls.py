"""Refine recall product names that produce 0 sandbox matches.

After verification, a handful of recalls had names too specific for sandbox
search (e.g. 'iPhone 7 Replacement Battery Pack'). This script trims them
down to phrases that actually exist in sandbox titles.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import Recall


REFINEMENTS = {
    5050: "VoltCore Apple iPhone 7 32GB",
    5051: "PowerStream Apple MacBook Pro 13.3 in Notebook",
    5068: "ChazWear Chaz Kangeroo Hoodie",
    5070: "PawWag Pet Hoodie",
    5073: "TrailFox PEAK Hiking Shoes",
    5078: "NorthForge Schrade Exertion DP Fixed Blade Knife",
    5079: "PageQuest X-Men Comic Book",
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        for rid, new_name in REFINEMENTS.items():
            r = db.query(Recall).filter(Recall.recallID == rid).first()
            if not r:
                continue
            r.productName = new_name
            updated += 1
        db.commit()
        print(f"Refined {updated} recall product names.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
