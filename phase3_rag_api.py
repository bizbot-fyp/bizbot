#!/usr/bin/env python3
"""
Phase 3 v3.1: RAG Retrieval API — WhatsApp Chatbot Edition
=========================================================
New in v3.1:
  1. ROBUST TYPO HANDLING: Query contextualizer explicitly corrects spelling 
     mistakes before translating and querying.
  2. STRICT LANGUAGE MATCHING: System detects original language and forces the
     generation prompt to reply strictly in that same language.
  3. FIX: "Women dresses" no longer returns Top/jersey dresses — Stitched Suit,
          Co-ord Set, Kurti, Kameez Shalwar are boosted for clothing queries
  4. FIX: Kids gender filter is now a hard filter (no fallback leakage)
  5. NEW: Session memory — per-user conversation history (last 15 turns)
"""

import os, sys, json, re, time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict, deque
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
import cohere
from openai import OpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import weaviate
from weaviate.classes.query import MetadataQuery, Filter

# ── rank_bm25 ────────────────────────────────────────────────────────────────
try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    print("⚠️  rank_bm25 not installed — BM25 disabled. Run: pip install rank-bm25")

load_dotenv()

# ── Clients ──────────────────────────────────────────────────────────────────
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
co_client     = cohere.Client(os.getenv("COHERE_API_KEY"))
weaviate_client: Optional[weaviate.WeaviateClient] = None

# ── BM25 state ───────────────────────────────────────────────────────────────
bm25_index:    Optional["BM25Okapi"] = None
bm25_corpus:   List[Dict]             = []

MODEL = "text-embedding-3-large"
DIMS  = 3072

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
try:
    from config import BM25_CORPUS_PATH, BM25_FALLBACK_PATH
except ImportError:
    BM25_CORPUS_PATH   = BASE_DIR / "enriched_data" / "bm25_corpus.json"
    BM25_FALLBACK_PATH = BASE_DIR / "enriched_data" / "bm25_corpus.json"

# ── Human handoff config ─────────────────────────────────────────────────────
SALES_PHONE    = os.getenv("SALES_PHONE", "+92-XXX-XXXXXXX")
SALES_NAME     = os.getenv("SALES_NAME",  "our sales representative")

# ── Session memory ────────────────────────────────────────────────────────────
# In-process store: { session_id -> deque of {"role": str, "content": str} }

MAX_HISTORY    = 15   # messages per session (user + assistant combined)
session_store: Dict[str, deque] = {}

def get_session_history(session_id: str) -> List[Dict]:
    if session_id not in session_store:
        session_store[session_id] = deque(maxlen=MAX_HISTORY)
    return list(session_store[session_id])

def append_to_session(session_id: str, role: str, content: str):
    if session_id not in session_store:
        session_store[session_id] = deque(maxlen=MAX_HISTORY)
    session_store[session_id].append({"role": role, "content": content})

def clear_session(session_id: str):
    session_store.pop(session_id, None)

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="J. RAG WhatsApp API v3.1",
    description="Production RAG: BM25 + Multi-vector Hybrid + Cohere Rerank — Typo-resilient Chatbot edition",
    version="3.1.0",
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

images_dir = Path(__file__).parent / "images"
images_dir.mkdir(exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# ── Pydantic ──────────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages:   List[Message]
    limit:      int    = Field(default=5, ge=1, le=50)

class WhatsAppRequest(BaseModel):
    """
    Simplified request for n8n / WhatsApp webhook.
    session_id  — unique per WhatsApp number, e.g. "923001234567"
    message     — the latest user message text
    limit       — max products to retrieve (default 5)
    """
    session_id: str
    message:    str
    limit:      int = Field(default=5, ge=1, le=20)

class WhatsAppResponse(BaseModel):
    session_id:     str
    reply:          str          
    products:       List[Dict]   
    query_understood: str
    detected_language: str
    filters_applied:  Dict[str, Any]
    execution_time_ms: float

class ProductOut(BaseModel):
    product_id:    str
    name:          str
    price:         Dict[str, Any]
    category:      Dict[str, str]
    fragrance:     Dict[str, str]
    stock:         Dict[str, Any]
    size:          str
    color:         str
    fabric:        str
    season:        str
    description:   Dict[str, str]
    image_path:    Optional[str]
    image_url:     Optional[str]
    product_link:  Optional[str]
    relevance:     Dict[str, Any]

class ChatResponse(BaseModel):
    query:                   str
    detected_language:       str
    filters_applied:         Dict[str, Any]
    conversational_response: str
    products:                List[ProductOut]
    total_results:           int
    retrieval_strategy:      str
    execution_time_ms:       float

# ── Startup / Shutdown ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global weaviate_client, bm25_index, bm25_corpus

    weaviate_client = weaviate.connect_to_local(
        host="localhost", port=8081,
        headers={"X-OpenAI-Api-Key": os.getenv("OPENAI_API_KEY", "")}
    )
    if not weaviate_client.is_ready():
        raise RuntimeError("Weaviate not ready")
    print("✓ Weaviate connected")

    bm25_path = BM25_CORPUS_PATH
    if not bm25_path.exists():
        bm25_path = BM25_FALLBACK_PATH

    if bm25_path.exists() and BM25_AVAILABLE:
        with open(bm25_path, "r", encoding="utf-8") as f:
            bm25_corpus = json.load(f)
        tokenized = []
        for doc in bm25_corpus:
            tokens = doc["text"].lower().split()
            tokens += [k.lower() for k in doc.get("keywords", [])]
            tokenized.append(tokens)
        bm25_index = BM25Okapi(tokenized)
        print(f"✓ BM25 index built: {len(bm25_corpus)} documents")
    else:
        print("⚠️  BM25 disabled")

@app.on_event("shutdown")
async def shutdown():
    if weaviate_client:
        weaviate_client.close()

# ── Embedding ─────────────────────────────────────────────────────────────────
def get_query_embedding(text: str) -> List[float]:
    resp = openai_client.embeddings.create(
        model=MODEL, input=text, encoding_format="float"
    )
    return resp.data[0].embedding

# ── Query contextualization (Handles multi-turn, TYPOS, and Language Detection) 
def contextualize_query(messages: List[Dict], session_history: List[Dict]) -> Dict[str, str]:
    """
    1. Detects the language of the original user query.
    2. Identifies and FIXES any typos or spelling mistakes.
    3. Merges persistent session history + current messages into a single self-contained query string.
    4. TRANSLATES the corrected query into English for optimal retrieval.
    """
    all_history = session_history + [{"role": m["role"], "content": m["content"]}
                                      for m in messages[:-1]]
    last_query  = messages[-1]["content"] if messages else ""

    if not all_history:
        history_text = "No prior history."
    else:
        history_text = "\n".join(
            f"{m['role'].capitalize()}: {m['content']}" for m in all_history[-10:]
        )
        
    system_prompt = """
    You are an expert Query Processor and Spell Checker for an e-commerce store.
    Your task is to analyze the latest user query using the conversation history.

    CRITICAL INSTRUCTIONS:
    1. Detect the original language of the query (e.g., 'English', 'Urdu', 'Roman Urdu').
    2. Identify and explicitly FIX any typos, misspellings, or bad grammar in the user's query 
       (e.g., 'kurtta' -> 'kurta', 'parfum' -> 'perfume', 'clothez' -> 'clothes', 'red clour' -> 'red color').
    3. Resolve all pronouns and context from the history.
    4. Translate the CORRECTED query into a clean, self-contained English search string.

    You MUST output valid JSON only:
    {
        "detected_language": "The exact language you detected (e.g., English, Roman Urdu, Urdu)",
        "corrected_english_query": "The fully corrected, typo-free, translated English query"
    }
    """

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Conversation history:\n{history_text}\n\nLatest query: {last_query}"}
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content.strip())
        return {
            "corrected_english_query": data.get("corrected_english_query", last_query),
            "detected_language": data.get("detected_language", "English")
        }
    except Exception as e:
        print(f"⚠️ Query contextualization failed: {e}")
        return {"corrected_english_query": last_query, "detected_language": "English"}

# ── Purchase / payment intent detection ──────────────────────────────────────
PURCHASE_PATTERNS = re.compile(
    r"\b(buy|purchase|order|checkout|pay|payment|how (do|can) I (buy|order|get)|"
    r"place.?(an?).?order|add to cart|want to (buy|order|get)|kharidna|order karna|"
    r"khareedna|kharid|lena hai|lena|de do|chahiye|send (kar|karo|kijiye)|"
    r"price confirm|final (price|karo|kr do)|kitna (lagega|hai price))\b",
    re.IGNORECASE
)

def detect_purchase_intent(text: str) -> bool:
    return bool(PURCHASE_PATTERNS.search(text))

# ── Smart filter extraction ────────────────────────────────────────────────────
FILTER_SYSTEM_PROMPT = """
You are a filter extractor for J. (Junaid Jamshed) e-commerce store in Pakistan.
You must explicitly handle TYPOS and MISSPELLINGS in the user's input. Always map 
misspelled variants to the exact correct values listed below.

The store sells:
  CLOTHING: Kameez Shalwar, Kurta, Kurti, Unstitched Suit, Stitched Suit,
            Co-ord Set, Shirt & Dupatta, Trousers, Shalwar, Jubba, Top, Jacket,
            Waistcoat, Frock, Dupatta, Stole, Saree, Underwear, Streetwear,
            Unstitched Fabric, Shirt
  FRAGRANCES: Perfume, Body Spray, Body Mist, Attar, Gift Set, Bakhoor
  FOOTWEAR: Peshawari Chappal, Sandals, Slides
  ACCESSORIES: Bangles, Earrings, Ring, Bracelet, Necklace, Bag
  MAKEUP: Lip Makeup, Eye Makeup, Face Makeup
  BEAUTY: Skincare, Shower Gel, Hair Mist

GENDERS: Men, Women, Boys, Girls, Kids, Unisex
CATEGORIES (L1): Clothing, Fragrances, Footwear, Accessories, Makeup, Beauty

Extract filters from the user query. Return ONLY valid JSON:

{
  "gender":           "Men" | "Women" | "Boys" | "Girls" | "Kids" | "Unisex" | null,
  "product_type":     one of the product types listed above | null,
  "category_l1":      "Clothing" | "Fragrances" | "Footwear" | "Accessories" | "Makeup" | "Beauty" | null,
  "max_price":        number | null,
  "min_price":        number | null,
  "color":            string | null,
  "fabric":           string | null,
  "season":           string | null,
  "fragrance_types":  ["Floral","Woody","Oriental","Fruity","Musky","Fresh","Gourmand","Citrus","Powdery","Vanilla","Aquatic","Spicy","Fougere","Amber","Leathery"] — up to 3 | null,
  "notes_include":    ["rose","oud","vanilla","sandalwood","jasmine","musk",...] | null,
  "size_ml":          number | null,
  "in_stock_only":    true | false,
  "sort_by":          "price_asc" | "price_desc" | "relevance" | null
}

GENDER RULES (apply ALL of these, Urdu/Roman Urdu included):
- English men: "men"/"man"/"male"/"gents"/"him"/"his"/"he"/"mard" → gender="Men"
- Urdu men: "mardon"/"mardo"/"mard k"/"sahib"/"sahab"/"mardana" → gender="Men"
- English women: "women"/"woman"/"female"/"ladies"/"lady"/"her"/"she" → gender="Women"
- Urdu women: "aurat"/"aurton"/"khawateen"/"bibi"/"begum"/"zanana" → gender="Women"
- "boys"/"larka"/"larkon"/"beta"/"beton" → gender="Boys"
- "girls"/"larki"/"larkiyon"/"beti"/"betiyon" → gender="Girls"
- "kids"/"children"/"infant"/"baby"/"bacha"/"bachon"/"bachay" → gender="Kids"

PRODUCT TYPE RULES (Handle Typos Here!):
- "dress"/"dresses" with gender=Men → product_type="Kameez Shalwar"
- "dress"/"dresses"/"suit"/"suits" with gender=Women → product_type="Stitched Suit" (NOT Top)
- "dress"/"dresses" with gender=Girls → product_type="Frock"
- "kurta"/"kurtta"/"krta" with gender=Men/Boys → product_type="Kurta"
- "kurta"/"kurti"/"kurtty"/"kurtee" with gender=Women/Girls → product_type="Kurti"
- "suit"/"suits" with gender=Men → product_type="Kameez Shalwar"
- "clothes"/"clothing"/"outfit"/"wear"/"kapray"/"libas"/"clothez" with gender=Men → product_type="Kameez Shalwar"
- "clothes"/"clothing"/"outfit"/"wear"/"kapray"/"libas" with gender=Women → product_type="Stitched Suit"
- "clothes" alone (no gender) → category_l1="Clothing", product_type=null
- "lawn"/"unstitched"/"unstitch" → product_type="Unstitched Suit", category_l1="Clothing"
- "kameez shalwar"/"shalwar kameez"/"shalwar qameez"/"kamiz" → product_type="Kameez Shalwar"
- "perfume"/"fragrance"/"scent"/"khushbu"/"attar"/"itr"/"parfum"/"perfum" → product_type="Perfume", category_l1="Fragrances"
- "sandals"/"chappal"/"peshawari"/"joota"/"shoes" → category_l1="Footwear"

OTHER RULES:
- "cheap"/"budget"/"affordable"/"sasta"/"kam daam" → sort_by="price_asc"
- "premium"/"luxury"/"expensive"/"mehnga" → sort_by="price_desc"
- "in stock"/"available"/"mojood"/"milay ga" → in_stock_only=true
- Extract color (fix typos): "blak" -> "Black", "kala" → "Black", "safaid" → "White", "red clour" -> "Red"
- Extract fabric (fix typos): "coton" -> "Cotton", "lawn"/"silk"/"linen"/"khaddar"/"chiffon" → fabric=...
- Extract price: "under 5000"/"5000 se kam"/"5000 tak" → max_price=5000
- Urdu price: "5 hazar"→5000, "das hazar"→10000, "paanch sou"→500, "saat hazar"→7000, "aath hazar"→8000
"""

def extract_smart_filters(query: str) -> Dict[str, Any]:
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": FILTER_SYSTEM_PROMPT},
                {"role": "user",   "content": query},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        print(f"⚠️  Filter extraction failed: {e}")
        return {}

# ── Post-extraction safety overrides ─────────────────────────────────────────
def apply_product_type_fixes(filters: Dict, raw_query: str) -> Dict:
    """
    Rule-based safety net applied AFTER LLM filter extraction.
    Catches cases where the LLM mis-classifies product_type or gender.
    raw_query is the lowercased user query.
    """
    q = raw_query.lower()
    gender  = filters.get("gender")
    pt      = filters.get("product_type")
    cat     = filters.get("category_l1")

    # ── Men "dress" / "suit" / "clothes" → Kameez Shalwar ────────────────
    if gender == "Men" and pt in (None, "Top", "Stitched Suit", "Trousers"):
        if any(w in q for w in ["dress", "suit", "clothes", "clothing",
                                 "kapray", "libas", "outfit", "wear", "clothez"]):
            filters["product_type"] = "Kameez Shalwar"
            filters["category_l1"]  = "Clothing"

    # ── Women "dress" / "suit" / "clothes" → Stitched Suit (not Top) ─────
    if gender == "Women" and pt in (None, "Top", "Trousers"):
        if any(w in q for w in ["dress", "suit", "clothes", "clothing",
                                 "kapray", "libas", "outfit", "wear", "clothez"]):
            filters["product_type"] = "Stitched Suit"
            filters["category_l1"]  = "Clothing"

    # ── If gender is set but no category, set Clothing as default ─────────
    if gender in ("Men", "Women", "Boys", "Girls") and cat is None and pt is not None:
        filters["category_l1"] = "Clothing"

    # ── "kapray" alone (no gender, no type) → just Clothing category ──────
    if any(w in q for w in ["kapray", "libas", "clothes", "clothing", "clothez"]) and pt is None:
        filters["category_l1"] = "Clothing"

    return filters

# ── FIX 2: Kids gender must be a hard filter (no fallback) ──────────────────
def should_allow_gender_fallback(filters: Dict) -> bool:
    """
    For Kids gender queries we never fall back to other genders.
    For other genders, fallback is acceptable if results are too few.
    """
    return filters.get("gender") != "Kids"

# ── Adaptive alpha ────────────────────────────────────────────────────────────
def compute_alpha(query: str, filters: Dict) -> float:
    q_upper_ratio = sum(1 for c in query if c.isupper()) / max(len(query), 1)
    has_notes     = bool(filters.get("notes_include"))
    has_frag_type = bool(filters.get("fragrance_types"))
    has_color     = bool(filters.get("color"))
    has_type      = bool(filters.get("product_type"))
    word_count    = len(query.split())

    if q_upper_ratio > 0.5 and word_count <= 4:
        return 0.15
    if has_notes:
        return 0.75
    if has_frag_type:
        return 0.70
    if has_type and has_color:
        return 0.40
    if has_type:
        return 0.50
    return 0.60

# ── Build Weaviate filter chain ────────────────────────────────────────────────
def build_weaviate_filter(filters: Dict) -> Optional[Any]:
    conditions = []

    if filters.get("gender"):
        conditions.append(Filter.by_property("category_l2").equal(filters["gender"]))
    if filters.get("product_type"):
        conditions.append(Filter.by_property("product_type").equal(filters["product_type"]))
    if filters.get("category_l1"):
        conditions.append(Filter.by_property("category_l1").equal(filters["category_l1"]))
    if filters.get("max_price") is not None:
        conditions.append(Filter.by_property("price_numeric").less_or_equal(float(filters["max_price"])))
    if filters.get("min_price") is not None:
        conditions.append(Filter.by_property("price_numeric").greater_or_equal(float(filters["min_price"])))
    if filters.get("in_stock_only"):
        conditions.append(Filter.by_property("in_stock").equal(True))
    if filters.get("color"):
        conditions.append(Filter.by_property("color").like(f"*{filters['color']}*"))
    if filters.get("fabric"):
        conditions.append(Filter.by_property("fabric").like(f"*{filters['fabric']}*"))
    if filters.get("size_ml") and filters["size_ml"] > 0:
        target = float(filters["size_ml"])
        conditions.append(Filter.by_property("size_ml_numeric").greater_or_equal(target * 0.8))
        conditions.append(Filter.by_property("size_ml_numeric").less_or_equal(target * 1.2))

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    combined = conditions[0]
    for c in conditions[1:]:
        combined = combined & c
    return combined

# ── Enrich query ──────────────────────────────────────────────────────────────
def enrich_query(query: str, filters: Dict) -> str:
    additions = []
    if filters.get("fragrance_types"):
        additions.append(", ".join(filters["fragrance_types"]) + " fragrance")
    if filters.get("notes_include"):
        additions.append("notes: " + ", ".join(filters["notes_include"]))
    if filters.get("gender"):
        additions.append(f"for {filters['gender']}")
    if filters.get("product_type"):
        additions.append(filters["product_type"])
    if filters.get("color"):
        additions.append(filters["color"])
    if filters.get("fabric"):
        additions.append(filters["fabric"])
    if not additions:
        return query
    return query + " | " + " | ".join(additions)

# ── BM25 retrieval ────────────────────────────────────────────────────────────
def bm25_search(query: str, filters: Dict, top_k: int = 40) -> List[Tuple[str, float]]:
    if bm25_index is None or not bm25_corpus:
        return []

    tokens = query.lower().split()
    scores = bm25_index.get_scores(tokens)

    results = []
    for i, score in enumerate(scores):
        if score <= 0:
            continue
        doc  = bm25_corpus[i]
        meta = doc.get("metadata", {})

        if filters.get("gender"):
            if meta.get("category_l2", "") != filters["gender"]:
                continue
        if filters.get("product_type"):
            if meta.get("product_type", "") != filters["product_type"]:
                continue
        if filters.get("category_l1"):
            if meta.get("category_l1", "") != filters["category_l1"]:
                continue
        if filters.get("max_price") is not None:
            if meta.get("price", 0) > filters["max_price"]:
                continue
        if filters.get("min_price") is not None:
            if meta.get("price", 0) < filters["min_price"]:
                continue
        if filters.get("in_stock_only"):
            if not meta.get("in_stock", False):
                continue
        if filters.get("color"):
            if filters["color"].lower() not in meta.get("color", "").lower():
                continue
        if filters.get("fabric"):
            if filters["fabric"].lower() not in meta.get("fabric", "").lower():
                continue

        results.append((doc["doc_id"], float(score)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results[:top_k]

# ── RRF fusion ────────────────────────────────────────────────────────────────
def reciprocal_rank_fusion(
    bm25_results: List[Tuple[str, float]],
    weaviate_ids:  List[str],
    k:             int = 60,
) -> List[str]:
    scores: Dict[str, float] = defaultdict(float)
    for rank, (doc_id, _) in enumerate(bm25_results):
        scores[doc_id] += 1.0 / (k + rank + 1)
    for rank, doc_id in enumerate(weaviate_ids):
        scores[doc_id] += 1.0 / (k + rank + 1)
    return sorted(scores, key=lambda x: scores[x], reverse=True)

# ── Vector retrieval ──────────────────────────────────────────────────────────
RETURN_PROPS = [
    "product_id", "name",
    "price_numeric", "price_display", "price_bucket",
    "category_l1", "category_l2", "product_type",
    "fragrance_category",
    "notes_top", "notes_heart", "notes_base", "main_accords",
    "stock_status", "in_stock",
    "size", "size_ml_numeric",
    "color", "fabric", "season",
    "primary_text", "detailed_text", "notes_combined",
    "image_path", "image_url", "product_link",
]

def vector_search(
    query_vec: List[float],
    query_str: str,
    wv_filter: Optional[Any],
    alpha:     float,
    limit:     int = 30,
) -> List[Dict]:
    collection = weaviate_client.collections.get("Product")
    results    = []

    for target_vec in ["primary_text", "hyde_query"]:
        try:
            resp = collection.query.hybrid(
                query=query_str,
                vector=query_vec,
                limit=limit,
                alpha=alpha,
                filters=wv_filter,
                target_vector=target_vec,
                return_metadata=MetadataQuery(score=True),
                return_properties=RETURN_PROPS,
            )
            for obj in resp.objects:
                obj.properties["_wv_score"] = getattr(obj.metadata, "score", 0.0)
                obj.properties["_vec_target"] = target_vec
                results.append(obj.properties)
        except Exception as e:
            print(f"⚠️  Vector search ({target_vec}) error: {e}")

    seen = {}
    for p in results:
        pid = p.get("product_id", "")
        if pid not in seen or p["_wv_score"] > seen[pid]["_wv_score"]:
            seen[pid] = p
    unique = list(seen.values())
    unique.sort(key=lambda x: x["_wv_score"], reverse=True)
    return unique[:limit]

# ── Build ProductOut ──────────────────────────────────────────────────────────
def to_product_out(props: Dict, score: float, source: str) -> ProductOut:
    return ProductOut(
        product_id   = props.get("product_id", ""),
        name         = props.get("name", ""),
        price        = {
            "numeric": props.get("price_numeric", 0),
            "display": props.get("price_display", "PKR 0"),
            "bucket":  props.get("price_bucket", ""),
        },
        category     = {
            "l1":           props.get("category_l1", ""),
            "l2":           props.get("category_l2", ""),
            "product_type": props.get("product_type", ""),
        },
        fragrance    = {
            "category":    props.get("fragrance_category", ""),
            "notes_top":   props.get("notes_top", ""),
            "notes_heart": props.get("notes_heart", ""),
            "notes_base":  props.get("notes_base", ""),
            "accords":     props.get("main_accords", ""),
        },
        stock        = {
            "status":    props.get("stock_status", ""),
            "available": props.get("in_stock", False),
        },
        size         = props.get("size", ""),
        color        = props.get("color", ""),
        fabric       = props.get("fabric", ""),
        season       = props.get("season", ""),
        description  = {
            "primary":  props.get("primary_text", ""),
            "detailed": props.get("detailed_text", ""),
            "notes":    props.get("notes_combined", ""),
        },
        image_path   = props.get("image_path"),
        image_url    = props.get("image_url"),
        product_link = props.get("product_link"),
        relevance    = {"score": round(score, 4), "source": source},
    )

# ── Master retrieve-and-rerank ────────────────────────────────────────────────
def retrieve_and_rerank(
    query: str,
    limit: int = 5,
) -> Tuple[List[ProductOut], float, Dict, str]:
    start   = time.time()
    filters = extract_smart_filters(query)

    # ── Safety overrides: Men dress→Kameez Shalwar, Women clothes→Stitched Suit, etc.
    filters = apply_product_type_fixes(filters, query)
    print(f"🎯 Filters: {filters}")

    alpha      = compute_alpha(query, filters)
    wv_filter  = build_weaviate_filter(filters)
    rich_query = enrich_query(query, filters)
    print(f"   alpha={alpha} | enriched_query='{rich_query[:100]}'")

    bm25_ids = bm25_search(query, filters, top_k=40)
    print(f"   BM25 hits: {len(bm25_ids)}")

    query_vec = get_query_embedding(rich_query)
    vec_props = vector_search(query_vec, rich_query, wv_filter, alpha, limit=30)

    # ── FIX 2: Kids gender never falls back ──────────────────────────────
    strategy = "hybrid_filtered"
    if len(vec_props) < 3 and wv_filter is not None:
        if should_allow_gender_fallback(filters):
            print("   ⚠️  Too few results — retrying without filter")
            vec_props = vector_search(query_vec, rich_query, None, alpha, limit=30)
            strategy  = "hybrid_unfiltered_fallback"
        else:
            print("   ℹ️  Kids gender hard filter — no fallback")

    vec_ids    = [p["product_id"] for p in vec_props]
    print(f"   Vector hits: {len(vec_props)}")

    merged_ids = reciprocal_rank_fusion(bm25_ids, vec_ids)
    print(f"   After RRF: {len(merged_ids)} unique candidates")

    prop_map: Dict[str, Dict] = {p["product_id"]: p for p in vec_props}
    candidate_props = [prop_map[pid] for pid in merged_ids if pid in prop_map]
    candidate_props = candidate_props[:min(25, len(candidate_props))]

    if not candidate_props:
        return [], (time.time() - start) * 1000, filters, strategy

    docs_for_rerank = []
    for p in candidate_props:
        doc = (
            f"Product: {p.get('name', '')} | "
            f"Gender: {p.get('category_l2', '')} | "
            f"Type: {p.get('product_type', '')} | "
            f"Fragrance: {p.get('fragrance_category', '')} | "
            f"Color: {p.get('color', '')} | "
            f"Fabric: {p.get('fabric', '')} | "
            f"Price: PKR {p.get('price_numeric', '')} | "
            f"Size: {p.get('size', '')} | "
            f"Notes: {p.get('notes_combined', '')} | "
            f"Description: {p.get('primary_text', '')[:150]}"
        )
        docs_for_rerank.append(doc)

    final_products = []
    try:
        rerank_resp = co_client.rerank(
            model="rerank-english-v3.0",
            query=query,
            documents=docs_for_rerank,
            top_n=limit,
        )
        strategy += "+cohere_rerank"
        for r in rerank_resp.results:
            props = candidate_props[r.index]
            final_products.append(to_product_out(props, r.relevance_score, strategy))
    except Exception as e:
        print(f"⚠️  Reranking failed: {e}")
        for p in candidate_props[:limit]:
            final_products.append(to_product_out(p, p.get("_wv_score", 0.0), strategy + "+raw_score"))

    sort = filters.get("sort_by")
    if sort == "price_asc":
        final_products.sort(key=lambda x: x.price["numeric"])
    elif sort == "price_desc":
        final_products.sort(key=lambda x: x.price["numeric"], reverse=True)

    elapsed = (time.time() - start) * 1000
    return final_products, elapsed, filters, strategy

# ── System prompt (persona + rules) ──────────────────────────────────────────
def build_system_prompt(session_history: List[Dict], detected_language: str) -> str:
    return f"""You are Sara, a friendly and knowledgeable customer service representative for J. (Junaid Jamshed) — Pakistan's leading fashion and fragrance brand.

YOUR PERSONA:
- Warm, patient, polite, and professional at all times
- Speak like a real person, not a robot — use natural conversational language
- Never sound rude, frustrated, or dismissive, even if the user is difficult
- Address the customer respectfully (use "آپ" in Urdu contexts)

LANGUAGE RULE (STRICT):
- The original detected language of the user's message is: {detected_language}
- You MUST respond ENTIRELY in {detected_language}.
- If the detected language is English, reply strictly in English.
- If the detected language is Urdu or Roman Urdu, reply strictly in that same exact language.
- Never switch language mid-response unless the customer deliberately mixes them.

STRICT ANTI-HALLUCINATION RULES — THIS IS CRITICAL:
- You can ONLY mention products that appear in the "Retrieved products" list
- If the retrieved list has products, you MUST present them — NEVER say "no results"
  or "unavailable" when products ARE in the list
- If the product list is EMPTY (0 products), then say the item is out of stock
- NEVER invent product names, prices, colors, or any details not in the list
- In Pakistan, "men's dress" means Kameez Shalwar — if you see Kameez Shalwar
  in the retrieved list for a men's dress query, present it confidently as a result
- If you are unsure, say so honestly — customers trust us

PURCHASE / PAYMENT INTENT:
- If the customer wants to buy, place an order, make a payment, or asks how to purchase,
  DO NOT continue recommending products
- Instead say: "To finalize your order and payment, please contact {SALES_NAME} directly
  at {SALES_PHONE} — they will assist you right away! 😊"
- You may repeat the product name/price if they asked about a specific item

PRODUCT RECOMMENDATIONS:
- Mention prices clearly in PKR
- Highlight relevant attributes (color, fabric, fragrance notes) based on what was asked
- Be concise — 3-5 sentences max for recommendations
- If recommending one product over others, briefly explain why
- Always mention stock status if a product is out of stock

CONVERSATION CONTEXT:
You have memory of the last {len(session_history)} messages in this conversation.
Use this context to give coherent follow-up answers.
"""

# ── Response generation ───────────────────────────────────────────────────────
def generate_response(
    query:           str,
    products:        List[ProductOut],
    filters:         Dict,
    session_history: List[Dict],
    detected_language: str,
    raw_message:     str = "",
) -> str:
    """
    Generates the conversational LLM response in the explicitly detected language.
    """
    # ── Purchase intent check ─────────────────────────────────────────────
    check_text = (raw_message or query)
    if detect_purchase_intent(check_text):
        if "Urdu" in detected_language:
            return (
                f"Apna order aur payment final karne ke liye, baraye meharbani {SALES_NAME} "
                f"se direct *{SALES_PHONE}* par raabta karein! Wo foran aapki madad karenge! 😊"
            )
        else:
            return (
                f"I'd be happy to help you complete your purchase! 😊 "
                f"Please contact {SALES_NAME} directly at *{SALES_PHONE}* "
                f"and they will assist you with placing the order and payment right away."
            )

    # ── No products found ─────────────────────────────────────────────────
    if not products:
        hints = []
        if filters.get("gender"):
            hints.append(f"for {filters['gender']}")
        if filters.get("product_type"):
            hints.append(filters["product_type"])
        if filters.get("max_price"):
            hints.append(f"under PKR {filters['max_price']:,.0f}")
        hint_str = " ".join(hints) or "those filters"
        
        if "Urdu" in detected_language:
            return (
                f"Maazrat, mujhe {hint_str} ke mutabiq koi product nahi mil saki. "
                f"Shayad yeh item abhi stock mein nahi hai. Kya main aapko koi milti julti "
                f"cheez dikhaun?"
            )
        else:
            return (
                f"I'm sorry, I wasn't able to find any products matching {hint_str} "
                f"in our current inventory. This item may be out of stock. "
                f"Would you like me to suggest something similar?"
            )

    # ── Build product context for LLM ────────────────────────────────────
    context_lines = []
    for i, p in enumerate(products, 1):
        notes_str = ""
        if p.fragrance["notes_top"] or p.fragrance["notes_heart"]:
            notes_str = (
                f"Top: {p.fragrance['notes_top']} | "
                f"Heart: {p.fragrance['notes_heart']} | "
                f"Base: {p.fragrance['notes_base']}"
            )
        context_lines.append(
            f"{i}. **{p.name}**\n"
            f"   Gender: {p.category['l2']} | Type: {p.category['product_type']}"
            + (f" | Color: {p.color}"  if p.color  else "")
            + (f" | Fabric: {p.fabric}" if p.fabric else "") + "\n"
            f"   Price: {p.price['display']} | "
            f"{'IN STOCK ✓' if p.stock['available'] else 'OUT OF STOCK ✗'}\n"
            + (f"   Fragrance type: {p.fragrance['category']}\n" if p.fragrance['category'] else "")
            + (f"   {notes_str}\n" if notes_str else "")
            + f"   {p.description['primary'][:150]}\n"
        )
    context = "\n".join(context_lines)

    # ── Build message list with memory ────────────────────────────────────
    messages_for_llm = [
        {"role": "system", "content": build_system_prompt(session_history, detected_language)}
    ]

    # Inject last 10 turns of session history
    for turn in session_history[-10:]:
        messages_for_llm.append({"role": turn["role"], "content": turn["content"]})

    # Add current user request with retrieved context
    messages_for_llm.append({
        "role": "user",
        "content": (
            f"Customer's original language message: {raw_message or query}\n"
            f"Translated search query used: {query}\n\n"
            f"Retrieved products ({len(products)} found — ALWAYS present ALL of them, "
            f"do NOT say 'no results' or 'unavailable' when products are listed below):\n{context}"
        )
    })

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages_for_llm,
            temperature=0.65,
            max_tokens=400,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️  Response generation failed: {e}")
        return (
            f"I found {len(products)} matching product(s) for you. "
            f"Top pick: {products[0].name} at {products[0].price['display']}."
        )

# ── /chat endpoint (original, with session_id support) ───────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, session_id: str = "default"):
    messages_dicts = [{"role": m.role, "content": m.content} for m in request.messages]
    session_history = get_session_history(session_id)

    # Retrieve spell-checked English query AND detected language
    context_data      = contextualize_query(messages_dicts, session_history)
    refined_query     = context_data["corrected_english_query"]
    detected_language = context_data["detected_language"]
    raw_message       = request.messages[-1].content if request.messages else ""

    products, exec_ms, filters, strategy = retrieve_and_rerank(refined_query, request.limit)
    
    # Pass detected language into response generation to enforce language match
    ai_response = generate_response(
        refined_query, products, filters, session_history, detected_language, raw_message
    )

    # Save to session memory
    append_to_session(session_id, "user",      raw_message)
    append_to_session(session_id, "assistant", ai_response)

    return ChatResponse(
        query                   = refined_query,
        detected_language       = detected_language,
        filters_applied         = filters,
        conversational_response = ai_response,
        products                = products,
        total_results           = len(products),
        retrieval_strategy      = strategy,
        execution_time_ms       = round(exec_ms, 2),
    )

# ── /chat/whatsapp endpoint (n8n-optimised) ───────────────────────────────────
@app.post("/chat/whatsapp", response_model=WhatsAppResponse)
async def chat_whatsapp(request: WhatsAppRequest):
    """
    n8n / WhatsApp webhook endpoint.
    """
    session_history = get_session_history(request.session_id)

    # Build message list for contextualization
    messages_dicts    = [{"role": "user", "content": request.message}]
    
    # Retrieve spell-checked English query AND detected language
    context_data      = contextualize_query(messages_dicts, session_history)
    refined_query     = context_data["corrected_english_query"]
    detected_language = context_data["detected_language"]

    products, exec_ms, filters, strategy = retrieve_and_rerank(refined_query, request.limit)
    
    # Enforce detected language in generation
    ai_response = generate_response(
        refined_query, products, filters, session_history, detected_language, request.message
    )

    # Save to session memory
    append_to_session(request.session_id, "user",      request.message)
    append_to_session(request.session_id, "assistant", ai_response)

    # Build lightweight product list for n8n to use
    product_list = []
    for p in products:
        product_list.append({
            "name":        p.name,
            "price":       p.price["display"],
            "type":        p.category["product_type"],
            "gender":      p.category["l2"],
            "color":       p.color,
            "fabric":      p.fabric,
            "in_stock":    p.stock["available"],
            "image_url":   p.image_url,
            "product_link": p.product_link,
        })

    return WhatsAppResponse(
        session_id        = request.session_id,
        reply             = ai_response,
        products          = product_list,
        query_understood  = refined_query,
        detected_language = detected_language,
        filters_applied   = filters,
        execution_time_ms = round(exec_ms, 2),
    )

# ── Session management endpoints ──────────────────────────────────────────────
@app.delete("/session/{session_id}/clear")
async def clear_session_endpoint(session_id: str):
    clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}

@app.get("/session/{session_id}/history")
async def get_session_history_endpoint(session_id: str):
    history = get_session_history(session_id)
    return {"session_id": session_id, "turns": len(history), "history": history}

@app.get("/sessions")
async def list_sessions():
    return {
        "active_sessions": len(session_store),
        "sessions": {sid: len(hist) for sid, hist in session_store.items()}
    }

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    wv_ok   = weaviate_client.is_ready() if weaviate_client else False
    bm25_ok = bm25_index is not None
    return {
        "status":          "ok" if (wv_ok and bm25_ok) else "degraded",
        "weaviate":        wv_ok,
        "bm25":            bm25_ok,
        "bm25_docs":       len(bm25_corpus),
        "embed_model":     MODEL,
        "embed_dims":      DIMS,
        "active_sessions": len(session_store),
        "sales_phone":     SALES_PHONE,
    }

# ── Filter values endpoint ────────────────────────────────────────────────────
@app.get("/filters")
async def get_filters():
    return {
        "genders":         ["Men", "Women", "Boys", "Girls", "Kids", "Unisex"],
        "category_l1":     ["Clothing", "Fragrances", "Footwear", "Accessories", "Makeup", "Beauty"],
        "product_types": {
            "Clothing":    ["Kameez Shalwar", "Kurta", "Kurti", "Unstitched Suit", "Stitched Suit",
                            "Co-ord Set", "Shirt & Dupatta", "Trousers", "Shalwar", "Jubba",
                            "Top", "Jacket", "Waistcoat", "Frock", "Dupatta", "Stole",
                            "Saree", "Underwear", "Streetwear", "Unstitched Fabric", "Shirt"],
            "Fragrances":  ["Perfume", "Body Spray", "Body Mist", "Attar", "Gift Set", "Bakhoor",
                            "Shower Gel", "Hair Mist", "Beard Oil"],
            "Footwear":    ["Peshawari Chappal", "Sandals", "Slides"],
            "Accessories": ["Bangles", "Earrings", "Ring", "Bracelet", "Necklace", "Bag"],
            "Makeup":      ["Lip Makeup", "Eye Makeup", "Face Makeup"],
            "Beauty":      ["Skincare", "Shower Gel", "Hair Mist"],
        },
        "fragrance_types": ["Floral","Woody","Oriental","Fruity","Musky","Fresh","Gourmand",
                            "Citrus","Powdery","Vanilla","Aquatic","Spicy","Fougere","Amber","Leathery"],
        "price_buckets":   ["under_1000","1000_3000","3000_5000","5000_7000","7000_10000","above_10000"],
        "sort_options":    ["relevance","price_asc","price_desc"],
    }

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting J. RAG WhatsApp API v3.1")
    print(f"   Embedding model  : {MODEL} ({DIMS} dims)")
    print(f"   BM25 available   : {BM25_AVAILABLE}")
    print(f"   Sales phone      : {SALES_PHONE}")
    print(f"   Max session turns: {MAX_HISTORY}")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
