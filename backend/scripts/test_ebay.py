"""End-to-end eBay diagnostic — run this on the same machine that runs uvicorn.

Usage:
    cd backend
    python scripts/test_ebay.py                # scans all recalls, top 5 each
    python scripts/test_ebay.py "Stand Mixer"  # custom query

Prints:
- Whether EBAY_CLIENT_ID/EBAY_CLIENT_SECRET are loaded
- The exact query sent to eBay
- Raw item count returned
- Each listing title + match score for the recall
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Recall
from services import EbayClient, EbayApiError, EbayConfigError, build_recall_query, score_listing_match


def banner(text: str) -> None:
    print()
    print("=" * 70)
    print(f"  {text}")
    print("=" * 70)


def main(custom_query: str | None) -> None:
    cid = os.getenv("EBAY_CLIENT_ID", "").strip()
    secret = os.getenv("EBAY_CLIENT_SECRET", "").strip()
    env = os.getenv("EBAY_ENV", "production").strip()
    marketplace = os.getenv("EBAY_MARKETPLACE_ID", "EBAY_US").strip()

    banner("Credentials")
    print(f"  EBAY_ENV            = {env!r}")
    print(f"  EBAY_MARKETPLACE_ID = {marketplace!r}")
    print(f"  EBAY_CLIENT_ID      = {(cid[:6] + '…' + cid[-3:]) if cid else '(MISSING)'}")
    print(f"  EBAY_CLIENT_SECRET  = {'(set, length=' + str(len(secret)) + ')' if secret else '(MISSING)'}")

    if not cid or not secret:
        print()
        print("ERROR: eBay credentials are not in this shell's environment.")
        print("Either: (a) export them in your shell before running, or")
        print("(b) add them to backend/.env (which python-dotenv loads).")
        sys.exit(1)

    client = EbayClient()

    if custom_query:
        banner(f"Custom query: {custom_query!r}")
        try:
            items = client.search_items(query=custom_query, limit=10)
        except (EbayApiError, EbayConfigError) as exc:
            print(f"  eBay error: {exc}")
            sys.exit(2)
        print(f"  raw eBay items returned: {len(items)}")
        for i, item in enumerate(items[:10], 1):
            title = (item.get("listingTitle") or "(no title)")[:80]
            seller = item.get("sellerName") or "?"
            print(f"   {i:>2}. {title}  [seller={seller}]")
        return

    db = SessionLocal()
    try:
        recalls = db.query(Recall).order_by(Recall.recallID.desc()).limit(8).all()
        for recall in recalls:
            query = build_recall_query(recall)
            banner(f"Recall #{recall.recallID}: {recall.productName}")
            print(f"  query → {query!r}")

            try:
                items = client.search_items(query=query, limit=8)
            except (EbayApiError, EbayConfigError) as exc:
                print(f"  eBay error: {exc}")
                continue

            print(f"  raw eBay items returned: {len(items)}")
            scored = []
            for item in items:
                m = score_listing_match(recall, item)
                scored.append((m["matchScore"], m["isDetectedMatch"], item))
            scored.sort(reverse=True)
            for score, detected, item in scored[:5]:
                title = (item.get("listingTitle") or "(no title)")[:70]
                tag = "DETECTED" if detected else "below threshold"
                print(f"    {score:.3f}  [{tag:16}]  {title}")
    finally:
        db.close()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
