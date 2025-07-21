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
            async def block_non_html(route):
                if route.request.resource_type in ['image', 'stylesheet', 'font']:
                    await route.abort()
                else:
                    await route.continue_()

            await page.route("**/*", block_non_html)
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            content = await page.evaluate("document.body.innerText")
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
