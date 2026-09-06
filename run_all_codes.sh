#!/bin/bash
source venv/bin/activate
echo "Starting mass download with deep links..."
python dynamic_scraper.py --url "https://e-qanun.az/framework/46947"
python dynamic_scraper.py --url "https://e-qanun.az/framework/46944"
python dynamic_scraper.py --url "https://e-qanun.az/framework/46960"
python dynamic_scraper.py --url "https://e-qanun.az/framework/46945"
python dynamic_scraper.py --url "https://e-qanun.az/framework/46950"
echo "Done!"
