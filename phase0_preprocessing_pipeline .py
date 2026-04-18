#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
  J. E-COMMERCE MULTIMODAL RAG — MASTER PREPROCESSING PIPELINE
═══════════════════════════════════════════════════════════════════════════════

  INPUT:  j_products_detailed.json  (raw scraped data)
  OUTPUT: enriched_data/
            ├── products_hierarchical.json   → Phase 1 (embeddings)
            ├── products_attribute_indexed.json
            ├── products_flat.csv
            ├── bm25_corpus.json             → Phase 2/3 (sparse retrieval)
            └── image_registry.json          → CLIP embeddings

  WHAT THIS DOES:
    1. Extracts GENDER from category_source URL (Men/Women/Boys/Girls/Kids/Unisex)
    2. Extracts PRODUCT TYPE from attributes["Product Category"] + URL fallback
    3. Parses FRAGRANCE NOTES from description_text (Top/Heart/Base/Accords/Size)
    4. Extracts COLOR, FABRIC, SEASON, WEAR TYPE from attributes
    5. Parses PRICE to numeric
    6. Builds RICH SEARCHABLE CHUNKS (primary + detailed) for embedding
    7. Generates context-aware HyDE QUERIES per product type
    8. Builds ENRICHED KEYWORDS for BM25 sparse retrieval
    9. Exports ALL output formats with COMPLETE metadata for filtering
"""

import json, re, csv, os, hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from collections import Counter
from datetime import datetime

# ═════════════════════════════════════════════════════════════════════════════
#  PATHS
# ═════════════════════════════════════════════════════════════════════════════
BASE_DIR   = Path(__file__).parent
INPUT_FILE = BASE_DIR / "j_products_detailed.json"
OUTPUT_DIR = BASE_DIR / "enriched_data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ═════════════════════════════════════════════════════════════════════════════
#  1. GENDER CLASSIFICATION — from category_source URL (ground truth)
# ═════════════════════════════════════════════════════════════════════════════

def extract_gender(product: Dict) -> str:
    """
    Extract gender/audience from the J. website category URL.
    Returns: 'Men', 'Women', 'Boys', 'Girls', 'Kids', 'Unisex'

    IMPORTANT: Product Category attribute overrides URL when it explicitly
    indicates children's products (Infant Girl, Girls 2 Piece, etc.) because
    these items may appear under womens/ URLs (e.g. mama-me collection).
    """
    url = product.get("category_source", "").lower()
    path = url.replace("https://www.junaidjamshed.com/", "")
    pc = product.get("attributes", {}).get("Product Category", "").lower()


    if (pc.startswith("infant girl") or pc.startswith("girls")
            or pc in ("teens kurti", "teens 2 piece", "teens 3 piece")):
        return "Girls"
    if (pc.startswith("infant kameez") or pc.startswith("infant boy")
            or pc.startswith("boys") or pc in ("teens kameez shalwar", "teens kurta")):
        return "Boys"

    if path.startswith("mens/") or path.startswith("cast-crew/men"):
        return "Men"
    if path.startswith("womens/") or path.startswith("syncc/women"):
        return "Women"

    if "teen-boys" in path or "kids-boys" in path:
        return "Boys"
    if "teen-girls" in path or "kids-girls" in path or "essentials/teen-girls" in path:
        return "Girls"

    if "infant" in path:
        if "infant-girls" in path or "infant girl" in pc:
            return "Girls"
        if "infant" in path:
            if "kameez" in pc or "kameez" in path:
                return "Boys"
            return "Kids"

    if path.startswith("boys-girls/"):
        if "girls" in pc:
            return "Girls"
        if "boys" in pc or "kameez" in pc or "kurta" in pc:
            return "Boys"
        return "Kids"

    if "fragrances/for-men" in path:
        return "Men"
    if "fragrances/for-women" in path:
        return "Women"
    if "fragrances/for-kids" in path:
        return "Kids"
    if "fragrances/" in path:
        return "Unisex"

    if path.startswith("makeup/") or path.startswith("skin-care/"):
        return "Unisex"

    if "syncc" in path:
        if any(w in pc for w in ["women", "ladies", "tops"]):
            return "Women"
        return "Unisex"

    if "featured-collection" in path or "co-ord" in path:
        if any(w in pc for w in ["ladies", "women", "girl"]):
            return "Women"
        if any(w in pc for w in ["men ", "kameez shalwar", "kurta"]):
            return "Men"
        if "co-ord" in path:
            return "Women"
        return "Unisex"

    desc = product.get("description_text", "").lower()
    name = product.get("name", "").lower()
    combined = f"{name} {desc}"

    if re.search(r'\bpour homme\b|\bfor him\b', combined):
        return "Men"
    if re.search(r'\bpour femme\b|\bfor her\b', combined):
        return "Women"

    return "Unisex"


# ═════════════════════════════════════════════════════════════════════════════
#  2. PRODUCT TYPE CLASSIFICATION — from Product Category attribute
# ═════════════════════════════════════════════════════════════════════════════

PC_MAP = {
    "Casual Kameez Shalwar":          "Kameez Shalwar",
    "Semi-Formal Kameez Shalwar":     "Kameez Shalwar",
    "Formal Kameez Shalwar":          "Kameez Shalwar",
    "Exclusive Kameez Shalwar":       "Kameez Shalwar",
    "Kurta Trousers":                 "Kurta",
    "Semi-Formal Kurta":              "Kurta",
    "Special Kurta":                  "Kurta",
    "Formal Kurta":                   "Kurta",
    "Casual Kurta":                   "Kurta",
    "Formal Shirt":                   "Shirt",
    "Jubba/Thobe":                    "Jubba",
    "Inner wear":                     "Underwear",
    "Jackets & Sweaters":             "Jacket",
    "Waistcoat":                      "Waistcoat",
    "Unstitched Kameez Shalwar Fabric": "Unstitched Fabric",

    "Unstitched 3 Piece":             "Unstitched Suit",
    "Unstitched 1 Piece":             "Unstitched Suit",
    "3 Piece Stitched":               "Stitched Suit",
    "Shirt and Trouser":              "Co-ord Set",
    "Shirt and Dupatta":              "Shirt & Dupatta",
    "Trendy Shirt":                   "Kurti",
    "Ladies Trousers":                "Trousers",
    "Ladies Shalwar":                 "Shalwar",
    "Ladies Dupatta":                 "Dupatta",
    "Ladies Stole":                   "Stole",
    "Ladies Bags":                    "Bag",
    "Tops":                           "Top",
    "Saree":                          "Saree",
    "Co-ord Set":                     "Co-ord Set",

    "Teens 2 Piece":                  "Stitched Suit",
    "Teens 3 Piece":                  "Stitched Suit",
    "Teens Kurti":                    "Kurti",
    "Teens Kameez Shalwar":           "Kameez Shalwar",
    "Teens Kurta":                    "Kurta",
    "Infant Kameez Shalwar":          "Kameez Shalwar",
    "Infant Girl":                    "Frock",
    "Girls 3 Piece":                  "Stitched Suit",
    "Girls 2 Piece":                  "Stitched Suit",
    "Girls Trousers":                 "Trousers",
    "Girls Kurti":                    "Kurti",
    "Boys Kameez Shalwar":            "Kameez Shalwar",

    "Men Peshawari Chappal":          "Peshawari Chappal",
    "Men Footwear":                   "Sandals",
    "Women Footwear":                 "Sandals",

    "Lips":                           "Lip Makeup",
    "Eyes":                           "Eye Makeup",
    "Face":                           "Face Makeup",

    "Bangles":                        "Bangles",
    "Earrings":                       "Earrings",
    "Ring":                           "Ring",
    "Bracelet":                       "Bracelet",
    "Necklace":                       "Necklace",
}


def classify_product_type(product: Dict) -> str:
    """Classify product type from attributes and URL."""
    pc = product.get("attributes", {}).get("Product Category", "")
    url = product.get("category_source", "").lower()
    name = product.get("name", "").upper()
    desc = product.get("description_text", "").lower()

    if pc in PC_MAP:
        return PC_MAP[pc]

    if "fragrances/" in url:
        if "perfume" in url or "for-men" in url or "for-women" in url:
            if "body-spray" in url:
                return "Body Spray"
            if "body-mist" in url or "body-mis" in url:
                return "Body Mist"
            if "gift-se" in url:
                return "Gift Set"
            if "beard-oi" in url:
                return "Beard Oil"
            return "Perfume"
        if "bakhoor" in url:
            return "Bakhoor"
        if "collection" in url:
            return "Perfume"
        return "Fragrance"

    if "cast-crew/men/perfume" in url:
        return "Perfume"
    if "cast-crew/men/kurta" in url:
        return "Kurta"
    if "cast-crew/men/jackets" in url:
        return "Jacket"

    if "makeup/eyes" in url:
        return "Eye Makeup"
    if "makeup/lip" in url:
        return "Lip Makeup"
    if "makeup/face" in url:
        return "Face Makeup"
    if "skin-care/" in url:
        return "Skincare"
    if "shower-ge" in url:
        return "Shower Gel"

    if "foot-wear" in url or "footwear" in url:
        if "sandal" in name.lower() or "peshawari" in name.lower() or "chappal" in name.lower():
            return "Peshawari Chappal"
        if "slide" in name.lower():
            return "Slides"
        return "Sandals"

    if "streetwear" in url:
        return "Streetwear"
    if "heritage" in url:
        return "Kameez Shalwar"
    if "unstitched" in url:
        return "Unstitched Fabric"

    if "BAKHOOR" in name:
        return "Bakhoor"
    if "SHOWER GEL" in name:
        return "Shower Gel"
    if "HAIR MIST" in name:
        return "Hair Mist"
    if "HAND CREAM" in name or "FOOT CREAM" in name:
        return "Skincare"
    if "LIPSTICK" in name or "LIP " in name:
        return "Lip Makeup"
    if "EYESHADOW" in name or "EYEBROW" in name:
        return "Eye Makeup"
    if "HIGHLIGHTER" in name or "CONCEALER" in name or "BLUSHER" in name:
        return "Face Makeup"
    if "SERUM" in name or "TONER" in name or "CREAM" in name:
        return "Skincare"
    if any(kw in name for kw in ["KURTA", "KURTI"]):
        return "Kurti" if "KURTI" in name else "Kurta"
    if "CO-ORD" in name:
        return "Co-ord Set"
    if "KAMEEZ SHALWAR" in name:
        return "Kameez Shalwar"

    if "SHALWAR" in name:
        return "Shalwar"
    if "TROUSER" in name:
        return "Trousers"
    if "UNSTITCHED" in name:
        return "Unstitched Suit"
    if "STITCHED" in name:      
        return "Stitched Suit"
    if "DUPATTA" in name:
        return "Dupatta"
    if "SHIRT" in name:
        return "Shirt"
    if "WAISTCOAT" in name:
        return "Waistcoat"
    if "JACKET" in name:
        return "Jacket"
    if "STOLE" in name:
        return "Stole"
    if "SAREE" in name or "SARI" in name:
        return "Saree"
    if "BAG" in name or "TOTE" in name or "CLUTCH" in name:
        return "Bag"

    return "Other"


# ═════════════════════════════════════════════════════════════════════════════
#  3. FRAGRANCE METADATA PARSER — from description_text
# ═════════════════════════════════════════════════════════════════════════════

def parse_fragrance_notes(desc: str) -> Dict[str, str]:
    """
    Parse fragrance metadata from description text.
    Returns dict with: notes_top, notes_heart, notes_base, main_accords,
                       fragrance_category, size
    """
    result = {
        "notes_top": "",
        "notes_heart": "",
        "notes_base": "",
        "main_accords": "",
        "fragrance_category": "",
        "size": "",
    }

    if not desc:
        return result

    m = re.search(r'Top Notes?:\s*(.+?)(?=Heart Notes?:|Base Notes?:|Dry Down|Size:|$)', desc, re.IGNORECASE)
    if m:
        result["notes_top"] = m.group(1).strip().rstrip(",. ")

    m = re.search(r'Heart Notes?:\s*(.+?)(?=Base Notes?:|Dry Down|Size:|$)', desc, re.IGNORECASE)
    if m:
        result["notes_heart"] = m.group(1).strip().rstrip(",. ")

    m = re.search(r'(?:Base Notes?|Dry Down\s*(?:Base Notes?)?)\s*:?\s*(.+?)(?=Size:|Bottle|$)', desc, re.IGNORECASE)
    if m:
        result["notes_base"] = m.group(1).strip().rstrip(",. ")

    m = re.search(r'Main Accords?\s*(.+?)(?=Top Notes?:|$)', desc, re.IGNORECASE)
    if m:
        result["main_accords"] = m.group(1).strip().rstrip(",. ")

    m = re.search(r'Category:\s*(.+?)(?=Main Accords?|Top Notes?|$)', desc, re.IGNORECASE)
    if m:
        result["fragrance_category"] = m.group(1).strip().rstrip(",. ")

    m = re.search(r'Size:\s*(\d+(?:\.\d+)?)\s*ml', desc, re.IGNORECASE)
    if m:
        result["size"] = f"{m.group(1)}ml"

    return result


# ═════════════════════════════════════════════════════════════════════════════
#  4. PRICE PARSER
# ═════════════════════════════════════════════════════════════════════════════

def parse_price(price_str: str) -> Tuple[float, str]:
    """'PKR 11,990.00' → (11990.0, 'above_10000')"""
    numeric = 0.0
    m = re.search(r'[\d,]+\.?\d*', price_str or "")
    if m:
        numeric = float(m.group().replace(",", ""))

    if numeric < 1000:
        bucket = "under_1000"
    elif numeric < 3000:
        bucket = "1000_3000"
    elif numeric < 5000:
        bucket = "3000_5000"
    elif numeric < 7000:
        bucket = "5000_7000"
    elif numeric < 10000:
        bucket = "7000_10000"
    else:
        bucket = "above_10000"

    return numeric, bucket


# ═════════════════════════════════════════════════════════════════════════════
#  5. CHUNK BUILDER — rich searchable text for embedding
# ═════════════════════════════════════════════════════════════════════════════

def build_primary_chunk(product: Dict, gender: str, product_type: str,
                        price_display: str, price_numeric: float,
                        frag_meta: Dict) -> str:
    """
    Primary searchable chunk: dense combination of all key product signals.
    This is what gets embedded as the main vector.
    """
    name = product.get("name", "")
    stock = product.get("stock_status", "IN STOCK")
    color = product.get("attributes", {}).get("Color", "")
    fabric = product.get("attributes", {}).get("Fabric", "")
    season = product.get("attributes", {}).get("Season", "")

    parts = [f"{name}."]
    parts.append(f"Product type: {product_type}.")
    if gender and gender != "Unisex":
        parts.append(f"For {gender}.")
    if color:
        parts.append(f"Color: {color}.")
    if fabric:
        parts.append(f"Fabric: {fabric}.")
    parts.append(f"Price: {price_display}.")
    parts.append(f"{stock}.")

    if frag_meta.get("fragrance_category"):
        parts.append(f"{frag_meta['fragrance_category']} fragrance.")
    if frag_meta.get("size"):
        parts.append(f"Size: {frag_meta['size']}.")
    if season and season != "(missing)":
        parts.append(f"Season: {season}.")

    return " ".join(parts)


def build_detailed_chunk(product: Dict, gender: str, product_type: str,
                         frag_meta: Dict) -> str:
    """
    Detailed chunk: description + fragrance notes + fabric details.
    For non-fragrance products, this uses the rich raw description.
    """
    desc = product.get("description_text", "") or ""
    if desc.strip() == "N/A":
        desc = ""

    fabric = product.get("attributes", {}).get("Fabric", "")
    wear_type = product.get("attributes", {}).get("Wear Type", "")
    fit_type = product.get("attributes", {}).get("Fit Type", "")

    parts = []

    if frag_meta.get("notes_top"):
        parts.append(f"Top Notes: {frag_meta['notes_top']}.")
    if frag_meta.get("notes_heart"):
        parts.append(f"Heart Notes: {frag_meta['notes_heart']}.")
    if frag_meta.get("notes_base"):
        parts.append(f"Base Notes: {frag_meta['notes_base']}.")
    if frag_meta.get("main_accords"):
        parts.append(f"Main Accords: {frag_meta['main_accords']}.")

    if fabric:
        parts.append(f"Fabric: {fabric}.")
    if wear_type:
        parts.append(f"Wear type: {wear_type}.")
    if fit_type:
        parts.append(f"Fit: {fit_type}.")

    if desc:
        clean_desc = re.sub(r'\(!\)\s*Fragrances and perfumes.*?policy\.?\s*', '', desc)
        clean_desc = re.sub(r'Category:.*?(?=Main Accords|Top Notes|$)', '', clean_desc)
        clean_desc = re.sub(r'Main Accords.*?(?=Top Notes|$)', '', clean_desc)
        clean_desc = re.sub(r'Top Notes?:.*?(?=Size:|Bottle|$)', '', clean_desc)
        clean_desc = re.sub(r'Heart Notes?:.*?(?=Base|Dry Down|Size:|$)', '', clean_desc)
        clean_desc = re.sub(r'(?:Base Notes?|Dry Down).*?(?=Size:|Bottle|$)', '', clean_desc)
        clean_desc = re.sub(r'Size:\s*\d+ml\s*(?:Bottle)?', '', clean_desc)
        clean_desc = clean_desc.strip()
        if clean_desc and len(clean_desc) > 10:
            parts.append(clean_desc)

    return " ".join(parts)


# ═════════════════════════════════════════════════════════════════════════════
#  6. HyDE QUERY GENERATOR — context-aware per product type
# ═════════════════════════════════════════════════════════════════════════════

def generate_hyde(product: Dict, gender: str, product_type: str,
                  price_numeric: float, frag_meta: Dict) -> Dict:
    """
    Generate hypothetical user queries and answers for HyDE embedding.
    Entirely context-aware — no more "fragrance" for sandals.
    """
    name = product.get("name", "")
    color = product.get("attributes", {}).get("Color", "")
    fabric = product.get("attributes", {}).get("Fabric", "")
    price_upper = int(price_numeric * 1.15) if price_numeric else 5000

    gender_prefix = ""
    if gender == "Men":
        gender_prefix = "men's "
    elif gender == "Women":
        gender_prefix = "women's "
    elif gender == "Boys":
        gender_prefix = "boys' "
    elif gender == "Girls":
        gender_prefix = "girls' "
    elif gender == "Kids":
        gender_prefix = "kids' "

    type_lower = product_type.lower()
    queries = []
    answers = []

    if product_type in ("Perfume", "Fragrance", "Body Spray", "Body Mist", "Attar"):
        frag_cat = frag_meta.get("fragrance_category", "")
        notes_top = frag_meta.get("notes_top", "")
        size = frag_meta.get("size", "")

        queries.append(f"Show me {gender_prefix}{frag_cat.lower()} {type_lower} under {price_upper} PKR".strip())
        if notes_top:
            first_note = notes_top.split(",")[0].strip()
            queries.append(f"{gender_prefix}{type_lower} with {first_note} notes")
        notes_base = frag_meta.get("notes_base", "")
        if notes_base:
            first_base = notes_base.split(",")[0].strip()
            queries.append(f"I want a {gender_prefix}fragrance with {first_base} base")
        if size:
            queries.append(f"{size} {gender_prefix}{type_lower} in stock")

        answers.append(
            f"{name} is a {frag_cat.lower()} {type_lower} for {gender.lower()}, "
            f"priced at PKR {price_numeric:,.0f}. "
            + (f"Size: {size}. " if size else "")
            + (f"Top notes include {notes_top}." if notes_top else "")
        )

    elif product_type in ("Kameez Shalwar", "Kurta", "Kurti", "Unstitched Suit",
                          "Stitched Suit", "Co-ord Set", "Shirt & Dupatta",
                          "Trousers", "Shalwar", "Jubba", "Frock",
                          "Top", "Jacket", "Waistcoat", "Shirt", "Stole",
                          "Streetwear", "Unstitched Fabric", "Dupatta"):
        queries.append(f"{gender_prefix}{type_lower} under {price_upper} PKR")
        if color:
            queries.append(f"{color.lower()} {gender_prefix}{type_lower} available in stock")
        if fabric:
            queries.append(f"{fabric.lower()} {gender_prefix}{type_lower}")
        else:
            queries.append(f"best {gender_prefix}{type_lower} at J.")

        answers.append(
            f"{name} is a {gender_prefix}{type_lower}"
            + (f" in {color.lower()}" if color else "")
            + (f", made from {fabric.lower()} fabric" if fabric else "")
            + f", priced at PKR {price_numeric:,.0f}."
        )

    elif product_type in ("Peshawari Chappal", "Sandals", "Slides"):
        queries.append(f"{gender_prefix}{type_lower} under {price_upper} PKR")
        if color:
            queries.append(f"{color.lower()} {gender_prefix}{type_lower}")
        queries.append(f"comfortable {gender_prefix}{type_lower} in stock")

        answers.append(
            f"{name} is a {gender_prefix}{type_lower}"
            + (f" in {color.lower()}" if color else "")
            + f" priced at PKR {price_numeric:,.0f}."
        )

    elif product_type in ("Lip Makeup", "Eye Makeup", "Face Makeup", "Skincare",
                          "Shower Gel", "Hair Mist", "Bakhoor"):
        queries.append(f"{type_lower} under {price_upper} PKR")
        queries.append(f"J. {type_lower} products")
        if color:
            queries.append(f"{color.lower()} {type_lower}")

        answers.append(f"{name} is a {type_lower} product priced at PKR {price_numeric:,.0f}.")

    elif product_type in ("Bangles", "Earrings", "Ring", "Bracelet", "Necklace", "Bag"):
        queries.append(f"{gender_prefix}{type_lower} under {price_upper} PKR")
        if color:
            queries.append(f"{color.lower()} {type_lower}")
        queries.append(f"J. {gender_prefix}{type_lower} in stock")

        answers.append(
            f"{name} is a {gender_prefix}{type_lower}"
            + (f" in {color.lower()}" if color else "")
            + f", priced at PKR {price_numeric:,.0f}."
        )

    else:
        queries.append(f"{gender_prefix}{type_lower} under {price_upper} PKR")
        queries.append(f"J. {gender_prefix}{type_lower} available")

        answers.append(f"{name} is priced at PKR {price_numeric:,.0f} and is currently in stock.")

    queries = [re.sub(r'\s+', ' ', q).strip() for q in queries if q.strip()]
    answers = [re.sub(r'\s+', ' ', a).strip() for a in answers if a.strip()]

    return {
        "hypothetical_queries": queries[:3],
        "hypothetical_answers": answers[:2],
        "hyde_embedding_placeholder": "<to_be_embedded>",
    }


# ═════════════════════════════════════════════════════════════════════════════
#  7. KEYWORD BUILDER — for BM25 sparse retrieval
# ═════════════════════════════════════════════════════════════════════════════

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "but", "in",
    "on", "at", "to", "for", "of", "with", "from", "by", "as", "it", "its",
    "that", "this", "these", "those", "not", "all", "each", "every", "both",
    "has", "have", "had", "been", "be", "will", "can", "may", "very", "just",
    "than", "then", "into", "over", "such", "more", "some", "other", "any",
    "due", "when", "how", "our", "your", "about", "through",
}

def build_keywords(product: Dict, gender: str, product_type: str,
                   frag_meta: Dict) -> List[str]:
    """Build enriched keyword list for BM25 matching."""
    kws = set()

    name = product.get("name", "")
    for word in name.split():
        w = re.sub(r'[^a-zA-Z0-9]', '', word).lower()
        if w and len(w) > 1 and w not in STOPWORDS:
            kws.add(w)

    if gender:
        kws.add(gender.lower())
        if gender == "Men":
            kws.update(["men", "mens", "gents"])
        elif gender == "Women":
            kws.update(["women", "womens", "ladies"])
        elif gender == "Boys":
            kws.update(["boys", "kids", "teen"])
        elif gender == "Girls":
            kws.update(["girls", "kids", "teen"])
        elif gender == "Kids":
            kws.update(["kids", "children", "infant"])

    for word in product_type.lower().split():
        w = re.sub(r'[^a-zA-Z0-9]', '', word)
        if w and len(w) > 1:
            kws.add(w)

    color = product.get("attributes", {}).get("Color", "")
    if color:
        for word in color.lower().split():
            w = re.sub(r'[^a-zA-Z0-9]', '', word)
            if w and len(w) > 1:
                kws.add(w)

    fabric = product.get("attributes", {}).get("Fabric", "")
    if fabric:
        for word in fabric.lower().split():
            w = re.sub(r'[^a-zA-Z0-9]', '', word)
            if w and len(w) > 2 and w not in STOPWORDS:
                kws.add(w)

    season = product.get("attributes", {}).get("Season", "")
    if season:
        for word in season.lower().split():
            w = re.sub(r'[^a-zA-Z0-9]', '', word)
            if w and len(w) > 2 and w not in STOPWORDS:
                kws.add(w)

    if frag_meta.get("fragrance_category"):
        for word in frag_meta["fragrance_category"].lower().replace(",", " ").split():
            w = word.strip()
            if w and len(w) > 2:
                kws.add(w)
    if frag_meta.get("notes_top"):
        for note in frag_meta["notes_top"].split(","):
            n = note.strip().lower()
            if n and len(n) > 2:
                kws.add(n)

    return sorted(kws)


# ═════════════════════════════════════════════════════════════════════════════
#  8. PRODUCT ID GENERATOR
# ═════════════════════════════════════════════════════════════════════════════

def make_product_id(sku: str) -> str:
    return f"prod_{sku}" if sku else f"prod_unknown_{hashlib.md5(str(id).encode()).hexdigest()[:8]}"


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN PIPELINE
# ═════════════════════════════════════════════════════════════════════════════

def process_product(raw: Dict) -> Dict:
    """Process a single raw product into the full hierarchical structure."""

    sku = raw.get("sku", "")
    product_id = make_product_id(sku)
    price_display = raw.get("price", "PKR 0")
    price_numeric, price_bucket = parse_price(price_display)
    gender = extract_gender(raw)
    product_type = classify_product_type(raw)

    is_fragrance = product_type in ("Perfume", "Fragrance", "Body Spray", "Body Mist",
                                     "Attar", "Gift Set", "Bakhoor", "Hair Mist",
                                     "Beard Oil", "Shower Gel")
    frag_meta = parse_fragrance_notes(raw.get("description_text", "")) if is_fragrance else {
        "notes_top": "", "notes_heart": "", "notes_base": "",
        "main_accords": "", "fragrance_category": "", "size": "",
    }

    attrs = raw.get("attributes", {})
    if not frag_meta["fragrance_category"] and attrs.get("Fragrance Category"):
        frag_meta["fragrance_category"] = attrs["Fragrance Category"]
    if not frag_meta["size"] and attrs.get("Size"):
        frag_meta["size"] = attrs["Size"]

    size_str = frag_meta.get("size", "") or attrs.get("Size", "")
    size_ml = 0.0
    m = re.search(r'(\d+(?:\.\d+)?)\s*ml', size_str, re.IGNORECASE)
    if m:
        size_ml = float(m.group(1))

    color = attrs.get("Color", "")
    fabric = attrs.get("Fabric", "")
    season = attrs.get("Season", "")
    wear_type = attrs.get("Wear Type", "")
    fit_type = attrs.get("Fit Type", "")
    sole_type = attrs.get("Sole Type", "")
    upper_type = attrs.get("Upper Type", "")
    raw_product_category = attrs.get("Product Category", "")

    primary_text = build_primary_chunk(raw, gender, product_type, price_display,
                                       price_numeric, frag_meta)
    detailed_text = build_detailed_chunk(raw, gender, product_type, frag_meta)

    hyde = generate_hyde(raw, gender, product_type, price_numeric, frag_meta)

    keywords = build_keywords(raw, gender, product_type, frag_meta)

    notes_parts = [frag_meta.get("notes_top", ""), frag_meta.get("notes_heart", ""),
                   frag_meta.get("notes_base", ""), frag_meta.get("main_accords", "")]
    notes_combined = " | ".join(p for p in notes_parts if p.strip())

    if is_fragrance:
        cat_l1 = "Fragrances"
    elif product_type in ("Lip Makeup", "Eye Makeup", "Face Makeup"):
        cat_l1 = "Makeup"
    elif product_type in ("Skincare", "Shower Gel", "Hair Mist"):
        cat_l1 = "Beauty"
    elif product_type in ("Bangles", "Earrings", "Ring", "Bracelet", "Necklace", "Bag"):
        cat_l1 = "Accessories"
    elif product_type in ("Peshawari Chappal", "Sandals", "Slides"):
        cat_l1 = "Footwear"
    else:
        cat_l1 = "Clothing"

    return {
        "product_id": product_id,
        "product_core": {
            "name": raw.get("name", ""),
            "sku": sku,
            "article_code": raw.get("article_code", ""),
            "price_display": price_display,
            "price_numeric": price_numeric,
            "stock_status": raw.get("stock_status", ""),
            "product_link": raw.get("product_link", ""),
            "category_hierarchy": {
                "level_1": cat_l1,
                "level_2": gender,
                "level_3": product_type,
            },
        },
        "searchable_chunks": [
            {
                "chunk_id": f"{product_id}_primary",
                "chunk_type": "primary_description",
                "content": primary_text,
                "embedding_placeholder": "<to_be_embedded>",
            },
            {
                "chunk_id": f"{product_id}_detailed",
                "chunk_type": "detailed_description",
                "content": detailed_text,
                "embedding_placeholder": "<to_be_embedded>",
            },
        ],
        "fragrance_metadata": frag_meta,
        "notes_combined": notes_combined,
        "hyde_components": hyde,
        "sparse_retrieval": {
            "keywords": keywords,
            "bm25_ready": True,
        },
        "image_data": {
            "local_path": raw.get("image_local_path", ""),
            "online_url": raw.get("image_url_online", ""),
            "clip_embedding_placeholder": "<to_be_embedded>",
            "image_exists": bool(raw.get("image_local_path")),
        },
        "product_attributes": {
            "color": color,
            "fabric": fabric,
            "season": season,
            "wear_type": wear_type,
            "fit_type": fit_type,
            "sole_type": sole_type,
            "upper_type": upper_type,
            "sizes_available": raw.get("sizes", []),
            "raw_product_category": raw_product_category,
        },
        "filter_metadata": {
            "price_range_bucket": price_bucket,
            "in_stock": raw.get("stock_status", "").upper() == "IN STOCK",
            "category_l1": cat_l1,
            "category_l2": gender,
            "product_type": product_type,
            "color": color,
            "fabric": fabric,
            "season": season,
            "has_image": bool(raw.get("image_local_path")),
            "size_ml_numeric": size_ml,
            "size_category": frag_meta.get("size", "") or "N/A",
        },
        "raw_description": raw.get("description_text", ""),
        "category_source": raw.get("category_source", ""),
        "scraped_at": raw.get("scraped_at", ""),
    }


def build_bm25_entry(product: Dict) -> Dict:
    """Build a rich BM25 document from processed product."""
    core = product["product_core"]
    fm = product["fragrance_metadata"]
    filt = product["filter_metadata"]
    chunks = product["searchable_chunks"]
    sparse = product["sparse_retrieval"]
    pa = product["product_attributes"]

    text_parts = [
        core["name"],
        filt["product_type"],
        filt["category_l2"],  
        chunks[0]["content"],
        chunks[1]["content"] if len(chunks) > 1 else "",
        product.get("notes_combined", ""),
        fm.get("fragrance_category", ""),
        pa.get("color", ""),
        pa.get("fabric", ""),
        pa.get("season", ""),
        product.get("raw_description", ""),
    ]
    text = " ".join(p for p in text_parts if p and p.strip() and p.strip() != "N/A")

    return {
        "doc_id": product["product_id"],
        "text": text,
        "keywords": sparse["keywords"],
        "metadata": {
            "name":          core["name"],
            "price":         core["price_numeric"],
            "in_stock":      filt["in_stock"],
            "stock":         filt["in_stock"],
            "category_l1":   filt["category_l1"],
            "category_l2":   filt["category_l2"],
            "product_type":  filt["product_type"],
            "color":         pa.get("color", ""),
            "fabric":        pa.get("fabric", ""),
            "season":        pa.get("season", ""),
            "fragrance_cat": fm.get("fragrance_category", ""),
            "size":          fm.get("size", ""),
            "notes_top":     fm.get("notes_top", ""),
            "notes_heart":   fm.get("notes_heart", ""),
            "notes_base":    fm.get("notes_base", ""),
            "price_bucket":  filt["price_range_bucket"],
        },
    }


def build_attr_indexed_entry(product: Dict) -> Dict:
    """Build attribute-indexed multi-vector format entry."""
    core = product["product_core"]
    fm = product["fragrance_metadata"]
    filt = product["filter_metadata"]
    pa = product["product_attributes"]

    gender = filt["category_l2"]
    pt = filt["product_type"]

    notes_text = " | ".join(
        f"{k}: {v}" for k, v in [
            ("Top", fm.get("notes_top", "")),
            ("Heart", fm.get("notes_heart", "")),
            ("Base", fm.get("notes_base", "")),
        ] if v
    )

    return {
        "product_id": product["product_id"],
        "searchable_facets": {
            "by_name": {
                "text": core["name"],
                "embedding_placeholder": "<vector_by_name>",
            },
            "by_category": {
                "text": f"{gender} {pt}".strip(),
                "embedding_placeholder": "<vector_by_category>",
            },
            "by_price": {
                "text": f"{filt['price_range_bucket'].replace('_', ' to ')} PKR",
                "numeric_filter": core["price_numeric"],
            },
            "by_fragrance_notes": {
                "text": notes_text if notes_text else "N/A",
                "embedding_placeholder": "<vector_by_notes>",
            },
            "by_availability": {
                "text": f"{gender} {pt} in stock" if filt["in_stock"] else f"{gender} {pt} out of stock",
                "filter": {
                    "size": fm.get("size", ""),
                    "stock": filt["in_stock"],
                },
            },
            "by_color": {
                "text": pa.get("color", "N/A"),
            },
            "by_fabric": {
                "text": pa.get("fabric", "N/A"),
            },
        },
        "image_embedding_placeholder": "<CLIP_vector>",
        "local_image": product["image_data"]["local_path"],
        "metadata": {
            "price": core["price_numeric"],
            "stock": filt["in_stock"],
            "category": f"{filt['category_l1']}_{gender}",
            "product_type": pt,
            "color": pa.get("color", ""),
            "fabric": pa.get("fabric", ""),
        },
    }


def build_image_registry_entry(product: Dict) -> Optional[Dict]:
    """Build image registry entry for CLIP embedding."""
    img = product["image_data"]
    if not img.get("image_exists"):
        return None

    core = product["product_core"]
    filt = product["filter_metadata"]

    return {
        "product_id": product["product_id"],
        "product_name": core["name"],
        "image_path": img["local_path"],
        "image_url": img["online_url"],
        "caption_generated": f"{core['name']} — {filt['product_type']} for {filt['category_l2']}",
        "category": filt["product_type"],
        "gender": filt["category_l2"],
        "clip_embedding_status": "pending",
    }


# ═════════════════════════════════════════════════════════════════════════════
#  CSV EXPORT
# ═════════════════════════════════════════════════════════════════════════════

CSV_FIELDS = [
    "product_id", "name", "sku", "article_code",
    "price_display", "price_numeric", "stock_status",
    "category_l1", "category_l2", "product_type",
    "color", "fabric", "season", "wear_type", "fit_type",
    "sizes_available",
    "fragrance_category", "notes_top", "notes_heart", "notes_base",
    "main_accords", "size_ml",
    "primary_text", "detailed_text", "raw_description",
    "keywords", "image_local_path", "price_bucket",
    "in_stock", "product_link",
]

def product_to_csv_row(product: Dict) -> Dict:
    core = product["product_core"]
    fm = product["fragrance_metadata"]
    filt = product["filter_metadata"]
    img = product["image_data"]
    pa = product["product_attributes"]
    chunks = product["searchable_chunks"]
    sparse = product["sparse_retrieval"]

    return {
        "product_id":       product["product_id"],
        "name":             core["name"],
        "sku":              core["sku"],
        "article_code":     core["article_code"],
        "price_display":    core["price_display"],
        "price_numeric":    core["price_numeric"],
        "stock_status":     core["stock_status"],
        "category_l1":      filt["category_l1"],
        "category_l2":      filt["category_l2"],
        "product_type":     filt["product_type"],
        "color":            pa.get("color", ""),
        "fabric":           pa.get("fabric", ""),
        "season":           pa.get("season", ""),
        "wear_type":        pa.get("wear_type", ""),
        "fit_type":         pa.get("fit_type", ""),
        "sizes_available":  "|".join(pa.get("sizes_available", [])),
        "fragrance_category": fm.get("fragrance_category", ""),
        "notes_top":        fm.get("notes_top", ""),
        "notes_heart":      fm.get("notes_heart", ""),
        "notes_base":       fm.get("notes_base", ""),
        "main_accords":     fm.get("main_accords", ""),
        "size_ml":          filt.get("size_ml_numeric", 0),
        "primary_text":     chunks[0]["content"] if chunks else "",
        "detailed_text":    chunks[1]["content"] if len(chunks) > 1 else "",
        "raw_description":  product.get("raw_description", ""),
        "keywords":         "|".join(sparse.get("keywords", [])),
        "image_local_path": img.get("local_path", ""),
        "price_bucket":     filt["price_range_bucket"],
        "in_stock":         filt["in_stock"],
        "product_link":     core["product_link"],
    }


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  J. E-COMMERCE MULTIMODAL RAG — MASTER PREPROCESSING PIPELINE")
    print("=" * 70)

    print(f"\nLoading: {INPUT_FILE}")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_products = json.load(f)
    print(f"✓ Loaded {len(raw_products)} raw products")

    stats = {
        "total": len(raw_products),
        "gender": Counter(),
        "product_type": Counter(),
        "category_l1": Counter(),
        "with_fragrance_notes": 0,
        "with_detailed_chunk": 0,
        "with_image": 0,
        "with_color": 0,
        "with_fabric": 0,
    }

    hierarchical = []
    bm25_corpus = []
    attr_indexed = []
    image_registry = []

    print(f"\nProcessing {len(raw_products)} products...")

    for i, raw in enumerate(raw_products):
        product = process_product(raw)
        hierarchical.append(product)

        bm25_corpus.append(build_bm25_entry(product))
        attr_indexed.append(build_attr_indexed_entry(product))

        img_entry = build_image_registry_entry(product)
        if img_entry:
            image_registry.append(img_entry)

        filt = product["filter_metadata"]
        stats["gender"][filt["category_l2"]] += 1
        stats["product_type"][filt["product_type"]] += 1
        stats["category_l1"][filt["category_l1"]] += 1
        if product["fragrance_metadata"].get("notes_top"):
            stats["with_fragrance_notes"] += 1
        if product["searchable_chunks"][1]["content"].strip():
            stats["with_detailed_chunk"] += 1
        if filt["has_image"]:
            stats["with_image"] += 1
        if filt.get("color"):
            stats["with_color"] += 1
        if filt.get("fabric"):
            stats["with_fabric"] += 1

        if (i + 1) % 500 == 0:
            print(f"   Processed {i + 1}/{len(raw_products)}...")

    print(f"✓ Processing complete")

    out_hier = OUTPUT_DIR / "products_hierarchical.json"
    out_bm25 = OUTPUT_DIR / "bm25_corpus.json"
    out_attr = OUTPUT_DIR / "products_attribute_indexed.json"
    out_img  = OUTPUT_DIR / "image_registry.json"
    out_csv  = OUTPUT_DIR / "products_flat.csv"

    print(f"\nSaving outputs to {OUTPUT_DIR}/")

    with open(out_hier, "w", encoding="utf-8") as f:
        json.dump(hierarchical, f, indent=2, ensure_ascii=False)
    print(f"   ✓ {out_hier.name}: {len(hierarchical)} products")

    with open(out_bm25, "w", encoding="utf-8") as f:
        json.dump(bm25_corpus, f, indent=2, ensure_ascii=False)
    print(f"   ✓ {out_bm25.name}: {len(bm25_corpus)} documents")

    with open(out_attr, "w", encoding="utf-8") as f:
        json.dump(attr_indexed, f, indent=2, ensure_ascii=False)
    print(f"   ✓ {out_attr.name}: {len(attr_indexed)} entries")

    with open(out_img, "w", encoding="utf-8") as f:
        json.dump(image_registry, f, indent=2, ensure_ascii=False)
    print(f"   ✓ {out_img.name}: {len(image_registry)} images")

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for product in hierarchical:
            writer.writerow(product_to_csv_row(product))
    print(f"   ✓ {out_csv.name}: {len(hierarchical)} rows")

    print("\n" + "=" * 70)
    print("  PIPELINE STATISTICS")
    print("=" * 70)

    print(f"\nGender Distribution:")
    for g, c in stats["gender"].most_common():
        bar = "█" * int(c / len(raw_products) * 40)
        print(f"   {g:10s}: {c:4d} ({c/len(raw_products)*100:5.1f}%) {bar}")

    print(f"\n Top Product Types:")
    for pt, c in stats["product_type"].most_common(20):
        print(f"   {pt:25s}: {c:4d}")

    print(f"\nCategory L1 (top-level):")
    for cat, c in stats["category_l1"].most_common():
        print(f"   {cat:15s}: {c:4d}")

    print(f"\nData Coverage:")
    print(f"   With detailed chunk:    {stats['with_detailed_chunk']:4d}/{stats['total']} ({stats['with_detailed_chunk']/stats['total']*100:.1f}%)")
    print(f"   With fragrance notes:   {stats['with_fragrance_notes']:4d}/{stats['total']} ({stats['with_fragrance_notes']/stats['total']*100:.1f}%)")
    print(f"   With images:            {stats['with_image']:4d}/{stats['total']} ({stats['with_image']/stats['total']*100:.1f}%)")
    print(f"   With color:             {stats['with_color']:4d}/{stats['total']} ({stats['with_color']/stats['total']*100:.1f}%)")
    print(f"   With fabric:            {stats['with_fabric']:4d}/{stats['total']} ({stats['with_fabric']/stats['total']*100:.1f}%)")

    print(f"\nOutput Files:")
    for f in [out_hier, out_bm25, out_attr, out_img, out_csv]:
        size = f.stat().st_size / (1024 * 1024)
        print(f"   {f.name:45s} {size:6.1f} MB")

    print(f"\nMaster preprocessing complete!")
    print(f"   Next: Update config.py to point to enriched_data/, then run Phase 1 (embed)")


if __name__ == "__main__":
    main()
