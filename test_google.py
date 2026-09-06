from googlesearch import search
print("Searching for Miqrasiya Məcəlləsi...")
try:
    results = search('site:e-qanun.az "Miqrasiya Məcəlləsi"', num_results=3, sleep_interval=2)
    for url in results:
        print(url)
except Exception as e:
    print(e)
