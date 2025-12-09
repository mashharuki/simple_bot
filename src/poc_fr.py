import requests
import json

def fetch_fr():
    url = "https://api.hyperliquid.xyz/info"
    headers = {"Content-Type": "application/json"}
    payload = {"type": "metaAndAssetCtxs"}
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Structure is [meta, assetCtxs]
        # assetCtxs is a list of objects
        
        print("Successfully fetched data!")
        # print(json.dumps(data, indent=2)) # Too large to print all
        
        meta = data[0]
        asset_ctxs = data[1]
        
        print(f"Number of assets: {len(asset_ctxs)}")
        
        # Print first 3 assets FR
        for i in range(3):
            asset = asset_ctxs[i]
            universe = meta['universe'][i]
            name = universe['name']
            funding = asset['funding']
            print(f"Asset: {name}, Funding: {funding}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_fr()
