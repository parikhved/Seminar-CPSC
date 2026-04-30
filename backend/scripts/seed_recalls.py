"""Seed additional realistic CPSC-style recalls into the recall table.

Idempotent: skips inserts whose recallID already exists.
Run from the backend/ directory: python scripts/seed_recalls.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Recall


RECALLS = [
    # Toys
    {
        "recallID": 5020,
        "productName": "BounceTime Inflatable Bouncer with Slide",
        "manufacturerName": "JumpPro Toys",
        "hazard": "Inflation blower can overheat and ignite the fabric, posing fire and burn hazards to children.",
        "recallDate": date(2026, 3, 4),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/jumppro-bouncer",
        "remedy": "Refund",
        "units": "About 24,500 units in the United States and Canada.",
        "soldAt": "Sold at Walmart, Target, and Amazon.com from January 2024 through November 2025.",
    },
    {
        "recallID": 5021,
        "productName": "TinyTrack Magnetic Building Set (75 pieces)",
        "manufacturerName": "MagWorld",
        "hazard": "High-powered magnets can detach; if swallowed, they can attract through the intestinal wall causing serious injury or death.",
        "recallDate": date(2026, 3, 9),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/magworld-tinytrack",
        "remedy": "Refund",
        "units": "About 56,000 units.",
        "soldAt": "Sold online at amazon.com, magworld.com, and at specialty toy stores from August 2023 through October 2025.",
    },
    {
        "recallID": 5022,
        "productName": "GrippyPals Plush Animal Squeaker Toys",
        "manufacturerName": "PlushPals",
        "hazard": "The plastic squeaker can detach and become a choking hazard for young children.",
        "recallDate": date(2026, 3, 16),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/plushpals-grippypals",
        "remedy": "Refund",
        "units": "About 18,000 units.",
        "soldAt": "Sold at independent toy retailers nationwide and online at plushpals.com from May 2024 through December 2025.",
    },
    {
        "recallID": 5023,
        "productName": "RocketLab Junior Chemistry Kit",
        "manufacturerName": "BrightSparks",
        "hazard": "Included sodium hydroxide packets are not properly labeled; skin contact can cause chemical burns.",
        "recallDate": date(2026, 3, 22),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/brightsparks-rocketlab",
        "remedy": "Refund",
        "units": "About 9,400 units.",
        "soldAt": "Sold at Barnes & Noble, Mindware, and online at brightsparks.com from June 2024 through January 2026.",
    },

    # Helmets
    {
        "recallID": 5024,
        "productName": "TrailBlaze Youth Bicycle Helmet",
        "manufacturerName": "VeloGear",
        "hazard": "Helmets fail CPSC impact attenuation requirements, posing a head-injury hazard in a crash.",
        "recallDate": date(2026, 2, 24),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/velogear-trailblaze",
        "remedy": "Replace",
        "units": "About 41,000 units.",
        "soldAt": "Sold at Dick's Sporting Goods, REI, and online at velogear.com from March 2024 through October 2025.",
    },
    {
        "recallID": 5025,
        "productName": "ProSkate Adult Multi-Sport Helmet",
        "manufacturerName": "RidgeProtect",
        "hazard": "Chin strap buckle can fail under impact; helmet can come off the head, posing a head-injury risk.",
        "recallDate": date(2026, 3, 1),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/ridgeprotect-proskate",
        "remedy": "Refund",
        "units": "About 12,500 units.",
        "soldAt": "Sold at skate shops nationwide and online at ridgeprotect.com from April 2024 through November 2025.",
    },

    # Furniture
    {
        "recallID": 5026,
        "productName": "Hartwell 5-Drawer Tall Dresser",
        "manufacturerName": "OakHaven",
        "hazard": "Dresser is unstable if not anchored to the wall; it can tip over, posing entrapment and death hazards to children.",
        "recallDate": date(2026, 2, 27),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/oakhaven-hartwell",
        "remedy": "Refund",
        "units": "About 78,000 units.",
        "soldAt": "Sold at Wayfair, Amazon, and oakhaven.com from January 2023 through August 2025.",
    },
    {
        "recallID": 5027,
        "productName": "ZenLoft Memory Foam Bunk Bed",
        "manufacturerName": "DreamFrame",
        "hazard": "Side rails can detach during use, posing a fall hazard to children sleeping on the upper bunk.",
        "recallDate": date(2026, 3, 11),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/dreamframe-zenloft",
        "remedy": "Repair",
        "units": "About 6,200 units.",
        "soldAt": "Sold exclusively online at dreamframe.com from February 2024 through January 2026.",
    },
    {
        "recallID": 5028,
        "productName": "GlideEase Reclining Sofa with USB Ports",
        "manufacturerName": "ComfortCo",
        "hazard": "USB charging port can overheat, posing fire and burn hazards.",
        "recallDate": date(2026, 3, 18),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/comfortco-glideease",
        "remedy": "Repair",
        "units": "About 33,000 units.",
        "soldAt": "Sold at Costco, Ashley HomeStore, and online at comfortco.com from June 2024 through December 2025.",
    },

    # Outdoor Equipment
    {
        "recallID": 5029,
        "productName": "SkyHigh Backyard Wooden Swing Set",
        "manufacturerName": "PlayCanopy",
        "hazard": "Wooden A-frame supports can crack at the base, causing the swing set to collapse.",
        "recallDate": date(2026, 2, 21),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/playcanopy-skyhigh",
        "remedy": "Repair",
        "units": "About 4,500 units.",
        "soldAt": "Sold at Sam's Club, BJ's Wholesale, and online at playcanopy.com from May 2024 through November 2025.",
    },
    {
        "recallID": 5030,
        "productName": "FrontierGrill Propane BBQ Grill",
        "manufacturerName": "EmberCraft",
        "hazard": "Gas regulator can leak propane, posing fire and burn hazards.",
        "recallDate": date(2026, 3, 6),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/embercraft-frontiergrill",
        "remedy": "Repair",
        "units": "About 21,000 units.",
        "soldAt": "Sold at Home Depot and online at embercraft.com from March 2024 through December 2025.",
    },
    {
        "recallID": 5031,
        "productName": "TrailMaster Camping Lantern with Power Bank",
        "manufacturerName": "BlazeOutdoors",
        "hazard": "Lithium-ion battery can overheat, swell, and ignite, posing fire and burn hazards.",
        "recallDate": date(2026, 3, 25),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/blazeoutdoors-trailmaster",
        "remedy": "Refund",
        "units": "About 14,800 units.",
        "soldAt": "Sold at REI, Cabela's, and online at blazeoutdoors.com from January 2025 through January 2026.",
    },

    # Baby Products
    {
        "recallID": 5032,
        "productName": "SnuggleNest Inclined Infant Sleeper",
        "manufacturerName": "LittleStar",
        "hazard": "Incline angle does not meet the federal Safe Sleep for Babies Act, posing a suffocation hazard to infants.",
        "recallDate": date(2026, 2, 26),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/littlestar-snugglenest",
        "remedy": "Refund",
        "units": "About 87,000 units.",
        "soldAt": "Sold at Buy Buy Baby, Target, and Walmart from January 2023 through December 2024.",
    },
    {
        "recallID": 5033,
        "productName": "ToddlerStep Activity Walker",
        "manufacturerName": "FirstSteps",
        "hazard": "Walker can roll over uneven surfaces and stair edges with the safety stop disabled, posing fall hazards.",
        "recallDate": date(2026, 3, 8),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/firststeps-toddlerstep",
        "remedy": "Repair",
        "units": "About 11,000 units.",
        "soldAt": "Sold at Target and Amazon.com from August 2024 through November 2025.",
    },
    {
        "recallID": 5034,
        "productName": "CribKeeper Mesh Side Sleeper Attachment",
        "manufacturerName": "BabyHaven",
        "hazard": "Mesh fabric can detach from frame creating a gap where infants can become entrapped.",
        "recallDate": date(2026, 3, 15),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/babyhaven-cribkeeper",
        "remedy": "Refund",
        "units": "About 6,800 units.",
        "soldAt": "Sold online at babyhaven.com and through Etsy from May 2024 through December 2025.",
    },

    # Vehicles
    {
        "recallID": 5035,
        "productName": "ZoomGo Electric Kick Scooter (350W)",
        "manufacturerName": "VoltRide",
        "hazard": "Battery management system can fail, causing the lithium-ion battery to overheat and ignite.",
        "recallDate": date(2026, 2, 19),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/voltride-zoomgo",
        "remedy": "Replace",
        "units": "About 28,500 units.",
        "soldAt": "Sold at Best Buy, Target, and online at voltride.com from October 2024 through December 2025.",
    },
    {
        "recallID": 5036,
        "productName": "TrailKing Youth Mountain Bike (24-inch)",
        "manufacturerName": "GearStream",
        "hazard": "Front fork can fracture during use, posing crash and injury hazards.",
        "recallDate": date(2026, 3, 13),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/gearstream-trailking",
        "remedy": "Repair",
        "units": "About 9,200 units.",
        "soldAt": "Sold at Dick's Sporting Goods and online at gearstream.com from March 2025 through January 2026.",
    },
    {
        "recallID": 5037,
        "productName": "GlideKart Junior Pedal Go-Kart",
        "manufacturerName": "DriveTinker",
        "hazard": "Steering column can disconnect, causing loss of control and posing crash and injury hazards.",
        "recallDate": date(2026, 3, 20),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/drivetinker-glidekart",
        "remedy": "Repair",
        "units": "About 4,300 units.",
        "soldAt": "Sold at Tractor Supply Co. and online at drivetinker.com from June 2024 through November 2025.",
    },

    # Appliances
    {
        "recallID": 5038,
        "productName": "QuickCrisp 6-Quart Air Fryer",
        "manufacturerName": "HearthLine",
        "hazard": "Internal wiring can short, posing fire and burn hazards.",
        "recallDate": date(2026, 2, 23),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/hearthline-quickcrisp",
        "remedy": "Refund",
        "units": "About 145,000 units.",
        "soldAt": "Sold at Walmart, Costco, and Amazon.com from January 2024 through October 2025.",
    },
    {
        "recallID": 5039,
        "productName": "BrewMate Single-Serve Coffee Maker",
        "manufacturerName": "MorningCo",
        "hazard": "Water reservoir can leak onto the heating element causing electrical shock to consumers.",
        "recallDate": date(2026, 3, 3),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/morningco-brewmate",
        "remedy": "Refund",
        "units": "About 62,000 units.",
        "soldAt": "Sold at Bed Bath & Beyond, Target, and online at morningco.com from August 2024 through November 2025.",
    },
    {
        "recallID": 5040,
        "productName": "FreshFlow Countertop Dishwasher",
        "manufacturerName": "AquaTek",
        "hazard": "Internal heater element can fail, posing burn and fire hazards.",
        "recallDate": date(2026, 3, 17),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/aquatek-freshflow",
        "remedy": "Repair",
        "units": "About 19,500 units.",
        "soldAt": "Sold at Home Depot and Amazon.com from May 2024 through January 2026.",
    },
    {
        "recallID": 5041,
        "productName": "ChillMax Portable Mini Fridge (40L)",
        "manufacturerName": "FrostKraft",
        "hazard": "Refrigerant tubing can crack and release flammable gas, posing fire and explosion hazards.",
        "recallDate": date(2026, 3, 24),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/frostkraft-chillmax",
        "remedy": "Refund",
        "units": "About 8,700 units.",
        "soldAt": "Sold online at frostkraft.com and at college bookstores from August 2024 through December 2025.",
    },

    # Other / electronics / household
    {
        "recallID": 5042,
        "productName": "GuardLite Hardwired Carbon Monoxide Detector",
        "manufacturerName": "SecureHome",
        "hazard": "Detector may fail to alarm at elevated CO levels, posing CO poisoning and death hazards.",
        "recallDate": date(2026, 2, 28),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/securehome-guardlite",
        "remedy": "Replace",
        "units": "About 53,000 units.",
        "soldAt": "Sold at Lowe's, Menards, and securehome.com from January 2024 through November 2025.",
    },
    {
        "recallID": 5043,
        "productName": "PowerStream Multi-Outlet Surge Protector",
        "manufacturerName": "TechLink",
        "hazard": "Internal MOV component can overheat and melt the housing, posing fire hazards.",
        "recallDate": date(2026, 3, 7),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/techlink-powerstream",
        "remedy": "Replace",
        "units": "About 38,000 units.",
        "soldAt": "Sold at Office Depot, Staples, and Amazon.com from June 2024 through December 2025.",
    },
    {
        "recallID": 5044,
        "productName": "BrightPath Solar Garden Path Lights",
        "manufacturerName": "GleamWorks",
        "hazard": "Battery housing is not weather-sealed and can short, posing fire hazards.",
        "recallDate": date(2026, 3, 12),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/gleamworks-brightpath",
        "remedy": "Refund",
        "units": "About 16,200 units.",
        "soldAt": "Sold at Costco and online at gleamworks.com from March 2025 through December 2025.",
    },
    {
        "recallID": 5045,
        "productName": "LumaPro Ring Light with Tripod (18-inch)",
        "manufacturerName": "GleamWorks",
        "hazard": "Power adapter can overheat, posing fire and burn hazards.",
        "recallDate": date(2026, 3, 19),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/gleamworks-lumapro",
        "remedy": "Replace",
        "units": "About 22,500 units.",
        "soldAt": "Sold at Best Buy, B&H Photo, and Amazon.com from October 2024 through December 2025.",
    },
    {
        "recallID": 5046,
        "productName": "AquaJet Cordless Pressure Washer",
        "manufacturerName": "FlowCraft",
        "hazard": "Battery pack can swell and ignite during charging, posing fire hazards.",
        "recallDate": date(2026, 3, 26),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/flowcraft-aquajet",
        "remedy": "Refund",
        "units": "About 7,400 units.",
        "soldAt": "Sold at Lowe's and online at flowcraft.com from May 2025 through January 2026.",
    },
    {
        "recallID": 5047,
        "productName": "CozyKnit Heated Throw Blanket",
        "manufacturerName": "WarmLight",
        "hazard": "Heating element can fail and overheat, posing burn and fire hazards.",
        "recallDate": date(2026, 4, 2),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/warmlight-cozyknit",
        "remedy": "Refund",
        "units": "About 31,000 units.",
        "soldAt": "Sold at Macy's, Kohl's, and online at warmlight.com from September 2024 through November 2025.",
    },
    {
        "recallID": 5048,
        "productName": "PetPalace Heated Pet Bed",
        "manufacturerName": "WarmLight",
        "hazard": "Heating coils can come into direct contact with chewed fabric, posing fire and shock hazards.",
        "recallDate": date(2026, 4, 8),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/warmlight-petpalace",
        "remedy": "Refund",
        "units": "About 9,800 units.",
        "soldAt": "Sold at PetSmart and online at chewy.com from June 2024 through December 2025.",
    },
    {
        "recallID": 5049,
        "productName": "WhirlBlade Stand Mixer (5.5 Quart)",
        "manufacturerName": "HearthLine",
        "hazard": "Motor housing can crack, exposing live wiring and posing electric shock hazards.",
        "recallDate": date(2026, 4, 14),
        "recallURL": "https://www.cpsc.gov/Recalls/2026/hearthline-whirlblade",
        "remedy": "Repair",
        "units": "About 17,200 units.",
        "soldAt": "Sold at Williams Sonoma, Macy's, and hearthline.com from August 2024 through January 2026.",
    },
]


def main():
    db = SessionLocal()
    inserted = 0
    skipped = 0
    try:
        for entry in RECALLS:
            existing = db.query(Recall).filter(Recall.recallID == entry["recallID"]).first()
            if existing:
                skipped += 1
                continue
            db.add(Recall(**entry))
            inserted += 1
        db.commit()
    finally:
        db.close()
    print(f"Inserted {inserted} new recalls; skipped {skipped} existing rows.")


if __name__ == "__main__":
    main()
