"""Reseed recalls so eBay sandbox actually returns matching listings.

Sandbox is sparse — most household-product queries (air fryer, helmet, etc.)
return zero items. This script:
  1. Deletes the previously-seeded synthetic recalls that no shortlist or
     violation references (range 5020-5049, sparing any in-use IDs).
  2. Inserts 30 new recalls whose core product nouns map directly to titles
     present in eBay sandbox (probed via scripts/probe_sandbox.py).

Each new recall keeps the CamelCase fake-brand prefix so build_recall_query
strips it cleanly — the eBay query that goes out is the real product noun(s).

Run from backend/: python scripts/seed_sandbox_recalls.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import Recall, ShortList, Violation


# Each entry's productName starts with a CamelCase synthetic brand. After
# build_recall_query strips that prefix, the remaining tokens map onto a real
# title that the sandbox returns (verified via probe_sandbox.py).
RECALLS = [
    # iPhone 7 — sandbox returns 10 copies of the same iPhone 7 32GB listing
    {
        "recallID": 5050,
        "productName": "VoltCore Apple iPhone 7 32GB Replacement Battery Pack",
        "manufacturerName": "VoltCore Mobile",
        "hazard": "Lithium-ion battery can overheat and ignite during charging, posing fire and burn hazards.",
        "recallDate": date(2026, 3, 5),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/voltcore-iphone7-battery",
        "remedy": "Refund",
        "units": "About 18,000 replacement battery packs.",
        "soldAt": "Sold online at voltcore.com and Amazon.com from January 2024 through October 2025.",
    },
    # MacBook Pro
    {
        "recallID": 5051,
        "productName": "PowerStream Apple MacBook Pro 13.3 in Replacement Battery",
        "manufacturerName": "PowerStream",
        "hazard": "Battery management chip can fail, causing the lithium-ion cells to swell and pose fire hazards.",
        "recallDate": date(2026, 3, 11),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/powerstream-macbook-battery",
        "remedy": "Replace",
        "units": "About 12,500 batteries.",
        "soldAt": "Sold at independent computer repair shops and powerstream.com from June 2024 through January 2026.",
    },
    # Headphones — Wireless Bluetooth Headphones — Noise Cancelling
    {
        "recallID": 5052,
        "productName": "BoltGuard Wireless Bluetooth Headphones Noise Cancelling",
        "manufacturerName": "BoltGuard Audio",
        "hazard": "Internal lithium-ion cell can short, causing the headphones to overheat and burn the wearer.",
        "recallDate": date(2026, 3, 14),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/boltguard-headphones",
        "remedy": "Refund",
        "units": "About 27,000 units.",
        "soldAt": "Sold at Best Buy, Target, and online at boltguard.com from August 2024 through November 2025.",
    },
    # Earbuds — Wireless Earbuds Pro X5
    {
        "recallID": 5053,
        "productName": "AeroBeam Wireless Earbuds Pro X5",
        "manufacturerName": "AeroBeam",
        "hazard": "Charging case can overheat and ignite stored earbuds, posing fire and burn hazards.",
        "recallDate": date(2026, 3, 19),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/aerobeam-earbuds-prox5",
        "remedy": "Refund",
        "units": "About 41,000 units.",
        "soldAt": "Sold online at aerobeam.com and through Amazon.com from May 2024 through December 2025.",
    },
    # AirPods Max
    {
        "recallID": 5054,
        "productName": "CrystalCore Apple AirPods Max Wireless Over-Ear Headphones",
        "manufacturerName": "CrystalCore",
        "hazard": "Battery can swell during overnight charging, posing fire hazards.",
        "recallDate": date(2026, 3, 25),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/crystalcore-airpods-max",
        "remedy": "Replace",
        "units": "About 8,200 units.",
        "soldAt": "Sold online at crystalcore.com from October 2024 through January 2026.",
    },
    # Bluetooth speaker — Stainless Cup Bluetooth Speaker
    {
        "recallID": 5055,
        "productName": "EchoLink 304 Stainless Cup Bluetooth Speaker TWS USB",
        "manufacturerName": "EchoLink",
        "hazard": "USB charging port wiring can short, posing fire and electric shock hazards.",
        "recallDate": date(2026, 3, 30),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/echolink-cup-speaker",
        "remedy": "Refund",
        "units": "About 6,400 units.",
        "soldAt": "Sold at outdoor retailers and online at echolink.com from August 2024 through December 2025.",
    },
    # Gaming mouse — Titan Gaming Mouse
    {
        "recallID": 5056,
        "productName": "GameForge Titan Gaming Mouse 12000DPI",
        "manufacturerName": "GameForge",
        "hazard": "RGB lighting circuit can overheat the housing, causing burns to the user's hand.",
        "recallDate": date(2026, 4, 2),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/gameforge-titan-mouse",
        "remedy": "Repair",
        "units": "About 14,200 units.",
        "soldAt": "Sold at Best Buy and online at gameforge.com from March 2025 through December 2025.",
    },
    # Mechanical keyboard
    {
        "recallID": 5057,
        "productName": "KeyHaven Vintage Mechanical Keyboard Cherry MX Blue",
        "manufacturerName": "KeyHaven",
        "hazard": "USB-C cable insulation can degrade, exposing live wires and posing electric shock hazards.",
        "recallDate": date(2026, 4, 8),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/keyhaven-mechanical-keyboard",
        "remedy": "Replace",
        "units": "About 9,800 units.",
        "soldAt": "Sold online at keyhaven.com and Amazon.com from April 2025 through January 2026.",
    },
    # USB-C Hub
    {
        "recallID": 5058,
        "productName": "DataDock USB-C Hub 7-in-1 Multiport Adapter",
        "manufacturerName": "DataDock",
        "hazard": "Internal voltage regulator can fail, sending high voltage to connected devices and posing electric shock hazards.",
        "recallDate": date(2026, 4, 15),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/datadock-usbc-hub",
        "remedy": "Replace",
        "units": "About 22,000 units.",
        "soldAt": "Sold at Office Depot, Staples, and online at datadock.com from January 2025 through December 2025.",
    },
    # External hard drive
    {
        "recallID": 5059,
        "productName": "VaultPro WD 2TB Elements Portable External Hard Drive USB 3.0",
        "manufacturerName": "VaultPro",
        "hazard": "Drive enclosure can become electrified due to grounding fault, posing electric shock hazards.",
        "recallDate": date(2026, 4, 18),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/vaultpro-external-hard-drive",
        "remedy": "Refund",
        "units": "About 33,500 units.",
        "soldAt": "Sold at Costco, Amazon.com, and Best Buy from May 2024 through November 2025.",
    },
    # SSD
    {
        "recallID": 5060,
        "productName": "SilverFin SomnAmbulist 2.5 inch SATA3 SSD Solid State Drive 512GB",
        "manufacturerName": "SilverFin",
        "hazard": "Power-management firmware can request unsafe voltages, causing the drive to overheat and ignite.",
        "recallDate": date(2026, 4, 22),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/silverfin-ssd",
        "remedy": "Repair",
        "units": "About 6,800 units.",
        "soldAt": "Sold online at silverfin.com from August 2024 through January 2026.",
    },
    # LED Touch Dimmer Desk Lamp
    {
        "recallID": 5061,
        "productName": "GlowMax Folding LED Touch Dimmer Desk Lamp Dual Head USB Charge Clock",
        "manufacturerName": "GlowMax",
        "hazard": "Power adapter can overheat and ignite the plastic housing, posing fire hazards.",
        "recallDate": date(2026, 4, 26),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/glowmax-desk-lamp",
        "remedy": "Refund",
        "units": "About 17,200 units.",
        "soldAt": "Sold at Bed Bath & Beyond, Target, and online at glowmax.com from June 2024 through November 2025.",
    },
    # LED Star Night Light
    {
        "recallID": 5062,
        "productName": "NightSpark LED Star Night Light Plug-In Lamp Baby Room",
        "manufacturerName": "NightSpark",
        "hazard": "Plug-in housing can crack and expose live electrical contacts, posing electric shock hazards to children.",
        "recallDate": date(2026, 5, 2),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/nightspark-night-light",
        "remedy": "Replace",
        "units": "About 28,000 units.",
        "soldAt": "Sold at Buy Buy Baby and online at nightspark.com from March 2025 through January 2026.",
    },
    # Curtains
    {
        "recallID": 5063,
        "productName": "HearthGuard French Country Blue Floral Curtains Light Filtering 52x84",
        "manufacturerName": "HearthGuard",
        "hazard": "Curtain fabric does not meet federal flammability standards, posing fire hazards near open flames.",
        "recallDate": date(2026, 5, 6),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/hearthguard-curtains",
        "remedy": "Refund",
        "units": "About 11,400 units.",
        "soldAt": "Sold online at hearthguard.com and Wayfair from January 2025 through December 2025.",
    },
    # Car Phone Holder Magnetic
    {
        "recallID": 5064,
        "productName": "DriveSafe Magnetic Car Phone Holder Mount",
        "manufacturerName": "DriveSafe",
        "hazard": "Magnet retention can release at highway speeds, causing the phone to fall and creating a driver-distraction hazard.",
        "recallDate": date(2026, 5, 9),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/drivesafe-phone-holder",
        "remedy": "Replace",
        "units": "About 19,500 units.",
        "soldAt": "Sold at AutoZone, Amazon.com, and online at drivesafe.com from August 2024 through November 2025.",
    },
    # Wireless Charging Pad
    {
        "recallID": 5065,
        "productName": "ChargeMate Wireless Charging Pad Qi Fast Charge Mat Car Charger",
        "manufacturerName": "ChargeMate",
        "hazard": "Charging coil can overheat the pad surface to over 70°C, posing burn hazards.",
        "recallDate": date(2026, 5, 13),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/chargemate-wireless-pad",
        "remedy": "Refund",
        "units": "About 36,000 units.",
        "soldAt": "Sold at Best Buy, Target, and Amazon.com from June 2024 through October 2025.",
    },
    # Mens Cotton Jacket
    {
        "recallID": 5066,
        "productName": "TrekFit Mens Cotton Jacket Hooded Outerwear",
        "manufacturerName": "TrekFit",
        "hazard": "Drawstring around the hood does not meet federal children's outerwear standards, posing strangulation and entrapment hazards.",
        "recallDate": date(2026, 5, 17),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/trekfit-cotton-jacket",
        "remedy": "Repair",
        "units": "About 8,100 units.",
        "soldAt": "Sold at Macy's, Kohl's, and online at trekfit.com from September 2024 through November 2025.",
    },
    # Faux Leather Moto Biker Jacket
    {
        "recallID": 5067,
        "productName": "VeloFit Womens Removable Hooded Faux Leather Moto Biker Jacket",
        "manufacturerName": "VeloFit",
        "hazard": "Hood drawstring exceeds CPSC length limits and poses entrapment and strangulation hazards.",
        "recallDate": date(2026, 5, 21),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/velofit-moto-jacket",
        "remedy": "Repair",
        "units": "About 5,600 units.",
        "soldAt": "Sold at Nordstrom Rack and online at velofit.com from October 2024 through January 2026.",
    },
    # Hoodie — Chaz Kangeroo Hoodie
    {
        "recallID": 5068,
        "productName": "ChazWear Chaz Kangeroo Hoodie Black Pullover",
        "manufacturerName": "ChazWear",
        "hazard": "Cotton blend fabric is highly flammable and does not meet federal flammable fabrics standard.",
        "recallDate": date(2026, 5, 24),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/chazwear-kangeroo-hoodie",
        "remedy": "Refund",
        "units": "About 13,200 units.",
        "soldAt": "Sold online at chazwear.com from June 2024 through December 2025.",
    },
    # Anime Hoodie Oversized Pullover
    {
        "recallID": 5069,
        "productName": "KidGlow Anime Hoodie Oversized Pullover Youth Sweatshirt",
        "manufacturerName": "KidGlow",
        "hazard": "Drawstring around the hood violates federal children's clothing safety standards and poses strangulation hazards.",
        "recallDate": date(2026, 5, 28),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/kidglow-anime-hoodie",
        "remedy": "Repair",
        "units": "About 7,300 units.",
        "soldAt": "Sold online at kidglow.com and through Etsy from August 2024 through October 2025.",
    },
    # Pet Hoodie
    {
        "recallID": 5070,
        "productName": "PawWag Pet Hoodie Drawstring Sweater",
        "manufacturerName": "PawWag",
        "hazard": "Decorative buttons can detach and pose choking hazards to pets.",
        "recallDate": date(2026, 6, 2),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/pawwag-pet-hoodie",
        "remedy": "Refund",
        "units": "About 4,800 units.",
        "soldAt": "Sold at PetSmart and online at pawwag.com from January 2025 through November 2025.",
    },
    # SHEIN Floral Print Cutout Dress
    {
        "recallID": 5071,
        "productName": "BlossomFit SHEIN Floral Print Cutout Dress NWT Medium",
        "manufacturerName": "BlossomFit",
        "hazard": "Polyester fabric does not meet flammability standards, posing burn hazards.",
        "recallDate": date(2026, 6, 5),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/blossomfit-cutout-dress",
        "remedy": "Refund",
        "units": "About 22,500 units.",
        "soldAt": "Sold online at blossomfit.com from May 2024 through December 2025.",
    },
    # Sleeveless Pink Ruched Midi Dress
    {
        "recallID": 5072,
        "productName": "AuroraStyle Sleeveless Pink Ruched Midi Dress Womens",
        "manufacturerName": "AuroraStyle",
        "hazard": "Synthetic fibers can melt and adhere to skin if exposed to flame, causing severe burns.",
        "recallDate": date(2026, 6, 9),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/aurorastyle-midi-dress",
        "remedy": "Refund",
        "units": "About 6,200 units.",
        "soldAt": "Sold online at aurorastyle.com from August 2024 through October 2025.",
    },
    # PEAK Hiking Shoes
    {
        "recallID": 5073,
        "productName": "TrailFox PEAK Hiking Shoes Mens Outdoor",
        "manufacturerName": "TrailFox",
        "hazard": "Outsole can separate from the upper during use, posing fall and ankle-injury hazards.",
        "recallDate": date(2026, 6, 12),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/trailfox-peak-hiking-shoes",
        "remedy": "Replace",
        "units": "About 9,400 units.",
        "soldAt": "Sold at REI, Dick's Sporting Goods, and online at trailfox.com from March 2025 through December 2025.",
    },
    # Under Armour Tactical Shoes
    {
        "recallID": 5074,
        "productName": "GearStrike Under Armour UA Micro G Strikefast Mid Tactical Shoes",
        "manufacturerName": "GearStrike",
        "hazard": "Toe-cap material does not meet ASTM F2413 protective-toe requirements as advertised, posing crush-injury hazards on jobsites.",
        "recallDate": date(2026, 6, 16),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/gearstrike-tactical-shoes",
        "remedy": "Refund",
        "units": "About 11,000 units.",
        "soldAt": "Sold at Bass Pro Shops, Cabela's, and online at gearstrike.com from June 2024 through November 2025.",
    },
    # TAG Heuer Watch
    {
        "recallID": 5075,
        "productName": "TimeMaster TAG Heuer Carrera Chronograph Watch CBS2210",
        "manufacturerName": "TimeMaster",
        "hazard": "Lithium watch battery can leak corrosive electrolyte, causing skin irritation and chemical burns.",
        "recallDate": date(2026, 6, 19),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/timemaster-carrera-watch",
        "remedy": "Replace",
        "units": "About 3,400 units.",
        "soldAt": "Sold at authorized timemaster.com retailers from October 2024 through January 2026.",
    },
    # Bamboo Polarized Sunglasses
    {
        "recallID": 5076,
        "productName": "SunBlaze Bamboo Polarized Sunglasses UV400",
        "manufacturerName": "SunBlaze",
        "hazard": "Lenses do not block UV-A and UV-B radiation as advertised, posing risk of long-term eye damage.",
        "recallDate": date(2026, 6, 22),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/sunblaze-bamboo-sunglasses",
        "remedy": "Refund",
        "units": "About 14,000 units.",
        "soldAt": "Sold online at sunblaze.com from April 2025 through December 2025.",
    },
    # Cold Steel Mini Tuff Lite Pocket Knife
    {
        "recallID": 5077,
        "productName": "BladeCraft Cold Steel Mini Tuff Lite Pocket Knife",
        "manufacturerName": "BladeCraft",
        "hazard": "Lock-back mechanism can fail under load, causing the blade to fold onto the user's fingers and pose laceration hazards.",
        "recallDate": date(2026, 6, 26),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/bladecraft-pocket-knife",
        "remedy": "Repair",
        "units": "About 5,100 units.",
        "soldAt": "Sold at Bass Pro Shops and online at bladecraft.com from August 2024 through October 2025.",
    },
    # Schrade Fixed Blade Knife
    {
        "recallID": 5078,
        "productName": "NorthForge Schrade Exertion DP Fixed Blade Knife 4 in",
        "manufacturerName": "NorthForge",
        "hazard": "Sheath retention clip can fail, allowing the blade to detach and pose serious laceration hazards.",
        "recallDate": date(2026, 7, 1),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/northforge-fixed-blade-knife",
        "remedy": "Replace",
        "units": "About 2,900 units.",
        "soldAt": "Sold at hunting and outdoor retailers and at northforge.com from September 2024 through November 2025.",
    },
    # X-Men Comic
    {
        "recallID": 5079,
        "productName": "PageQuest X-Men Comic Book Issue 2 Collectible",
        "manufacturerName": "PageQuest",
        "hazard": "Glossy finish coating contains lead exceeding federal limits, posing lead-poisoning hazards if handled by children.",
        "recallDate": date(2026, 7, 4),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/pagequest-xmen-comic",
        "remedy": "Refund",
        "units": "About 6,000 copies.",
        "soldAt": "Sold at independent comic shops and online at pagequest.com from June 2024 through December 2025.",
    },
    # Game of Thrones Board Game
    {
        "recallID": 5080,
        "productName": "TableTopia A Game of Thrones The Board Game Second Edition",
        "manufacturerName": "TableTopia",
        "hazard": "Small game pieces can detach from larger figurines, posing choking hazards to children under 3.",
        "recallDate": date(2026, 7, 8),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/tabletopia-thrones-board-game",
        "remedy": "Refund",
        "units": "About 3,800 units.",
        "soldAt": "Sold at hobby and game stores nationwide from August 2024 through November 2025.",
    },
    # Voit Playground Ball
    {
        "recallID": 5081,
        "productName": "HoopBlast Voit Playground Ball 10-Inch Blue",
        "manufacturerName": "HoopBlast",
        "hazard": "Rubber bladder can rupture and release a small detachable valve, posing choking hazards to young children.",
        "recallDate": date(2026, 7, 11),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/hoopblast-playground-ball",
        "remedy": "Refund",
        "units": "About 25,000 units.",
        "soldAt": "Sold at Walmart, Target, and online at hoopblast.com from January 2025 through December 2025.",
    },
]


def main():
    db = SessionLocal()
    try:
        # 1. Audit which seeded IDs are FK-referenced and must be preserved
        in_use = {r[0] for r in db.query(ShortList.recallID).distinct()}
        in_use |= {r[0] for r in db.query(Violation.recallID).distinct() if r[0]}

        # 2. Delete unused recalls from the prior synthetic batch (5020-5049)
        deleted = 0
        for rid in range(5020, 5050):
            if rid in in_use:
                continue
            if db.query(Recall).filter(Recall.recallID == rid).delete():
                deleted += 1

        # 3. Insert the new sandbox-tuned recalls (skipping any that already exist)
        inserted = 0
        for entry in RECALLS:
            existing = db.query(Recall).filter(Recall.recallID == entry["recallID"]).first()
            if existing:
                continue
            db.add(Recall(**entry))
            inserted += 1

        db.commit()
        print(f"Deleted {deleted} unused synthetic recalls (5020-5049 range).")
        print(f"Inserted {inserted} sandbox-tuned recalls (5050-{5050 + inserted - 1}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
