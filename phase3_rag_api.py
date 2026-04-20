#!/usr/bin/env python3
"""
Phase 3 v2: RAG Retrieval API — ENRICHED DATA
==============================================
Changes from original:
  1. NEW: product_type filter (Kurta, Perfume, Sandals, etc.)
  2. NEW: color filter
  3. NEW: fabric filter
  4. NEW: season filter
  5. FIX: category_l2 = gender (Men/Women/Boys/Girls/Kids/Unisex)
  6. FIX: BM25 filters use correct metadata keys
  7. FIX: Filter extraction prompt updated for all J. product types
  8. FIX: Adaptive alpha tuned for clothing vs fragrance queries
  9. NEW: image_url in ProductOut for frontend display
"""

import os, sys, json, re, time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
import cohere
from openai import OpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import weaviate
from weaviate.classes.query import MetadataQuery, Filter

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    print("rank_bm25 not installed — BM25 disabled. Run: pip install rank-bm25")

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
co_client     = cohere.Client(os.getenv("COHERE_API_KEY"))
weaviate_client: Optional[weaviate.WeaviateClient] = None

bm25_index:    Optional["BM25Okapi"] = None
bm25_corpus:   List[Dict]             = []

MODEL = "text-embedding-3-large"
DIMS  = 3072
RERANK_THRESHOLD = 0.15

BASE_DIR = Path(__file__).parent
try:
    from config import BM25_CORPUS_PATH, BM25_FALLBACK_PATH
except ImportError:
    BM25_CORPUS_PATH  = BASE_DIR / "enriched_data" / "bm25_corpus.json"
    BM25_FALLBACK_PATH = BASE_DIR / "enriched_data" / "bm25_corpus.json"

app = FastAPI(
    title="J. RAG E-Commerce API v2",
    description="Production RAG: BM25 + Multi-vector Hybrid + Cohere Rerank — with full filter support",
    version="4.0.0",
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

images_dir = Path(__file__).parent / "images"
images_dir.mkdir(exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    limit: int = Field(default=5, ge=1, le=50)

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
    query:                  str
    filters_applied:        Dict[str, Any]
    conversational_response:str
    products:               List[ProductOut]
    total_results:          int
    retrieval_strategy:     str
    execution_time_ms:      float

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
        print(f"BM25 disabled")

@app.on_event("shutdown")
async def shutdown():
    if weaviate_client:
        weaviate_client.close()

def get_query_embedding(text: str) -> List[float]:
    resp = openai_client.embeddings.create(
        model=MODEL, input=text, encoding_format="float"
    )
    return resp.data[0].embedding

def contextualize_query(messages: List[Message]) -> str:
    if len(messages) == 1:
        return messages[0].content
    history   = "\n".join(f"{m.role}: {m.content}" for m in messages[:-1])
    last_query= messages[-1].content
    resp = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content":
             "Rewrite the latest user query to be fully self-contained. "
             "Resolve all pronouns and context references. "
             "Output ONLY the rewritten query string, nothing else."},
            {"role": "user", "content": f"History:\n{history}\n\nLatest: {last_query}"}
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content.strip()

FILTER_SYSTEM_PROMPT = """
You are a filter extractor for J. (Junaid Jamshed) e-commerce store in Pakistan.

The store sells:
  CLOTHING: Kameez Shalwar, Kurta, Kurti, Unstitched Suit, Stitched Suit,
            Co-ord Set, Shirt & Dupatta, Trousers, Shalwar, Jubba, Top, Jacket,
            Waistcoat, Infant Dress, Dupatta, Stole, Saree, Underwear
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

Rules:
- "women"/"ladies"/"female"/"her"/"she" → gender="Women"
- "men"/"gents"/"male"/"him"/"he" → gender="Men"
- "boys"/"teen boys" → gender="Boys"
- "girls"/"teen girls" → gender="Girls"
- "kids"/"children"/"infant"/"baby" → gender="Kids"
- "kurta" with gender=Men → product_type="Kurta"; with gender=Women/Girls → product_type="Kurti"
- "lawn"/"unstitched" → product_type="Unstitched Suit", category_l1="Clothing"
- "kameez shalwar"/"shalwar kameez" → product_type="Kameez Shalwar"
- "perfume"/"fragrance"/"scent" → product_type="Perfume", category_l1="Fragrances"
- "sandals"/"chappal"/"peshawari" → product_type="Peshawari Chappal", category_l1="Footwear"
- "cheap"/"budget"/"affordable" → sort_by="price_asc"
- "premium"/"luxury"/"expensive" → sort_by="price_desc"
- "in stock"/"available" → in_stock_only=true
- Extract color words: "black kurta" → color="Black"
- Extract fabric: "cotton", "lawn", "silk", "linen", "khaddar" → fabric=...
- Extract price: "under 5000" → max_price=5000
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
        print(f"Filter extraction failed: {e}")
        return {}

# ── Adaptive alpha ────────────────────────────────────────────────────────────
def compute_alpha(query: str, filters: Dict) -> float:
    """
    0.0 = pure BM25  |  1.0 = pure vector
    """
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

def build_weaviate_filter(filters: Dict) -> Optional[Any]:
    conditions = []

    # Gender
    if filters.get("gender"):
        conditions.append(
            Filter.by_property("category_l2").equal(filters["gender"])
        )

    # Product type
    if filters.get("product_type"):
        conditions.append(
            Filter.by_property("product_type").equal(filters["product_type"])
        )

    # Category L1
    if filters.get("category_l1"):
        conditions.append(
            Filter.by_property("category_l1").equal(filters["category_l1"])
        )

    # Price range
    if filters.get("max_price") is not None:
        conditions.append(
            Filter.by_property("price_numeric").less_or_equal(float(filters["max_price"]))
        )
    if filters.get("min_price") is not None:
        conditions.append(
            Filter.by_property("price_numeric").greater_or_equal(float(filters["min_price"]))
        )

    # Stock
    if filters.get("in_stock_only"):
        conditions.append(Filter.by_property("in_stock").equal(True))

    # Color
    if filters.get("color"):
        conditions.append(
            Filter.by_property("color").like(f"*{filters['color']}*")
        )

    # Fabric
    if filters.get("fabric"):
        conditions.append(
            Filter.by_property("fabric").like(f"*{filters['fabric']}*")
        )

    # Size (ml range ±20%)
    if filters.get("size_ml") and filters["size_ml"] > 0:
        target = float(filters["size_ml"])
        conditions.append(
            Filter.by_property("size_ml_numeric").greater_or_equal(target * 0.8)
        )
        conditions.append(
            Filter.by_property("size_ml_numeric").less_or_equal(target * 1.2)
        )

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

        # Applying hard filters
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
            print(f"Vector search ({target_vec}) error: {e}")

    seen   = {}
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
            "category":   props.get("fragrance_category", ""),
            "notes_top":  props.get("notes_top", ""),
            "notes_heart":props.get("notes_heart", ""),
            "notes_base": props.get("notes_base", ""),
            "accords":    props.get("main_accords", ""),
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
    start    = time.time()
    filters  = extract_smart_filters(query)
    print(f"Filters: {filters}")

    alpha      = compute_alpha(query, filters)
    wv_filter  = build_weaviate_filter(filters)
    rich_query = enrich_query(query, filters)
    print(f"   alpha={alpha} | enriched_query='{rich_query[:100]}'")

    # ── Stage 1: BM25 ─────────────────────────────────────────────────────
    bm25_ids = bm25_search(query, filters, top_k=40)
    print(f"   BM25 hits: {len(bm25_ids)}")

    # ── Stage 2: Vector / Hybrid ──────────────────────────────────────────
    query_vec = get_query_embedding(rich_query)
    vec_props = vector_search(query_vec, rich_query, wv_filter, alpha, limit=30)

    strategy = "hybrid_filtered"
    if len(vec_props) < 3 and wv_filter is not None:
        print("Too few results — retrying without filter")
        vec_props = vector_search(query_vec, rich_query, None, alpha, limit=30)
        strategy  = "hybrid_unfiltered_fallback"

    vec_ids = [p["product_id"] for p in vec_props]
    print(f"   Vector hits: {len(vec_props)}")

    # ── Stage 3: RRF Fusion ───────────────────────────────────────────────
    merged_ids = reciprocal_rank_fusion(bm25_ids, vec_ids)
    print(f"   After RRF: {len(merged_ids)} unique candidates")

    prop_map: Dict[str, Dict] = {p["product_id"]: p for p in vec_props}

    # ── Stage 4: Cohere Rerank ────────────────────────────────────────────
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
            # if r.relevance_score < RERANK_THRESHOLD:
            #     continue
            props = candidate_props[r.index]
            final_products.append(
                to_product_out(props, r.relevance_score, strategy)
            )
    except Exception as e:
        print(f"Reranking failed: {e}")
        for p in candidate_props[:limit]:
            final_products.append(
                to_product_out(p, p.get("_wv_score", 0.0), strategy + "+raw_score")
            )

    # Sort by price if requested
    sort = filters.get("sort_by")
    if sort == "price_asc":
        final_products.sort(key=lambda x: x.price["numeric"])
    elif sort == "price_desc":
        final_products.sort(key=lambda x: x.price["numeric"], reverse=True)

    elapsed = (time.time() - start) * 1000
    return final_products, elapsed, filters, strategy


def generate_response(query: str, products: List[ProductOut], filters: Dict) -> str:
    if not products:
        hints = []
        if filters.get("gender"):
            hints.append(f"for {filters['gender']}")
        if filters.get("product_type"):
            hints.append(filters["product_type"])
        if filters.get("max_price"):
            hints.append(f"under PKR {filters['max_price']:,.0f}")
        hint_str = " ".join(hints)
        return (
            f"I couldn't find any products matching '{hint_str}'. "
            "Try adjusting the price range, gender, or product type."
        )

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
            + (f" | Color: {p.color}" if p.color else "")
            + (f" | Fabric: {p.fabric}" if p.fabric else "") + "\n"
            f"   Price: {p.price['display']} | Size: {p.size} | "
            f"{'IN STOCK' if p.stock['available'] else 'OUT OF STOCK'}\n"
            + (f"   Fragrance: {p.fragrance['category']}\n" if p.fragrance['category'] else "")
            + (f"   {notes_str}\n" if notes_str else "")
            + f"   {p.description['primary'][:120]}\n"
        )

    context = "\n".join(context_lines)
    system_prompt = """You are a helpful sales assistant for J. (Junaid Jamshed) Pakistan.

STRICT RULES — follow exactly:
- ONLY mention facts that are explicitly stated in the product list provided below.
- Do NOT infer, assume, or add any detail not present in the data.
- Do NOT add lifestyle language (e.g. "perfect for daily wear", "ideal for formal occasions") unless explicitly stated.
- Do NOT add compliments or marketing language about quality, craftsmanship, or popularity unless in the data.
- Mention prices clearly in PKR.
- Highlight relevant attributes (color, fabric, fragrance notes) only if present in the data.
- Be warm and concise — 3-5 sentences max.
- If recommending one product over others, briefly explain why using only the provided attributes."""

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content":
                    f"Customer query: {query}\n\nMatching products:\n{context}"},
            ],
            temperature=0.3,   
            max_tokens=350,
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"I found {len(products)} matching products. Top pick: {products[0].name} at {products[0].price['display']}."

# ── Chat endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    refined_query = contextualize_query(request.messages)
    products, exec_ms, filters, strategy = retrieve_and_rerank(
        refined_query, request.limit
    )
    ai_response = generate_response(refined_query, products, filters)

    return ChatResponse(
        query                   = refined_query,
        filters_applied         = filters,
        conversational_response = ai_response,
        products                = products,
        total_results           = len(products),
        retrieval_strategy      = strategy,
        execution_time_ms       = round(exec_ms, 2),
    )

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    wv_ok   = weaviate_client.is_ready() if weaviate_client else False
    bm25_ok = bm25_index is not None
    return {
        "status":      "ok" if (wv_ok and bm25_ok) else "degraded",
        "weaviate":    wv_ok,
        "bm25":        bm25_ok,
        "bm25_docs":   len(bm25_corpus),
        "embed_model": MODEL,
        "embed_dims":  DIMS,
    }

# ── Filter values endpoint ────────────────────────────────────────────────────
@app.get("/filters")
async def get_filters():
    return {
        "genders":          ["Men", "Women", "Boys", "Girls", "Kids", "Unisex"],
        "category_l1":      ["Clothing", "Fragrances", "Footwear", "Accessories", "Makeup", "Beauty"],
        "product_types": {
            "Clothing":     ["Kameez Shalwar", "Kurta", "Kurti", "Unstitched Suit", "Stitched Suit",
                             "Co-ord Set", "Shirt & Dupatta", "Trousers", "Shalwar", "Jubba",
                             "Top", "Jacket", "Waistcoat", "Infant Dress", "Dupatta", "Stole",
                             "Saree", "Underwear", "Streetwear", "Unstitched Fabric", "Shirt"],
            "Fragrances":   ["Perfume", "Body Spray", "Body Mist", "Attar", "Gift Set", "Bakhoor",
                             "Shower Gel", "Hair Mist", "Beard Oil"],
            "Footwear":     ["Peshawari Chappal", "Sandals", "Slides"],
            "Accessories":  ["Bangles", "Earrings", "Ring", "Bracelet", "Necklace", "Bag"],
            "Makeup":       ["Lip Makeup", "Eye Makeup", "Face Makeup"],
            "Beauty":       ["Skincare", "Shower Gel", "Hair Mist"],
        },
        "fragrance_types":  ["Floral","Woody","Oriental","Fruity","Musky","Fresh","Gourmand",
                             "Citrus","Powdery","Vanilla","Aquatic","Spicy","Fougere","Amber","Leathery"],
        "price_buckets":    ["under_1000","1000_3000","3000_5000","5000_7000","7000_10000","above_10000"],
        "sort_options":     ["relevance","price_asc","price_desc"],
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting J. RAG API v4.0")
    print(f"   Embedding model : {MODEL} ({DIMS} dims)")
    print(f"   BM25 available  : {BM25_AVAILABLE}")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
