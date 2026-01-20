"""
File Name: full_site_scraper.py
Purpose: Scrape product data from Junaid Jamshed website including categories,
         products, prices, images, sizes, and attributes.
Author: <Najam U Saqib>
"""

import json
import os
import re
import time
from datetime import datetime

import requests
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as expected_conditions
from selenium.common.exceptions import TimeoutException


# =========================
# CONFIGURATION CONSTANTS
# =========================
HOME_URL = "https://www.junaidjamshed.com/"
IMAGES_DIR = "images"
JSON_FILENAME = "j_products_detailed.json"
PAGE_LOAD_TIMEOUT = 15
SCROLL_STEP = 700


# =========================
# DRIVER SETUP
# =========================
def setup_driver():
    """Initialize and return Chrome WebDriver."""
    chrome_options = uc.ChromeOptions()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    return uc.Chrome(options=chrome_options, version_main=140)


# =========================
# FILE & DATA HELPERS
# =========================
def create_images_folder():
    """Create images directory if it does not exist."""
    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)


def save_json(data):
    """Save scraped data to JSON file."""
    try:
        with open(JSON_FILENAME, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
    except IOError as error:
        print(f"Error saving JSON file: {error}")


def clean_filename(name):
    """Remove invalid characters from filenames."""
    return re.sub(r'[\\/*?:"<>|]', "", name).replace(" ", "_")


# =========================
# WEBSITE HANDLING
# =========================
def handle_landing_popup(driver):
    """Handle landing page popup if it appears."""
    try:
        enter_button = WebDriverWait(driver, PAGE_LOAD_TIMEOUT).until(
            expected_conditions.element_to_be_clickable(
                (By.CSS_SELECTOR, "button.jj-enter-btn")
            )
        )
        enter_button.click()
        time.sleep(2)
    except TimeoutException:
        print("Landing popup not found, continuing.")
    except Exception as error:
        print(f"Landing popup error: {error}")


def download_image(image_url, product_name):
    """Download product image and return local file path."""
    if not image_url:
        return None

    try:
        safe_name = clean_filename(product_name)
        timestamp = int(time.time())
        filename = f"{safe_name}_{timestamp}.jpg"
        file_path = os.path.join(IMAGES_DIR, filename)

        if os.path.exists(file_path):
            return file_path

        response = requests.get(image_url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(file_path, "wb") as file:
                for chunk in response.iter_content(1024):
                    file.write(chunk)
            return file_path

    except requests.RequestException as error:
        print(f"Image download failed: {error}")

    return None


# =========================
# SCRAPING LOGIC
# =========================
def collect_all_category_links(driver):
    """Extract all category links from the website navigation bar."""
    driver.get(HOME_URL)
    handle_landing_popup(driver)

    WebDriverWait(driver, PAGE_LOAD_TIMEOUT).until(
        expected_conditions.presence_of_element_located(
            (By.CSS_SELECTOR, "nav.navigation")
        )
    )

    navigation_links = driver.find_elements(By.CSS_SELECTOR, "nav.navigation a")
    category_urls = set()

    ignore_keywords = [
        "account", "login", "wishlist", "checkout", "contact",
        "javascript", "tel:", "mailto:", "currency"
    ]

    for link in navigation_links:
        href = link.get_attribute("href")
        if href and "junaidjamshed.com" in href and ".html" in href:
            if not any(keyword in href.lower() for keyword in ignore_keywords):
                category_urls.add(href)

    print(f"Discovered {len(category_urls)} categories.")
    return list(category_urls)


def get_product_details(driver, product_url):
    """Extract detailed product information from product page."""
    product_details = {
        "sku": "N/A",
        "article_code": "N/A",
        "stock_status": "N/A",
        "description_text": "N/A",
        "sizes": [],
        "attributes": {}
    }

    try:
        driver.get(product_url)
        WebDriverWait(driver, PAGE_LOAD_TIMEOUT).until(
            expected_conditions.presence_of_element_located(
                (By.CSS_SELECTOR, "h1.page-title")
            )
        )

        size_elements = driver.find_elements(
            By.CSS_SELECTOR, ".swatch-attribute.size .swatch-option"
        )
        for element in size_elements:
            size_text = element.text.strip()
            if size_text:
                product_details["sizes"].append(size_text)

        try:
            product_details["sku"] = driver.find_element(
                By.CSS_SELECTOR, "div[itemprop='sku']"
            ).text.strip()
        except Exception:
            pass

        try:
            product_details["stock_status"] = driver.find_element(
                By.CSS_SELECTOR, ".stock.available span"
            ).text.strip()
        except Exception:
            pass

        try:
            description_block = driver.find_element(
                By.CSS_SELECTOR, "div.product.attribute.overview"
            )
            product_details["description_text"] = description_block.text.strip()
        except Exception:
            pass

        rows = driver.find_elements(
            By.CSS_SELECTOR, "#product-attribute-specs-table tr"
        )
        for row in rows:
            try:
                key = row.find_element(By.CSS_SELECTOR, "th").text.strip()
                value = row.find_element(By.CSS_SELECTOR, "td").text.strip()
                product_details["attributes"][key] = value
            except Exception:
                continue

    except Exception as error:
        print(f"Product page error: {error}")

    return product_details


def process_page(driver, page_url, all_products, category_url):
    """Scrape a category page and return next page URL."""
    driver.get(page_url)

    try:
        WebDriverWait(driver, PAGE_LOAD_TIMEOUT).until(
            expected_conditions.presence_of_all_elements_located(
                (By.CSS_SELECTOR, "li.product-item")
            )
        )
    except TimeoutException:
        print("No products found on page.")
        return None

    total_height = driver.execute_script("return document.body.scrollHeight")
    for scroll_y in range(0, total_height, SCROLL_STEP):
        driver.execute_script(f"window.scrollTo(0, {scroll_y});")
        time.sleep(0.1)

    product_cards = driver.find_elements(By.CSS_SELECTOR, "li.product-item")

    for card in product_cards:
        try:
            product_link_element = card.find_element(
                By.CSS_SELECTOR, "a.product-item-link"
            )
            product_name = product_link_element.text.strip()
            product_link = product_link_element.get_attribute("href")

            try:
                product_price = card.find_element(
                    By.CSS_SELECTOR, ".price-box .price"
                ).text.strip()
            except Exception:
                product_price = "N/A"

            try:
                image_url = card.find_element(
                    By.CSS_SELECTOR, "img.product-image-photo"
                ).get_attribute("src")
            except Exception:
                image_url = None

            local_image_path = download_image(image_url, product_name)
            details = get_product_details(driver, product_link)

            product_data = {
                "category_source": category_url,
                "name": product_name,
                "price": product_price,
                "product_link": product_link,
                "image_url_online": image_url,
                "image_local_path": local_image_path,
                "scraped_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                **details
            }

            all_products.append(product_data)
            save_json(all_products)

        except Exception as error:
            print(f"Product processing error: {error}")

    try:
        next_button = driver.find_element(By.CSS_SELECTOR, "a.action.next")
        return next_button.get_attribute("href")
    except Exception:
        return None


# =========================
# MAIN EXECUTION
# =========================
def scrape_whole_site():
    """Main controller function for full site scraping."""
    create_images_folder()
    driver = setup_driver()
    all_products = []

    if os.path.exists(JSON_FILENAME):
        with open(JSON_FILENAME, "r", encoding="utf-8") as file:
            all_products = json.load(file)

    try:
        categories = collect_all_category_links(driver)
        for category_url in categories:
            current_page = category_url
            while current_page:
                current_page = process_page(
                    driver, current_page, all_products, category_url
                )
    finally:
        driver.quit()
        print("Scraping completed successfully.")


if __name__ == "__main__":
    scrape_whole_site()
