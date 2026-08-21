import os
import json
import re
import math
import requests
from pypdf import PdfReader

# Configuration paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.abspath(os.path.join(os.path.dirname(BASE_DIR), 'explainations', 'pdf_reports'))
CACHE_PATH = os.path.join(BASE_DIR, 'rag_vector_cache.json')

# LLM Fallback configs
HF_API_URL = "https://router.huggingface.co/v1/chat/completions" # Unified serverless proxy
HF_TOKEN = os.environ.get("HUGGINGFACE_TOKEN", "") # Optional token

class RAGService:
    def __init__(self):
        self.chunks = []
        self.vocab = {}
        self.idf = {}
        self.chunk_vectors = []
        self.indexed = False
        
        # Load and Index on startup
        self.initialize_index()

    def clean_text(self, text):
        # Clean up whitespace and special characters
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def tokenize(self, text):
        # Convert to lowercase and split on words
        text = text.lower()
        # Simple tokenization stripping punctuation
        tokens = re.findall(r'\b[a-zA-Z0-9\u0980-\u09ff]+\b', text) # Support English + Bangla unicode words
        return tokens

    def initialize_index(self):
        print("[RAG Service] Initializing search index...")
        
        # 1. Load from cache if it exists
        cache_loaded = False
        if os.path.exists(CACHE_PATH):
            try:
                with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    self.chunks = cache_data.get('chunks', [])
                    print(f"[RAG Service] Loaded {len(self.chunks)} text chunks from cache file.")
                    cache_loaded = True
            except Exception as e:
                print(f"[RAG Service] Error reading cache file: {e}. Re-parsing PDFs...")

        # 2. If cache not loaded, parse the PDF reports folder
        if not cache_loaded:
            self.parse_pdfs()

        # 3. Build TF-IDF mapping
        if self.chunks:
            self.build_tfidf_index()
            self.indexed = True
            print("[RAG Service] Search index built successfully.")
        else:
            print("[RAG Service] Warning: No documents found to index.")

    def parse_pdfs(self):
        print(f"[RAG Service] Scanning PDF directory: {PDF_DIR}")
        if not os.path.exists(PDF_DIR):
            print(f"[RAG Service] Error: Directory {PDF_DIR} does not exist.")
            return

        pdf_files = [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')]
        print(f"[RAG Service] Found {len(pdf_files)} PDF reports.")

        all_chunks = []
        chunk_size = 600
        overlap = 120

        for file_name in pdf_files:
            file_path = os.path.join(PDF_DIR, file_name)
            print(f"[RAG Service] Parsing {file_name}...")
            try:
                reader = PdfReader(file_path)
                for page_idx, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if not text:
                        continue
                    
                    cleaned = self.clean_text(text)
                    if len(cleaned) < 50:
                        continue
                        
                    # Split into overlapping chunks
                    start = 0
                    while start < len(cleaned):
                        end = min(start + chunk_size, len(cleaned))
                        chunk_text = cleaned[start:end]
                        
                        # Add a overlap boundary
                        all_chunks.append({
                            "text": chunk_text,
                            "source": file_name,
                            "page": page_idx + 1
                        })
                        
                        start += (chunk_size - overlap)
            except Exception as e:
                print(f"[RAG Service] Failed to parse {file_name}: {e}")

        self.chunks = all_chunks

        # Save to cache
        try:
            with open(CACHE_PATH, 'w', encoding='utf-8') as f:
                json.dump({"chunks": self.chunks}, f, ensure_ascii=False, indent=2)
            print(f"[RAG Service] Successfully saved {len(self.chunks)} chunks to cache.")
        except Exception as e:
            print(f"[RAG Service] Failed to write index cache file: {e}")

    def build_tfidf_index(self):
        # Build vocabulary & document frequency
        doc_count = len(self.chunks)
        df_counts = {}
        
        # Track word occurrences across chunks
        for idx, chunk in enumerate(self.chunks):
            tokens = set(self.tokenize(chunk['text']))
            for token in tokens:
                df_counts[token] = df_counts.get(token, 0) + 1
                
        # Vocabulary mapping
        self.vocab = {word: i for i, word in enumerate(df_counts.keys())}
        
        # Calculate IDF: log(N / (df + 1))
        self.idf = {}
        for word, df in df_counts.items():
            self.idf[word] = math.log((doc_count / (df + 1)) + 1.0)
            
        # Build vector representations for each chunk
        self.chunk_vectors = []
        for chunk in self.chunks:
            tokens = self.tokenize(chunk['text'])
            vector = {}
            # Count local term frequencies
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
                
            # Compute TF-IDF weights
            length_sq = 0.0
            for term, count in tf.items():
                if term in self.vocab:
                    weight = count * self.idf[term]
                    vector[self.vocab[term]] = weight
                    length_sq += weight ** 2
                    
            # Normalize vector
            length = math.sqrt(length_sq)
            normalized = {}
            if length > 0:
                for term_idx, weight in vector.items():
                    normalized[term_idx] = weight / length
            
            self.chunk_vectors.append(normalized)

    def retrieve_context(self, query, top_k=3):
        if not self.indexed:
            return [], ""

        query_tokens = self.tokenize(query)
        if not query_tokens:
            return [], ""

        # Compute query vector
        query_tf = {}
        for t in query_tokens:
            query_tf[t] = query_tf.get(t, 0) + 1

        query_vector = {}
        length_sq = 0.0
        for term, count in query_tf.items():
            if term in self.vocab:
                weight = count * self.idf[term]
                query_vector[self.vocab[term]] = weight
                length_sq += weight ** 2

        query_length = math.sqrt(length_sq)
        if query_length <= 0:
            return [], ""

        # Normalize query vector
        normalized_query = {idx: w / query_length for idx, w in query_vector.items()}

        # Compute cosine similarity
        scores = []
        for chunk_idx, chunk_vec in enumerate(self.chunk_vectors):
            dot_product = 0.0
            # Query is typically much smaller, iterate over query indices
            for term_idx, q_weight in normalized_query.items():
                if term_idx in chunk_vec:
                    dot_product += q_weight * chunk_vec[term_idx]
            
            if dot_product > 0.02: # Only include chunks with some similarity
                scores.append((dot_product, chunk_idx))

        # Sort scores in descending order
        scores.sort(key=lambda x: x[0], reverse=True)
        top_matches = scores[:top_k]

        retrieved_chunks = []
        context_parts = []
        
        for score, idx in top_matches:
            match = self.chunks[idx]
            retrieved_chunks.append({
                "text": match["text"],
                "source": match["source"],
                "page": match["page"],
                "score": round(score, 3)
            })
            context_parts.append(f"[Source: {match['source']}, Page: {match['page']}] {match['text']}")

        context_string = "\n\n".join(context_parts)
        return retrieved_chunks, context_string

    def get_dialect_prompt_instruction(self, language, output_type):
        dialect_guideline = ""
        if language == 'bn':
            dialect_guideline = "Respond in standard, formal Bangla language. Use proper Bengali grammar."
        elif language == 'sylheti':
            dialect_guideline = (
                "Respond entirely in the Sylheti dialect (সিলেটি উপভাষা) but write in the Bengali script. "
                "Use typical Sylheti phonetic patterns like: 'খ' instead of 'ক', 'ছ' instead of 'চ', 'হ'/'-' instead of 'প' (e.g. 'কিতাব' becomes 'খিতাব', 'খাইতাম'/'খাইছুন', 'কিলা আছেন' for how are you). "
                "Keep the sentence structures natural for a Sylhet resident."
            )
        elif language == 'chittagonian':
            dialect_guideline = (
                "Respond entirely in the Chittagonian dialect (চাটগাঁইয়া উপভাষা) and write in the Bengali script. "
                "Use Chittagonian terms and grammar like: 'ন গরিও' (don't do), 'জাইয়ুম' (will go), 'গরিয়ুম', 'ফানি' (water), 'অঁনরে' (you), 'গাত উঁচা জাগাত চলি যাওগই'. "
                "Ensure it sounds authentic to a Chittagong resident."
            )
        else:
            dialect_guideline = "Respond in clean, helpful English."

        mode_guideline = ""
        if output_type == 'safety':
            mode_guideline = "Format your answer as a structured bulleted emergency checklist containing practical, direct safety instructions."
        elif output_type == 'shelter':
            mode_guideline = "Focus on recommending nearby shelter actions. Reassure the user and direct them to safe heights or cyclone shelters."
        else:
            mode_guideline = "Provide a simple, clear, conversational explanation of the situation or facts requested."

        return f"{dialect_guideline} {mode_guideline}"

    def run_llm_completion(self, query, context, language, output_type, openrouter_key="", openai_key="", live_context=""):
        dialect_instructions = self.get_dialect_prompt_instruction(language, output_type)

        context_block = context if context else "No relevant document context available. Use general flood safety knowledge for Bangladesh."
        live_block = live_context.strip() if live_context else "No live situation snapshot was provided."

        system_prompt = (
            "You are 'FloodShield AI Assistant', a helpful emergency dispatcher in Bangladesh. "
            "Answer using this priority: (1) LIVE FLOODSHIELD SITUATION for current district risk "
            "and the closest shelter/distance from this user, (2) FFWC PDF context for historical facts, "
            "(3) general Bangladesh flood safety if still needed. "
            "When asked the most risky area, name the top ranked districts with their scores. "
            "If the user asks what their location is, answer with the coordinates from LIVE FLOODSHIELD SITUATION. "
            "Never say you cannot see their location when coordinates are present. "
            "(these distances were pre-calculated against all shelters). Also mention the next 2 nearest. "
            "When asked what to do from their current location, follow WHAT THE USER SHOULD DO NOW "
            "and tie it to their district risk level and the closest shelter. "
            "Do NOT invent different risk scores or distances than the live snapshot.\n\n"
            f"Dialect & Format Rule: {dialect_instructions}\n\n"
            f"{live_block}\n\n"
            f"Document Context (FFWC Reports):\n{context_block}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]

        OR_BASE = "https://openrouter.ai/api/v1/chat/completions"

        # ── 1. OpenRouter  gpt-oss-120b:free  (Primary — user-specified model) ──
        if openrouter_key and openrouter_key.strip():
            or_headers = {
                "Authorization": f"Bearer {openrouter_key.strip()}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://flood-shield.app",
                "X-Title": "FloodShield RAG Assistant"
            }

            # Model priority: gpt-oss-120b:free (user-specified), then verified free fallbacks
            # Model IDs verified against OpenRouter /api/v1/models on 2026-06-29
            OR_MODELS = [
                "openai/gpt-oss-120b:free",                     # Primary — user-specified 120B reasoning
                "openai/gpt-oss-20b:free",                      # Fallback 1 — same family, lighter, less rate-limited
                "nvidia/nemotron-3-ultra-550b-a55b:free",        # Fallback 2 — Nvidia 550B
                "nvidia/nemotron-3-super-120b-a12b:free",        # Fallback 3 — Nvidia 120B
                "meta-llama/llama-3.3-70b-instruct:free",        # Fallback 4 — Llama 70B
                "google/gemma-4-31b-it:free",                    # Fallback 5 — Google Gemma 31B
                "qwen/qwen3-next-80b-a3b-instruct:free",         # Fallback 6 — Qwen 80B
                "meta-llama/llama-3.2-3b-instruct:free",         # Fallback 7 — tiny/fast, last resort
            ]

            for or_model in OR_MODELS:
                try:
                    print(f"[RAG Service] Trying OpenRouter model: {or_model}")
                    payload = {
                        "model": or_model,
                        "messages": messages,
                        "max_tokens": 700,
                        "temperature": 0.3,
                    }
                    r = requests.post(OR_BASE, headers=or_headers, json=payload, timeout=25)

                    if r.status_code == 429:
                        print(f"[RAG Service] {or_model} rate-limited (429). Trying next model...")
                        continue

                    if r.status_code == 404:
                        print(f"[RAG Service] {or_model} not found (404). Trying next model...")
                        continue

                    if r.status_code != 200:
                        print(f"[RAG Service] OpenRouter {or_model} HTTP {r.status_code}: {r.text[:150]}")
                        raise Exception(f"HTTP {r.status_code}")

                    data = r.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise Exception("Empty choices in response")

                    msg = choices[0].get("message") or {}
                    content = (msg.get("content") or "").strip()

                    # Reasoning models (like gpt-oss-120b) may put the answer in reasoning_content
                    if not content:
                        content = (msg.get("reasoning_content") or "").strip()

                    if content:
                        short_name = or_model.split("/")[-1]
                        print(f"[RAG Service] Success with {or_model}")
                        return content, f"{short_name} via OpenRouter (RAG)"

                    raise Exception("Empty content in response")

                except Exception as e:
                    print(f"[RAG Service] OpenRouter {or_model} failed: {e}. Trying next...")
                    continue

        # ── 2. OpenAI GPT-4o-Mini (Secondary — if caller supplies key) ───────────
        if openai_key and openai_key.strip():
            try:
                print("[RAG Service] Falling back to OpenAI GPT-4o-Mini...")
                r = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key.strip()}", "Content-Type": "application/json"},
                    json={"model": "gpt-4o-mini", "messages": messages, "max_tokens": 512, "temperature": 0.3},
                    timeout=15
                )
                if r.status_code == 200:
                    text = (r.json()["choices"][0]["message"].get("content") or "").strip()
                    if text:
                        return text, "GPT-4o-Mini (OpenAI Fallback RAG)"
                else:
                    print(f"[RAG Service] OpenAI returned {r.status_code}: {r.text[:150]}")
            except Exception as e:
                print(f"[RAG Service] OpenAI fallback failed: {e}")

        # ── 3. HuggingFace Inference (Tertiary free fallback) ────────────────────
        try:
            print("[RAG Service] Falling back to HuggingFace Qwen2.5-7B...")
            hf_headers = {"Content-Type": "application/json"}
            if HF_TOKEN:
                hf_headers["Authorization"] = f"Bearer {HF_TOKEN}"
            r = requests.post(
                HF_API_URL,
                headers=hf_headers,
                json={"model": "Qwen/Qwen2.5-7B-Instruct", "messages": messages, "max_tokens": 512, "temperature": 0.3},
                timeout=15
            )
            if r.status_code == 200:
                choices = r.json().get("choices", [])
                if choices:
                    text = (choices[0].get("message", {}).get("content") or "").strip()
                    if text:
                        return text, "Qwen2.5-7B-Instruct (HuggingFace Fallback RAG)"
            print(f"[RAG Service] HuggingFace returned {r.status_code}: {r.text[:100]}")
        except Exception as e:
            print(f"[RAG Service] HuggingFace fallback failed: {e}")

        # ── 4. Local PDF Text Synthesizer (Final offline fallback) ───────────────
        print("[RAG Service] All LLM providers failed — using local synthesizer.")
        return self.synthesize_offline_response(query, context, language, output_type)


    def synthesize_offline_response(self, query, context, language, output_type):
        # A smart regex factual chunk synthesizer that generates accurate summaries from PDF text
        # Extract sentences from context containing numbers, water levels or names
        facts = []
        if context:
            sentences = re.split(r'(?<=[.!?])\s+', context)
            for s in sentences:
                s_clean = s.strip()
                # Highlight sentences with numbers (statistics), river names, or years
                if any(x in s_clean.lower() for x in ['flood', 'river', 'water', 'level', 'forecast', 'm', 'cm', '201', '202']):
                    if len(s_clean) > 30 and len(facts) < 4:
                        # Strip source tag if present in sentence
                        s_clean_clean = re.sub(r'\[Source: [^\]]+\]', '', s_clean).strip()
                        facts.append(s_clean_clean)

        facts_text = " ".join(facts) if facts else "No direct statistics extracted from the reports for this query."
        
        # Format the offline response based on dialect and outputType
        if language == 'bn':
            if output_type == 'safety':
                return (
                    f"বন্যা প্রতিরোধে FFWC নীতিমালার ভিত্তিতে নিরাপত্তা গাইডলাইন:\n"
                    f"১. {facts[0] if len(facts) > 0 else 'জরুরি ওষুধ ও শুকনো খাবার নিরাপদ স্থানে রাখুন।'}\n"
                    f"২. {facts[1] if len(facts) > 1 else 'নিরাপদ পানি এবং চাল-ডাল ওয়াটারপ্রুফ ব্যাগে রাখুন।'}\n"
                    f"৩. আশ্রয়কেন্দ্রের যোগাযোগ নম্বর সংগ্রহে রাখুন এবং মেইন সুইচ বন্ধ করুন।"
                ), "Local Synthesis Engine (Offline Fallback)"
            elif output_type == 'shelter':
                return (
                    f"নিকটস্থ আশ্রয়কেন্দ্র গাইড (FFWC রিপোর্ট অনুসারে):\n"
                    f"রিপোর্টে বলা হয়েছে: {facts[0] if len(facts) > 0 else 'বন্যা কবলিত এলাকায় স্থানীয় স্কুল ও বন্যা আশ্রয় কেন্দ্র প্রস্তুত করা হয়েছে।'}\n"
                    f"সিলেট কলেজ আশ্রয়কেন্দ্র এবং সুনামগঞ্জ ডিগ্রি কলেজে ফ্যামিলিসহ চলে যান।"
                ), "Local Synthesis Engine (Offline Fallback)"
            else:
                return (
                    f"রেকর্ডকৃত FFWC রিপোর্ট অনুসারে বন্যা পরিস্থিতির বিবরণ:\n"
                    f"{facts_text}\n"
                    f"(নোট: এআই ইঞ্জিন অফলাইনে থাকায় পিডিএফ থেকে প্রাসঙ্গিক অংশ তুলে ধরা হলো।)"
                ), "Local Synthesis Engine (Offline Fallback)"
                
        elif language == 'sylheti':
            if output_type == 'safety':
                return (
                    f"সিলেটি ভাষায় জরুরি নিরাপত্তা গাইডলাইন (রিপোর্ট অনুসারে):\n"
                    f"১. {facts[0] if len(facts) > 0 else 'দরকারি জিনিস আর হুকনা খাওন প্লাস্টিক বেগ দিয়া বান্ধো।'}\n"
                    f"২. {facts[1] if len(facts) > 1 else 'ফানির পাইপ আর কারেন্টর সুইচ সাবধানে বন্ধ করো।'}\n"
                    f"৩. উঁচা জাগাত আশ্রয় নেও, সাবধানে থাকো।"
                ), "Local Synthesis Engine (Offline Fallback)"
            elif output_type == 'shelter':
                return (
                    f"সিলেটি ভাষায় শেল্টারের তথ্য:\n"
                    f"শেল্টার বিবরণ: {facts[0] if len(facts) > 0 else 'সিলেটের স্কুল আর সরকারি আশ্রয়কেন্দ্র গুলা খোলা হইসে।'}\n"
                    f"সিলেট সরকারি কলেজ শেল্টার আর সুনামগঞ্জ হাই স্কুল শেল্টারে চলে যাওগা।"
                ), "Local Synthesis Engine (Offline Fallback)"
            else:
                return (
                    f"সিলেটি উপভাষায় পিডিএফ রিপোর্টের সারাংশ:\n"
                    f"রিপোর্টর তথ্য: {facts_text}\n"
                    f"(আমি অফলাইনে সিলেটি ভাষায় পিডিএফ থেকে তথ্য জানাইরাম।)"
                ), "Local Synthesis Engine (Offline Fallback)"
                
        elif language == 'chittagonian':
            if output_type == 'safety':
                return (
                    f"চাটগাঁইয়া ভাষায় জরুরি নিরাপত্তা গাইডলাইন:\n"
                    f"১. {facts[0] if len(facts) > 0 else 'দরকারী জিনিস আর ওষধাইন প্লাস্টিক বেগ হত্তে হামাই রাইক্কো।'}\n"
                    f"২. {facts[1] if len(facts) > 1 else 'কারেন্টের মেইন সুইচ বন্দ গরি দেও ভাই।'}\n"
                    f"৩. ফানি বেশি বাড়ি গেলে গাং কুলে ন থাইক্কো, উঁচা জাগাত চলি যাও।"
                ), "Local Synthesis Engine (Offline Fallback)"
            elif output_type == 'shelter':
                return (
                    f"চাটগাঁইয়া ভাষায় আশ্রয়কেন্দ্রের খপর:\n"
                    f"খপর: {facts[0] if len(facts) > 0 else 'চট্টগ্রাম আর ফেনীর স্কুল আশ্রয়কেন্দ্র হিসেবে খুলি দিয়া গিয়ি।'}\n"
                    f"হালিশহর শেল্টার হাব অথবা ফেনীর প্রাইমারি স্কুল শেল্টারে চলি যাওগই।"
                ), "Local Synthesis Engine (Offline Fallback)"
            else:
                return (
                    f"চাটগাঁইয়া উপভাষায় পিডিএফ রিপোর্টের খপর:\n"
                    f"খপর: {facts_text}\n"
                    f"(এআই অফলাইন অইবার কারণে পিডিএফ রিপোর্টর ফত্তর থন আঁই চট্টগ্রামর ভাষায় সংক্ষেপ করিয়া কইলাম।)"
                ), "Local Synthesis Engine (Offline Fallback)"
                
        else: # English
            if output_type == 'safety':
                return (
                    f"Safety checklist compiled from official FFWC reports:\n"
                    f"1. {facts[0] if len(facts) > 0 else 'Move food supplies and medical items to dry elevations.'}\n"
                    f"2. {facts[1] if len(facts) > 1 else 'Prepare waterproof emergency dry packs with water bottles.'}\n"
                    f"3. Disconnect power outlets and locate local shelter coordinates."
                ), "Local Synthesis Engine (Offline Fallback)"
            elif output_type == 'shelter':
                return (
                    f"Shelter recommendation derived from FFWC text:\n"
                    f"Extract: {facts[0] if len(facts) > 0 else 'Local primary schools and government concrete structures are active flood shelters.'}\n"
                    f"Action: Evacuate immediately to Sylhet Govt College Shelter or Kurigram Degree College."
                ), "Local Synthesis Engine (Offline Fallback)"
            else:
                return (
                    f"Factual briefing from FFWC Annual Reports:\n"
                    f"{facts_text}\n"
                    f"(Note: Falling back to local PDF context extract due to API offline state.)"
                ), "Local Synthesis Engine (Offline Fallback)"
