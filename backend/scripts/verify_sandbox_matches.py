"""Verify sandbox-tuned recalls actually produce match candidates.

For each recall in 5050+, runs build_recall_query → eBay sandbox search →
score_listing_match, and reports the top 3 listings for each.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import Recall
from services import EbayClient, build_recall_query, score_listing_match

client = EbayClient()


def main():
    db = SessionLocal()
    try:
        recalls = db.query(Recall).filter(Recall.recallID >= 5050).order_by(Recall.recallID).all()
        zero_results = []
        no_detected = []
        for r in recalls:
            q = build_recall_query(r)
            try:
                items = client.search_items(query=q, limit=8)
            except Exception as exc:
                print(f"#{r.recallID} {q!r} → ERROR: {exc}")
                continue
            scored = []
            for it in items:
                m = score_listing_match(r, it)
                scored.append((m["matchScore"], m["isDetectedMatch"], it.get("listingTitle") or ""))
            scored.sort(key=lambda x: x[0], reverse=True)
            top = scored[:3]
            best = top[0][0] if top else 0.0
            detected_count = sum(1 for s, d, _ in scored if d)
            print(f"#{r.recallID} {r.productName[:55]}")
            print(f"     query={q!r}  items={len(items)}  best_score={best:.3f}  detected={detected_count}")
            for score, detected, title in top:
                tag = "✓" if detected else "·"
                print(f"       {tag} {score:.3f}  {title[:70]}")
            print()
            if not items:
                zero_results.append(r.recallID)
            elif detected_count == 0:
                no_detected.append(r.recallID)

        print()
        print("=" * 70)
        print(f"  Recalls returning 0 sandbox items: {len(zero_results)}  → {zero_results}")
        print(f"  Recalls returning items but 0 detected: {len(no_detected)}  → {no_detected}")
        print("=" * 70)
    finally:
        db.close()


if __name__ == "__main__":
    main()
