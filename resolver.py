import urllib.request
import re

urls = {
    "Polis_haqqinda": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHedgmBqfn51ioTHlim_Z5DpUf5eJVhi4hIcfaUlb3G55ffYK966OmUyLBBWoUHExUsyIJdvs4O8veXrYyebNGMG2BphxIHAXoF-XHCEu44ucVQMdzlsw==",
    "Tehsil_haqqinda": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-QEEngyR2slfolYKS_PQL0eyTaxG6E1unHlYgWYprxg1jwKSbCj6ihCIxT3eLG9SI61Ncs-Ck3w4SlJRgQL7JpNxTufzLK8dn43_XZqbj2Bo7FWluVRU=",
    "Mehkemeler_ve_hakimler": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH0agRGpBMXsc8w-4UnSK0zWjEtFdafD1kLa24QMOIy7rgIiUfgen6HqA26SXNDvD18rNMc964-cLgTH9KxlCwgOuWjCDvzQu-EhgbHtlVIvz1V2tOA7x4=",
    "Mudafie_haqqinda": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHhdkgllWBRH3pBiuNt8AP8Oyyg4YV70B4RZGXx21S9w_f_oB2drtcMvPFNCqUvI8ZQHqgRPTOeEET4QOR1hroc3POeYHKkjAgRnrtqXOrtcMQfwGOoTAY="
}

for name, url in urls.items():
    try:
        req = urllib.request.urlopen(url)
        final_url = req.geturl()
        match = re.search(r'framework/(\d+)', final_url)
        if match:
            print(f"{name}: {match.group(1)}")
    except Exception as e:
        print(e)
