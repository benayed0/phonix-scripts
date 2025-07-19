# scraper.py
import json
from playwright.async_api import async_playwright
user_data_dir = "/home/ubuntu/chrome_profile"
async def scrape(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox"]
        )
        page = await browser.new_page()
        await page.goto(url, wait_until='networkidle')
        # Method 1: Look for common PDF link selectors
        pdf_selectors = [
            'a[href*="pdf"]',
            'a[href*="PDF"]',
            'a[title*="PDF"]',
            'a[aria-label*="PDF"]',
            '.pdf-download',
            '.download-pdf',
            '[data-testid*="pdf"]',
            'a[href*="pdfft"]',  # ScienceDirect specific
            'a[href*="pdfplus"]'  # ScienceDirect specific
        ]

        pdf_links = []
        for selector in pdf_selectors:
            try:
                links = await page.query_selector_all(selector)
                for link in links:
                    href = await link.get_attribute('href')
                    text = await link.inner_text()
                    if href:
                        pdf_links.append({
                            'href': href,
                            'text': text.strip(),
                            'selector': selector
                        })
            except:
                continue
        
        content = await page.evaluate("document.body.innerText")
        await browser.close()

        
        # Return as JSON
        result = {
            'content': content,
        }
        print(json.dumps(result))
        
        
