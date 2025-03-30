import os
import requests
from bs4 import BeautifulSoup
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS  # Switch to FAISS instead of Chroma
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema.retriever import BaseRetriever
from typing import List, Dict, Any

# Set your OpenAI API key
api_key = os.environ.get("OPENAI_API_KEY")

def get_cik_from_ticker(ticker):
    url = "https://www.sec.gov/files/company_tickers.json"
    res = requests.get(url, headers={'User-Agent': 'your-email@example.com'})
    data = res.json()
    ticker = ticker.upper()

    for entry in data.values():
        if entry["ticker"] == ticker:
            return str(entry["cik_str"]).zfill(10)
    return None

def get_clean_10k_text(ticker):
    cik = get_cik_from_ticker(ticker)
    if not cik:
        raise ValueError(f"CIK not found for ticker {ticker}")

    sub_url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    res = requests.get(sub_url, headers={'User-Agent': 'your-email@example.com'})
    filings = res.json().get("filings", {}).get("recent", {})

    for i, form in enumerate(filings["form"]):
        if form == "10-K":
            accession = filings["accessionNumber"][i].replace("-", "")
            doc_name = filings["primaryDocument"][i]
            filing_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession}/{doc_name}"
            html = requests.get(filing_url, headers={'User-Agent': 'your-email@example.com'}).text
            soup = BeautifulSoup(html, "html.parser")
            text = soup.get_text(separator="\n")
            text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
            return text

    raise Exception("No 10-K found")

def extract_section(text, start_marker, end_marker):
    start = text.lower().find(start_marker.lower())
    end = text.lower().find(end_marker.lower(), start + len(start_marker))
    
    # If end marker not found, try to get content until the next item
    if end == -1 and start != -1:
        # Look for the next "Item X." pattern
        import re
        next_item_matches = list(re.finditer(r'Item \d+[A-Z]?\.', text.lower()[start + len(start_marker):]))
        if next_item_matches:
            end = start + len(start_marker) + next_item_matches[0].start()
        else:
            # If no next item found, get a substantial chunk of the content
            end = min(start + 50000, len(text))  # Get up to 50K characters
    
    return text[start:end].strip() if start != -1 and end != -1 else ""

def load_10k_as_documents(ticker):
    text = get_clean_10k_text(ticker)
    
    # If we got no text or very little text, log an error
    if len(text) < 1000:
        print(f"Warning: Very short 10-K text retrieved for {ticker}. Length: {len(text)}")
    
    sections = []
    
    # Extract various important sections with fallbacks
    # Item 1A - Risk Factors
    item_1a = extract_section(text, "Item 1A. Risk Factors", "Item 1B.")
    if not item_1a:
        item_1a = extract_section(text, "Item 1A.", "Item 1B.")  # Try alternative format
    if not item_1a:
        item_1a = extract_section(text, "Risk Factors", "Item 1B")  # Another alternative
        
    if item_1a and len(item_1a) > 200:  # Only add if there's substantial content
        sections.append(Document(page_content=item_1a, metadata={"section": "Item 1A - Risk Factors"}))
    
    # Item 7 - Management's Discussion
    item_7 = extract_section(text, "Item 7.", "Item 7A.")
    if not item_7:
        item_7 = extract_section(text, "Management's Discussion", "Item 7A")
        
    if item_7 and len(item_7) > 200:  # Only add if there's substantial content
        sections.append(Document(page_content=item_7, metadata={"section": "Item 7 - Management's Discussion"}))
    
    # Add the full text as a fallback if sections are empty
    if not sections:
        print(f"No specific sections found for {ticker}, using full text")
        # Split the full text into manageable chunks
        if len(text) > 500:
            chunks = [text[i:i+50000] for i in range(0, len(text), 40000)]  # 10K chars with overlap
            for i, chunk in enumerate(chunks):
                sections.append(Document(page_content=chunk, metadata={"section": f"10-K Part {i+1}"}))
    
    print(f"Extracted {len(sections)} document sections for {ticker}")
    for i, section in enumerate(sections):
        print(f"Section {i+1}: {section.metadata['section']} ({len(section.page_content)} chars)")
    
    return sections

# Custom document retriever for fallback
class SimpleDocRetriever:
    """A simple non-Pydantic class for document retrieval."""
    
    def __init__(self, documents):
        self.docs = documents
    
    def get_relevant_documents(self, query):
        return self.docs
        
    def invoke(self, input_data):
        if isinstance(input_data, dict) and "query" in input_data:
            return self.get_relevant_documents(input_data["query"])
        return self.get_relevant_documents(str(input_data))

def build_vector_db_from_documents(documents):
    """Build a vector database for document retrieval using FAISS."""
    try:
        # Split documents into chunks
        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)
        chunks = splitter.split_documents(documents)
        
        if len(chunks) == 0:
            # If no chunks, use original documents
            chunks = documents
        
        # Initialize the embedding model
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Use FAISS which is more reliable than Chroma for in-memory use
        try:
            db = FAISS.from_documents(chunks, embedding_model)
            retriever = db.as_retriever(search_kwargs={"k": 4})
            return retriever
        except Exception as faiss_error:
            print(f"Error with FAISS: {str(faiss_error)}")
            raise
            
    except Exception as e:
        print(f"Vector DB creation error: {str(e)}")
        print("Falling back to simple retrieval system...")
        
        # Fall back to simple document retriever
        return SimpleDocRetriever(documents)

def load_10k_and_build_retriever(ticker):
    """Load 10-K documents and build a retriever."""
    documents = load_10k_as_documents(ticker)
    retriever = build_vector_db_from_documents(documents)
    return documents, retriever

# Simple LLM-based QA chain without complex retrieval
class SimpleLLMChain:
    """A simple chain that uses the LLM directly."""
    
    def __init__(self, retriever):
        """Initialize with any retriever-like object."""
        self.retriever = retriever
        self.llm = ChatOpenAI(model_name="gpt-4o", api_key=api_key)
    
    def invoke(self, query_dict):
        """Process a query and return a response."""
        # Extract the query
        if isinstance(query_dict, dict):
            query = query_dict.get("query", "")
        else:
            query = str(query_dict)
            
        try:
            # Get documents using the retriever
            if hasattr(self.retriever, "get_relevant_documents"):
                docs = self.retriever.get_relevant_documents(query)
            elif hasattr(self.retriever, "docs"):
                docs = self.retriever.docs
            else:
                # If we can't get documents, use an empty list
                docs = []
                
            # Build context from documents
            context = ""
            for doc in docs:
                if hasattr(doc, "page_content"):
                    context += doc.page_content + "\n\n"
                else:
                    context += str(doc) + "\n\n"
                    
            # Limit context length
            if len(context) > 80000:
                context = context[:80000] + "..."
            
            # Create prompt
            prompt = f"""You are a helpful financial assistant answering questions based on a 10-K annual report.
            
            Context from the 10-K:
            {context}
            
            Question: {query}
            
            Answer:"""
            
            # Get response
            response = self.llm.invoke(prompt)
            content = response.content if hasattr(response, "content") else str(response)
            
            # Return result
            return {"answer": content, "source_documents": docs}
            
        except Exception as e:
            print(f"Error in SimpleLLMChain: {str(e)}")
            
            # Emergency fallback - just respond with a generic answer
            return {
                "answer": f"I couldn't access the 10-K data for this query. Error: {str(e)}",
                "source_documents": []
            }

def get_qa_chain(retriever):
    """Get a QA chain with robust fallbacks."""
    try:
        # Initialize LLM
        llm = ChatOpenAI(model_name="gpt-4o", api_key=api_key)
        
        # Create custom prompt
        custom_prompt = PromptTemplate.from_template("""You are a helpful financial assistant answering questions based on a 10-K annual report. Use only the provided context. If the question is about risks, extract the actual risks and summarize them clearly. *Do not* say "refer to Item 1A" — instead, summarize what the section says. Keep your answers clear and helpful.
        Remove all formatting. Answer in plain English.
        Context: {context}
        Question: {question}
        Answer:""")
        
        try:
            # Try to create a standard RetrievalQA chain
            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                retriever=retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": custom_prompt}
            )
            return qa_chain
            
        except Exception as chain_error:
            print(f"Error creating RetrievalQA chain: {str(chain_error)}")
            print("Using simple LLM chain as fallback...")
            
            # Use simple LLM chain
            return SimpleLLMChain(retriever)
            
    except Exception as e:
        print(f"Error in get_qa_chain: {str(e)}")
        print("Using emergency LLM-only system...")
        
        # Emergency fallback
        return SimpleLLMChain(retriever)