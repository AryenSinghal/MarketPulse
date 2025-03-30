from flask import Flask, request, jsonify
from datetime import timedelta
import os
import requests
import json
from dotenv import load_dotenv
from flask_cors import CORS
import datetime
import pandas as pd
# from anthropic import AnthropicBedrock
import google.generativeai as genai
import csv
import yfinance as yf
from vector_pipeline import build_vector_db_from_documents, get_cik_from_ticker, load_10k_and_build_retriever, get_qa_chain, load_10k_as_documents


load_dotenv()
app = Flask(__name__)
CORS(app)
stocks_data = pd.read_csv('stocks.csv')

# client = AnthropicBedrock(
#     aws_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
#     aws_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
#     aws_session_token=os.getenv("AWS_SESSION_TOKEN"),  # Optional if using temporary credentials
#     aws_region=os.getenv("AWS_DEFAULT_REGION", "us-west-2"),  # Default to "us-west-2" if not set
# )
genai.configure(api_key="AIzaSyBqWW-hLlvCn9IiJjE-2Sdyc-iTP6xFQa0")

# Define the model to use (e.g., Amazon Titan)
# model_name = "anthropic.claude-3-5-haiku-20241022-v1:0"

def summarise_news(headline, full_text):

    # Prepare the prompt
    prompt = f"""
    You are an advanced financial text summarization AI. Your task is to generate a concise upto 3-line summary of the important financial content from a given article. Only include key points about the article's financial context, metrics, or events. Return only the summary—no markdown, no explanations, preamble, or additional text. Follow the format of the examples below. Never include any personal opinions or editorial comments. If there is not enough financial information to be summarised, you can provide a general brief upto 3-line summary of the article. 

    Examples:

    Input:
    {{
    "headline": "Tech Giant Posts Record Q4 Earnings",
    "full_text": "Tech Giant Inc. reported record earnings for Q4 2024, with a net income of $2.5 billion, up 15% year-over-year. Revenue grew by 10% to $15 billion, driven by strong performance in its cloud services division. The company also announced a $1 billion stock buyback program."
    }}

    Output:
    Tech Giant Inc. reported $2.5 billion in Q4 2024 net income, a 15% increase year-over-year. Revenue rose 10% to $15 billion, led by growth in cloud services. The company plans a $1 billion stock buyback.

    Input:
    {{
    "headline": "Auto Manufacturer Expands EV Production",
    "full_text": "Auto Manufacturer Ltd. announced plans to increase its electric vehicle production capacity by 50% over the next three years. The company aims to invest $3 billion in new facilities and expects this move to boost its market share in the EV sector. Analysts predict a significant rise in the company's EV sales by 2027."
    }}

    Output:
    Auto Manufacturer Ltd. plans to expand EV production capacity by 50% in three years, investing $3 billion in new facilities. The move aims to grow market share in the EV sector. Analysts expect higher EV sales by 2027.


    Input:
    {{
    "headline": "{headline}",
    "full_text": "{full_text}"
    }}

    Output:
    """

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating summary: {str(e)}"


# For CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response


@app.route('/api/stocks/autocomplete', methods=['GET'])
def autocomplete_stocks():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify([])  # Return an empty list if no query

    # Filter stocks containing the query
    filtered = stocks_data[
        stocks_data['Name'].str.contains(query, case=False, na=False) |
        stocks_data['Ticker'].str.contains(query, case=False, na=False)
    ]

    # Prepare the response
    results = filtered.head(5).to_dict(orient='records')  # Limit results to 5
    return jsonify(results)

@app.route('/api/get_events', methods=['GET'])
def get_events():
    data = []
    # Read the CSV file
    df = pd.read_csv("../../analysis/analysis.csv")

    # Convert comma-separated strings back to lists
    df['tickers'] = df['tickers'].apply(lambda x: x.split(","))
    df['percentpricechanges'] = df['percentpricechanges'].apply(lambda x: list(map(float, x.split(","))))

    
    # Generate summaries and price change mappings
    # df['summary'] = df.apply(lambda row: summarise_news(row['headline'], row['text']), axis=1)
    df['summary'] = df['text']
    df['pricechanges'] = df.apply(lambda row: dict(zip(row['tickers'], row['percentpricechanges'])), axis=1)

    # Select required columns for the final output
    processed_data = df[['headline', 'summary', 'pricechanges']]
    # Convert the DataFrame to a list of dictionaries (if needed)
    data = processed_data.to_dict(orient='records')
    
    # Return JSON response
    return jsonify(data), 200


def get_stock_data_all_periods(ticker):
    try:
        # Create ticker object
        stock = yf.Ticker(ticker)
        
        # Get basic info
        info = stock.info
        company = info.get("longName", "N/A")
        current_price = info.get("currentPrice", "N/A")
        market_cap = info.get("marketCap", "N/A")
        year_range = f"{info.get('fiftyTwoWeekLow', 'N/A')} - {info.get('fiftyTwoWeekHigh', 'N/A')}"
        volume = info.get("volume", "N/A")
        
        # Define time periods and their parameters
        periods = {
            '1D': {'period': '1d', 'interval': '5m'},
            '1W': {'period': '5d', 'interval': '1h'},
            '1M': {'period': '1mo', 'interval': '1d'},
            '3M': {'period': '3mo', 'interval': '1d'},
            '1Y': {'period': '1y', 'interval': '1d'},
            'All': {'period': 'max', 'interval': '1wk'}
        }
        
        # Fetch data for all time periods
        chart_data = {}
        
        for period_key, params in periods.items():
            try:
                # Get historical data for this period
                hist_data = stock.history(period=params['period'], interval=params['interval'])
                
                # Format historical data for the chart
                period_data = []
                for date, row in hist_data.iterrows():
                    # Skip rows with NaN values
                    if pd.isna(row['Open']) or pd.isna(row['Close']):
                        continue
                        
                    period_data.append({
                        'date': date.strftime('%Y-%m-%d %H:%M:%S'),
                        'open': float(row['Open']),
                        'high': float(row['High']),
                        'low': float(row['Low']),
                        'close': float(row['Close']),
                        'volume': float(row['Volume'])
                    })
                
                # Determine if the stock is on an upward trend for this period
                positive = True
                if len(period_data) >= 2:
                    positive = period_data[-1]['close'] >= period_data[0]['close']
                
                chart_data[period_key] = {
                    'data': period_data,
                    'positive': positive
                }
                
            except Exception as period_error:
                print(f"Error fetching {period_key} data for {ticker}: {str(period_error)}")
                # Set empty data for this period if there's an error
                chart_data[period_key] = {
                    'data': [],
                    'positive': True,
                    'error': str(period_error)
                }
        
        return {
            "Current Price": current_price,
            "Market Cap": market_cap,
            "52 Week Range": year_range,
            "Volume": volume,
            "Company": company,
            "chart_data": chart_data
        }
    except Exception as e:
        print(f"Error fetching stock data for {ticker}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.route('/api/get_stock_data', methods=['GET'])
def get_stock_data_route():
    ticker = request.args.get('ticker')
    
    if not ticker:
        return jsonify({"error": "Ticker parameter is required"}), 400

    # Get stock data with chart data for all periods
    stock_data = get_stock_data_all_periods(ticker)

    # Fetch related news articles
    related_news = []
    try:
        with open('../../analysis/analysis.csv', 'r') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                tickers = row['tickers'].split(',')
                if ticker in tickers:
                    price_changes = [float(s) for s in row['percentpricechanges'].split(',')]
                    index = tickers.index(ticker)
                    related_news.append({
                        "headline": row['headline'],
                        "summary": summarise_news(row['headline'], row['text']),
                        "price_change": price_changes[index]
                    })
    except Exception as e:
        print(f"Error fetching related news: {str(e)}")

    return jsonify({
        "stock_data": stock_data,
        "related_news": related_news
    })

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.json
        user_message = data.get('message', '')
        user_context = data.get('context', {})
        
        # Format the holdings and interests for the prompt
        holdings = user_context.get('holdings', [])
        interests = user_context.get('interests', [])
        holdings_str = ', '.join(holdings) if holdings else "no specific holdings"
        interests_str = ', '.join(interests) if interests else "no specific interests"

        df = pd.read_csv("../../analysis/analysis.csv")
        news = df.to_string()
        
        # Create a prompt for Gemini
        prompt = f"""
        You are an AI financial assistant for MarketPulse, a stock market analysis application.
        Answer the following user query about stock markets, financial news, and predictions.
        
        The user has the following context:
        - Interests: {interests_str}
        - Holdings: {holdings_str}
        
        Based on the app's data, we have recent financial news. This data includes major news article headlines, along with MarketPulse's prediciction on how this news might affect stocks: {news}
        
        User query: {user_message}
        
        Provide a helpful, concise response focusing on financial insights.
        Your answer should first and foremost be directly relevant to the user query. Do not provide extra information.
        If the user mentions specific stocks they hold, prioritize information about those stocks.
        If the question relates to their interests, focus on those areas.
        If you cannot provide specific information, be honest about limitations.

        IMPORTANT: Output your response as plain text without any formatting. Explain using plain English sentences.
        """
        
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            return jsonify({"response": response.text})
        except Exception as e:
            return jsonify({"response": f"I encountered an error processing your request. Please try again later."}), 500
            
    except Exception as e:
        return jsonify({"response": "Sorry, I couldn't process your request. Please try again."}), 500

# Shared global state (for now, per-session)
retriever = None
qa_chain = None

# Global variables to store loaded data
loaded_models = {}
active_ticker = None

@app.route("/api/rag/load", methods=["GET"])
def load_ticker():
    global loaded_models, active_ticker
    ticker = request.args.get("ticker", "").upper()

    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400
    
    try:
        # Check if we've already loaded this ticker
        if ticker in loaded_models:
            qa_chain = loaded_models[ticker]
            active_ticker = ticker
            return jsonify({
                "message": f"10-K for {ticker} was already loaded.",
                "status": "success",
                "ticker": ticker
            })
        
        # Load new documents and build retriever
        documents, retriever = load_10k_and_build_retriever(ticker)
        
        if not documents or len(documents) == 0:
            return jsonify({
                "warning": f"No 10-K content found for {ticker}.",
                "status": "partial_success",
                "ticker": ticker
            })
            
        # Create QA chain
        qa_chain = get_qa_chain(retriever)
        
        # Store for future use
        loaded_models[ticker] = qa_chain
        active_ticker = ticker
        
        return jsonify({
            "message": f"10-K for {ticker} loaded successfully with {len(documents)} sections.",
            "status": "success",
            "ticker": ticker,
            "sections": [doc.metadata.get("section", "Unknown Section") for doc in documents]
        })
        
    except Exception as e:
        print(f"Error in /api/rag/load: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Try to create a fallback model
        try:
            # Create a simple direct QA chain as fallback
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model_name="gpt-4o", api_key=api_key)
            
            # Just create a simple answer generator without complicated retrieval
            class SimpleAnswerer:
                def __init__(self, ticker):
                    self.ticker = ticker
                    self.llm = llm
                
                def invoke(self, query_dict):
                    query = query_dict.get("query", "")
                    prompt = f"""You are answering a question about {ticker}'s 10-K report.
                    The question is: {query}
                    
                    Since I couldn't load the actual 10-K data, please explain that you don't have
                    specific information from the 10-K, but provide some general guidance about what
                    might typically be found in that section of a 10-K report for a company like {ticker}.
                    Be helpful while making it clear you don't have the actual data."""
                    
                    response = self.llm.invoke(prompt)
                    return {"answer": response.content, "source_documents": []}
            
            # Store fallback
            fallback_chain = SimpleAnswerer(ticker)
            loaded_models[ticker] = fallback_chain
            active_ticker = ticker
            
            return jsonify({
                "warning": f"Could not load 10-K data for {ticker}, but created a fallback assistant.",
                "error_details": str(e),
                "status": "fallback",
                "ticker": ticker
            })
            
        except Exception as fallback_error:
            return jsonify({
                "error": f"Failed to load 10-K for {ticker}: {str(e)}",
                "fallback_error": str(fallback_error),
                "status": "error"
            }), 500

@app.route("/api/rag/ask", methods=["POST"])
def ask_question():
    global loaded_models, active_ticker
    
    if not active_ticker or active_ticker not in loaded_models:
        return jsonify({
            "error": "No ticker model loaded. Please load a ticker first.",
            "status": "error"
        }), 400

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
            
        question = data.get("question", "").strip()
        if not question:
            return jsonify({"error": "Question is required"}), 400

        # Get the active QA chain
        qa_chain = loaded_models[active_ticker]
        
        try:
            # Try to invoke the chain
            response = qa_chain.invoke({"query": question})
            
            # Extract answer based on response format
            if isinstance(response, dict) and "answer" in response:
                answer = response["answer"]
            elif isinstance(response, dict) and "result" in response:
                answer = response["result"]
            else:
                answer = str(response)
                
            return jsonify({
                "question": question,
                "answer": answer,
                "ticker": active_ticker,
                "status": "success"
            })
            
        except Exception as chain_error:
            print(f"Error invoking QA chain: {str(chain_error)}")
            import traceback
            traceback.print_exc()
            
            # Create a direct answer as emergency fallback
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model_name="gpt-4o", api_key=api_key)
            
            fallback_prompt = f"""You are a helpful assistant answering questions about {active_ticker}'s 10-K report.
            There was an error retrieving specific information, but please provide a general response to this question:
            
            Question: {question}
            
            Be helpful while making it clear you don't have access to the specific 10-K data right now."""
            
            fallback_response = llm.invoke(fallback_prompt)
            
            return jsonify({
                "question": question,
                "answer": fallback_response.content,
                "ticker": active_ticker,
                "status": "fallback",
                "error": str(chain_error)
            })
            
    except Exception as e:
        print(f"Error in /api/rag/ask: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            "question": question if 'question' in locals() else "Unknown",
            "error": str(e),
            "fallback_answer": "Sorry, I encountered an error processing your question. Please try again or load a different ticker.",
            "status": "error"
        }), 500

@app.route('/api/trending_stocks', methods=['GET'])
def get_trending_stocks():
    try:
        # Get number of stocks to return (default to 6)
        count = int(request.args.get('count', 6))
        
        # Instead of scraping the most active page (which can trigger rate limits),
        # use a list of popular stocks as a more reliable alternative
        popular_tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'JPM', 'V']
        
        # Get detailed data for each ticker
        stocks_data = []
        for ticker in popular_tickers[:count]:
            try:
                # Add a short delay between requests to avoid rate limiting
                import time
                time.sleep(0.5)  # 500ms delay
                
                stock = yf.Ticker(ticker)
                # Use a less aggressive info fetch to reduce the chance of rate limiting
                info = stock.fast_info
                
                # Get the current price and percentage change
                current_price = info.last_price if hasattr(info, 'last_price') else 0
                previous_close = info.previous_close if hasattr(info, 'previous_close') else 0
                
                if previous_close and current_price:
                    percent_change = ((current_price - previous_close) / previous_close) * 100
                else:
                    percent_change = 0
                
                # Format the data for the frontend
                stocks_data.append({
                    'name': ticker,
                    'value': f'${current_price:.2f}',
                    'change': f'{abs(percent_change):.2f}%',
                    'positive': percent_change >= 0
                })
            except Exception as stock_error:
                print(f"Error fetching data for {ticker}: {str(stock_error)}")
                continue
        
        # Return only the requested number of stocks
        if not stocks_data:
            # If we couldn't get any real data, return fallback static data
            fallback_data = [
                {'name': 'AAPL', 'value': '$178.61', 'change': '0.93%', 'positive': True},
                {'name': 'MSFT', 'value': '$417.22', 'change': '1.12%', 'positive': True},
                {'name': 'GOOGL', 'value': '$165.31', 'change': '1.45%', 'positive': True},
                {'name': 'AMZN', 'value': '$182.41', 'change': '0.67%', 'positive': True},
                {'name': 'TSLA', 'value': '$172.63', 'change': '1.45%', 'positive': False},
                {'name': 'META', 'value': '$491.83', 'change': '0.76%', 'positive': True}
            ]
            return jsonify(fallback_data[:count])
        
        return jsonify(stocks_data[:count])
        
    except Exception as e:
        print(f"Error in get_trending_stocks: {str(e)}")
        # Return error with 500 status code
        return jsonify({
            'error': 'Failed to fetch trending stocks',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)
