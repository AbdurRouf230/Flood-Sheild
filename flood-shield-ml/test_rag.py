import os
import sys

# Configure terminal output encoding to support unicode on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from rag_service import RAGService

def run_tests():
    print("==========================================")
    print("RUNNING PYTHON ML RAG SERVICE UNIT TESTS")
    print("==========================================\n")
    
    # 1. Initialize RAG Service
    print("--- 1. Initializing RAGService (Scanning PDFs / loading Cache) ---")
    service = RAGService()
    print(f"Chunks indexed: {len(service.chunks)}")
    if len(service.chunks) > 0:
        print("Pass: RAGService initialized and indexed chunks.\n")
    else:
        print("Fail: No text chunks found. Check PDF files in explainations/pdf_reports.\n")
        sys.exit(1)

    # 2. Test TF-IDF Tokenization
    print("--- 2. Testing Tokenizer ---")
    sample_text = "Severe floods affected Sylhet in 2017. সুরমা নদীর পানি বিপদসীমার উপরে প্রবাহিত হচ্ছে।"
    tokens = service.tokenize(sample_text)
    print(f"Sample text: '{sample_text}'")
    print(f"Tokens: {tokens}")
    if "sylhet" in tokens and "2017" in tokens and "নদীর" in tokens:
        print("Pass: Tokenizer splits English and Bengali unicode words correctly.\n")
    else:
        print("Fail: Tokenizer issues.\n")
        sys.exit(1)

    # 3. Test Vector Search Retrieval
    print("--- 3. Testing Context Retrieval ---")
    query = "Sylhet flood 2017 water level"
    matches, context = service.retrieve_context(query, top_k=2)
    print(f"Query: '{query}'")
    print(f"Matches retrieved: {len(matches)}")
    for i, m in enumerate(matches):
        print(f"  Match {i+1}: Source: {m['source']}, Page: {m['page']}, Similarity Score: {m['score']}")
    if len(matches) > 0:
        print("Pass: Context retrieval returned matching chunks with scores.\n")
    else:
        print("Fail: Similarity search retrieved nothing.\n")
        sys.exit(1)

    # 4. Test Dialect Prompt Generation
    print("--- 4. Testing Dialect Prompts ---")
    prompt_eng = service.get_dialect_prompt_instruction('en', 'safety')
    prompt_syl = service.get_dialect_prompt_instruction('sylheti', 'shelter')
    prompt_cht = service.get_dialect_prompt_instruction('chittagonian', 'explanation')
    
    print(f"English safety prompt: '{prompt_eng}'")
    print(f"Sylheti shelter prompt: '{prompt_syl}'")
    print(f"Chittagonian explanation prompt: '{prompt_cht}'")
    
    if "sylheti" in prompt_syl.lower() and "chittagonian" in prompt_cht.lower():
        print("Pass: Dialect prompt templates created correctly.\n")
    else:
        print("Fail: Dialect prompt templates error.\n")
        sys.exit(1)

    # 5. Test Offline Response Synthesis Fallback
    print("--- 5. Testing Offline Response Synthesis ---")
    dummy_context = "[Source: annual17.pdf, Page: 45] Surma river at Sylhet reached peak water level of 12.35m in July 2017, exceeding danger level by 1.25m."
    off_resp, engine = service.synthesize_offline_response("water level in 2017", dummy_context, 'sylheti', 'explanation')
    print("Offline Sylheti response:")
    print("------------------------------------------")
    print(off_resp)
    print("------------------------------------------")
    print(f"Engine used: {engine}")
    
    if "সিলেটি" in off_resp or "সারাংশ" in off_resp:
        print("Pass: Offline prompt response synthesis completed.\n")
    else:
        print("Fail: Offline response synthesis issues.\n")
        sys.exit(1)

    print("==========================================")
    print("ALL PYTHON RAG UNIT TESTS COMPLETED SUCCESSFULLY!")
    print("==========================================")

if __name__ == '__main__':
    run_tests()
