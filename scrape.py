# scraper.py
import sys
import json
import asyncio
from playwright.async_api import async_playwright
user_data_dir = "/home/ubuntu/chrome_profile"
async def scrape(url):
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                executable_path="/usr/bin/google-chrome",
                args=["--no-sandbox"]
            )
            page = await browser.new_page()
            redirect_chain = []

            def handle_redirect(request):
                if request.is_navigation_request() and request.redirected_from:
                    redirect_chain.append(request.url)
            async def block_non_html(route):
                if route.request.resource_type in ['image', 'stylesheet', 'font']:
                    await route.abort()
                else:
                    await route.continue_()
            page.on("request", handle_redirect)
            await page.route("**/*", block_non_html)
            
            # ✅ Go to page (with aggressive timeout fallback)
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            except :
                print(f"[⚠️ Timeout] Navigation to {url} timed out", file=sys.stderr)
            try:
                # 🔁 Wait for all JS redirects to complete
                await page.wait_for_load_state('networkidle', timeout=15000)
            except:
              print('An exception occurred when waiting for redirects')
              
            # Check for meta-refresh redirect
            meta_redirect = await page.evaluate("""
                (() => {
                    const meta = document.querySelector('meta[http-equiv="refresh"]');
                    if (!meta) return null;
                    const match = meta.content.match(/url=([^;]+)/i);
                    return match ? match[1].trim() : null;
                })()
            """)
            if meta_redirect:
                print(f"[🔁 Meta Refresh Detected] Redirecting to: {meta_redirect}", file=sys.stderr)
                await page.goto(meta_redirect, wait_until='networkidle', timeout=15000)
                
        
            # Step 4: Retry-safe evaluate with backoff
            content = ''
            for attempt in range(3):
                try:
                    await page.wait_for_selector("body", timeout=10000)
                    content = await page.evaluate("document.body.innerText")
                    break
                except Exception as e:
                    print(f"[⚠️ Retry {attempt+1}] Page.evaluate failed: {str(e)}", file=sys.stderr)
                    await asyncio.sleep(2)
                    

            await browser.close()
            # Return as JSON
            result = {
                'content': content,
            }
            print(json.dumps(result))
        except Exception as e:
            import traceback
            traceback.print_exc(file=sys.stderr)  # ✅ Log error to stderr
            sys.exit(1)  # ✅ Exit with error code so parent knows it failed
        
        

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scraper.py <url>")
        sys.exit(1)
    url = sys.argv[1]
    asyncio.run(scrape(url))
