import requests
import json

def fetch_funding_rates():
    """
    Fetches funding rates for all assets from Hyperliquid API.
    Returns a list of dicts with 'name', 'funding' (float), 'apr' (float).
    """
    url = "https://api.hyperliquid.xyz/info"
    headers = {"Content-Type": "application/json"}
    payload = {"type": "metaAndAssetCtxs"}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # data[0] is universe metadata, data[1] is asset contexts
        universe = data[0]['universe']
        asset_ctxs = data[1]
        
        rates = []
        for i, asset_ctx in enumerate(asset_ctxs):
            if i >= len(universe):
                break
                
            name = universe[i]['name']
            funding_raw = asset_ctx.get('funding', 0.0)
            
            # Convert to float
            try:
                funding = float(funding_raw)
            except (ValueError, TypeError):
                funding = 0.0
                
            # Annualized Rate = Funding * 24 * 365
            apr = funding * 24 * 365 * 100 # stored as percentage (e.g. 10.5 for 10.5%)
            
            rates.append({
                'name': name,
                'funding': funding,
                'apr': apr
            })
            
        return rates
        
    except Exception as e:
        print(f"Error fetching funding rates: {e}")
        return []

def check_thresholds(rates, threshold):
    """
    Filters the rates list for items where abs(funding) >= threshold.
    """
    abnormal_rates = []
    for item in rates:
        funding = item['funding']
        if abs(funding) >= threshold:
            abnormal_rates.append(item)
    return abnormal_rates

def format_message(abnormal_rates):
    """
    Formats the list of abnormal rates into a readable message string.
    """
    if not abnormal_rates:
        return ""
        
    lines = ["🚨 **Abnormal Funding Rates Detected** 🚨\n"]
    
    for item in abnormal_rates:
        name = item['name']
        funding = item['funding']
        apr = item['apr']
        
        direction = "Prob. Long Heavy" if funding > 0 else "Prob. Short Heavy"
        icon = "📈" if funding > 0 else "📉"
        
        # Funding rate as percentage (e.g., 0.0001 -> 0.01%)
        funding_pct = funding * 100
        
        line = (f"{icon} **{name}**\n"
                f"   FR (1h): `{funding_pct:+.4f}%`\n"
                f"   APR: `{apr:+.2f}%`\n"
                f"   Note: {direction}")
        lines.append(line)
        
    return "\n".join(lines)
