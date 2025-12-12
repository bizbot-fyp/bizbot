import sys
import time
import json
import os
import requests
import re
from datetime import datetime
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# Changed from specific category to Home URL for discovery
HOME_URL = "https://www.junaidjamshed.com/"
IMAGES_DIR = "images"
JSON_FILENAME = "j_products_detailed.json"

def setup_driver():
    """Initializes the undetected chrome driver."""
    options = uc.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    # options.add_argument('--headless') 
    driver = uc.Chrome(options=options, version_main=140)
    return driver

def create_images_folder():
    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)

def save_json(data):
    """Helper to save the current list of products immediately."""
    try:
        with open(JSON_FILENAME, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"⚠️ Error saving JSON: {e}")

def clean_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).replace(" ", "_")

def handle_landing_popup(driver):
    """
    detects the 'Enter' button on the landing page (Currency/Country selector)
    and clicks it to enter the main site.
    """
    print("⏳ Checking for landing page popup...")
    try:
        # Based on your screenshot, the button class is 'jj-enter-btn'
        enter_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.jj-enter-btn"))
        )
        enter_button.click()
        print("✅ Clicked 'ENTER' on landing page.")
        
        # Give it a second to close the modal/overlay
        time.sleep(2)
    except TimeoutException:
        print("ℹ️ No landing popup found (or it took too long). Continuing...")
    except Exception as e:
        print(f"⚠️ Warning: Issue interacting with landing popup: {e}")

def download_image(img_url, product_name):
    if not img_url: return None
    try:
        safe_name = clean_filename(product_name)
        timestamp = int(time.time())
        filename = f"{safe_name}_{timestamp}.jpg"
        file_path = os.path.join(IMAGES_DIR, filename)
        
        # Simple check to avoid re-downloading if we already have it from a previous run
        if os.path.exists(file_path):
            return file_path

        response = requests.get(img_url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return file_path
    except Exception:
        return None
    return None

def collect_all_category_links(driver):
    """
    New Feature: Visits Homepage and extracts all links from the Navigation Bar.
    """
    print("🌍 Visiting Home Page to discover categories...")
    driver.get(HOME_URL)
    
    # --- NEW ADDITION HERE ---
    handle_landing_popup(driver)
    # -------------------------
    
    # Wait for nav to be present
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "nav.navigation"))
    )
    
    # Find all links inside the main navigation block
    nav_links = driver.find_elements(By.CSS_SELECTOR, "nav.navigation a")
    
    category_urls = set()
    
    # Keywords to filter out non-product links
    ignore_keywords = [
        "account", "login", "wishlist", "checkout", "contact", 
        "javascript", "tel:", "mailto:", "directory", "currency"
    ]
    
    for link in nav_links:
        try:
            href = link.get_attribute("href")
            # Ensure it's a valid link, belongs to the domain, and isn't a utility link
            if href and "junaidjamshed.com" in href and ".html" in href:
                if not any(x in href.lower() for x in ignore_keywords):
                    category_urls.add(href)
        except:
            continue
            
    unique_links = list(category_urls)
    for l in unique_links:
        print(l)
    print(f"🔗 Discovered {len(unique_links)} unique category links from Navigation.")
    return unique_links

def get_product_details(driver, product_url):
    """
    Navigates to detail page, CLICKS 'More Info', and extracts:
    - Sizes
    - SKU / Article Code
    - Attributes (Fabric, etc.)
    """
    details = {
        "sku": "N/A",
        "article_code": "N/A",
        "stock_status": "N/A",
        "description_text": "N/A",
        "sizes": [],
        "attributes": {}
    }
    
    try:
        driver.get(product_url)
        # Wait for page to load (checking for breadcrumbs or title)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1.page-title"))
        )

        # ---------------------------
        # 1. EXTRACT SIZES
        # ---------------------------
        try:
            # Locate the size container
            size_elements = driver.find_elements(By.CSS_SELECTOR, ".swatch-attribute.size .swatch-option")
            for el in size_elements:
                size_text = el.text.strip()
                if size_text:
                    details["sizes"].append(size_text)
        except Exception as e:
            # print(f"    ⚠️ sizes not found: {e}")
            pass

        # ---------------------------
        # 2. EXTRACT SKU & META
        # ---------------------------
        try:
            details['sku'] = driver.find_element(By.CSS_SELECTOR, "div[itemprop='sku']").text.strip()
        except: pass

        try:
            details['article_code'] = driver.find_element(By.CSS_SELECTOR, ".product.attribute.sku.article-code span").text.strip()
        except: pass

        try:
            details['stock_status'] = driver.find_element(By.CSS_SELECTOR, ".stock.available span").text.strip()
        except: pass

        try:
            desc_block = driver.find_element(By.CSS_SELECTOR, "div.product.attribute.overview")
            details['description_text'] = desc_block.text.strip().replace("\n", " ")
        except: pass

        # ---------------------------
        # 3. EXTRACT 'MORE INFORMATION'
        # ---------------------------
        try:
            # A. Try to CLICK the tab to ensure it is expanded
            try:
                # We use JavaScript click to avoid 'element not interactable' errors if something overlaps it
                tab_link = driver.find_element(By.ID, "tab-label-additional-title")
                driver.execute_script("arguments[0].click();", tab_link)
                time.sleep(0.5) # Slight wait for accordion animation
            except:
                pass # If tab isn't clickable or already open, just proceed

            # B. Scrape the table
            rows = driver.find_elements(By.CSS_SELECTOR, "#product-attribute-specs-table tr")
            for row in rows:
                try:
                    key = row.find_element(By.CSS_SELECTOR, "th.col.label").text.strip()
                    val = row.find_element(By.CSS_SELECTOR, "td.col.data").text.strip()
                    details['attributes'][key] = val
                except:
                    continue
        except Exception as e:
            # print(f"    ⚠️ 'More Info' table issue: {e}")
            pass

    except Exception as e:
        print(f"    ⚠️ Failed loading {product_url}: {e}")
    
    return details

def process_page_and_save(driver, url, page_num, all_products_ref, current_category_url):
    """
    Scrapes the listing, gets details for each, and SAVES after every single product.
    Returns: Next Page URL (or None)
    """
    try:
        driver.get(url)
        print(f"\n📄 Loading Page {page_num}...")
        
        # Check if products exist on this page (sometimes empty categories exist)
        try:
            WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li.product-item")))
        except TimeoutException:
            print("    🛑 No products found on this page.")
            return None

        # Scroll logic
        total_height = driver.execute_script("return document.body.scrollHeight")
        for i in range(1, total_height, 700):
            driver.execute_script(f"window.scrollTo(0, {i});")
            time.sleep(0.1)
        
        product_cards = driver.find_elements(By.CSS_SELECTOR, "li.product-item")
        print(f"📋 Found {len(product_cards)} cards. Starting processing...")

        # 1. Capture basic links first
        basic_links = []
        for card in product_cards:
            try:
                # Basic info
                name_el = card.find_element(By.CSS_SELECTOR, "a.product-item-link")
                title = name_el.text.strip()
                link = name_el.get_attribute("href")
                
                try:
                    price = card.find_element(By.CSS_SELECTOR, ".price-box .price").text.strip()
                except: price = "N/A"

                try:
                    img_src = card.find_element(By.CSS_SELECTOR, "img.product-image-photo").get_attribute("src")
                except: img_src = None

                basic_links.append({
                    "name": title,
                    "price": price,
                    "product_link": link,
                    "image_url_online": img_src
                })
            except: continue

        # 2. Get Next Link (before navigating away)
        next_url = None
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, "a.action.next")
            next_url = next_btn.get_attribute("href")
        except: pass

        # 3. Visit each product and SAVE IMMEDIATELY
        print(f"🕵️  Deep scraping {len(basic_links)} items...")
        
        for i, basic in enumerate(basic_links, 1):
            print(f"  [{i}/{len(basic_links)}] Processing: {basic['name']}")
            
            # Download Image
            local_path = download_image(basic['image_url_online'], basic['name'])
            
            # Get Details
            details = get_product_details(driver, basic['product_link'])
            
            # Merge
            full_product = {
                "category_source": current_category_url,
                **basic, 
                **details, 
                "image_local_path": local_path,
                "scraped_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            # ADD TO MASTER LIST
            all_products_ref.append(full_product)
            
            # SAVE IMMEDIATELY
            save_json(all_products_ref)
            
        return next_url

    except Exception as e:
        print(f"❌ Page Error: {e}")
        return None

def scrape_whole_site():
    create_images_folder()
    driver = setup_driver()
    
    # Master list that keeps growing
    all_products = [] 
    
    # Load existing data if restart
    if os.path.exists(JSON_FILENAME):
        try:
            with open(JSON_FILENAME, 'r', encoding='utf-8') as f:
                all_products = json.load(f)
                print(f"🔄 Loaded {len(all_products)} existing products.")
        except: pass

    try:
        # Step 1: Get all Categories
        categories = collect_all_category_links(driver)
        
        # Step 2: Loop through each category
        for index, cat_url in enumerate(categories, 1):
            print(f"\n🚀 [Category {index}/{len(categories)}] Processing: {cat_url}")
            
            current_url = cat_url
            page_num = 1
            
            # Step 3: Pagination Loop for THIS category
            while current_url:
                next_url = process_page_and_save(driver, current_url, page_num, all_products, cat_url)
                
                # Check if we reached the end of this category
                if not next_url or next_url == current_url:
                    print("🏁 End of category.")
                    break
                
                current_url = next_url
                page_num += 1

    except Exception as e:
        print(f"❌ Fatal error: {e}")
    finally:
        driver.quit()
        print("\n🏁 Full Site Scraping completed.")

if __name__ == "__main__":
    print("🚀 Starting J. Full Site Scraper")
    scrape_whole_site()