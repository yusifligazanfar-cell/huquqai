#!/usr/bin/env python3
"""
Builds `cloudflare-worker/public/judicial_index.json` from `data/eqanun_full.sqlite`
and the freshly built Cloudflare Worker metadata shards (`public/m/*.json`),
tagging EVERY active Supreme Court Plenum & Constitutional Court decision with
its exact legal code domains (from both title and full body text!) so zero
decisions are left domain-untagged (prevents cross-domain leaks like criminal
parole decisions leaking into labor/family questions).
"""

from __future__ import annotations

import glob
import json
import re
import sqlite3
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = WORKER_DIR.parent
DB_PATH = ROOT_DIR / "data" / "eqanun_full.sqlite"
PUBLIC_DIR = WORKER_DIR / "public"
OUT_PATH = PUBLIC_DIR / "judicial_index.json"

AZ_TRANS = str.maketrans({
    "İ": "i", "I": "i", "ı": "i",
    "Ə": "e", "ə": "e",
    "Ö": "o", "ö": "o",
    "Ü": "u", "ü": "u",
    "Ğ": "g", "ğ": "g",
    "Ş": "s", "ş": "s",
    "Ç": "c", "ç": "c",
})

def norm_az(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\u04d9", "ə").replace("\u04d8", "Ə").translate(AZ_TRANS).lower()).strip()

# Ordered code patterns (more specific first)
LAW_PATTERNS = [
    ("cinayet_prosessual", [r"cinayet[\s\-]+prosessual\s+mecelle"]),
    ("mulki_prosessual", [r"mulki[\s\-]+prosessual\s+mecelle"]),
    ("inzibati_prosessual", [r"inzibati[\s\-]+prosessual\s+mecelle"]),
    ("inzibati_xetalar", [r"inzibati\s+xetalar\s+mecelle"]),
    ("aile", [r"\baile\s+mecelle", r"er[\-\s]arvadin\s+umumi\s+emlakin", r"nikahin\s+pozulm", r"valideynlik\s+huquq", r"usaqlarin\s+terbiye", r"aliment"]),
    ("emek", [r"\bemek\s+mecelle", r"emek\s+muqavile", r"isden\s+cixaril"]),
    ("vergi", [r"\bvergi\s+mecelle"]),
    ("torpaq", [r"\btorpaq\s+mecelle"]),
    ("menzil", [r"\bmenzil\s+mecelle"]),
    ("gomruk", [r"\bgomruk\s+mecelle"]),
    ("miqrasiya", [r"\bmiqrasiya\s+mecelle"]),
    ("yol_hereketi", [r"yol\s+hereketi\s+haqqinda", r"avtoneqliyyat\s+hadise"]),
    ("istehlakci", [r"istehlakcilarin\s+huquq"]),
    ("cinayet", [r"\bcinayet\s+mecelle", r"cezadan\s+serti", r"cezacekme", r"azadliqdan\s+mehrum", r"qacaqmalciliq", r"xususi\s+ittiham", r"silah.*ogurlanm", r"tibbi\s+xarakterli\s+mecburi\s+tedbir"]),
    ("mulki", [r"\bmulki\s+mecelle", r"kommersiya\s+mubahise", r"emlakin\s+siyahidan", r"icbari\s+sigorta", r"ipoteka", r"borc\s+muqavile", r"vereselik", r"miras"]),
]

def detect_laws(text_norm: str) -> list[str]:
    found = []
    for law_id, patterns in LAW_PATTERNS:
        if any(re.search(pat, text_norm) for pat in patterns):
            found.append(law_id)
    return found

def extract_title_articles(title: str) -> list[str]:
    t = norm_az(title)
    arts = set()
    # Patterns like "36.9-cu maddəsinin", "32 və 36-cı maddələri", "1134, 1146 və 1252-ci maddə"
    for m in re.finditer(r"((?:\d+(?:\.\d+)*(?:-\d+)?(?:\s*,\s*|\s+ve\s+|\s+))*\d+(?:\.\d+)*(?:-\d+)?)(?:-c[iu]|-ci|-cu)?\s+madde", t):
        for num in re.findall(r"\d+(?:\.\d+)*(?:-\d+)?", m.group(1)):
            if not (1990 <= int(num.split(".")[0].split("-")[0]) <= 2035):
                arts.add(num)
    return sorted(arts)

def main():
    # Load bucket IDs from public/m/*.json
    bucket_map: dict[str, list[int]] = {}
    for p in glob.glob(str(PUBLIC_DIR / "m" / "*.json")):
        d = json.loads(Path(p).read_text(encoding="utf-8"))
        for did, meta in d.items():
            bucket_map[did] = meta.get("bs") or []

    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    # Identify active Supreme Court Plenum & Constitutional Court rulings (excluding amendment decrees)
    rows = conn.execute(
        """
        SELECT d.document_id, d.title, d.source_url,
               (SELECT GROUP_CONCAT(content, ' ') FROM (
                  SELECT content FROM chunks c WHERE c.document_id = d.document_id ORDER BY chunk_index ASC LIMIT 4
               )) AS head_text
        FROM documents d
        WHERE d.is_repealed = 0
          AND d.char_length >= 1200
        """
    ).fetchall()

    entries = []
    untagged = 0
    for r in rows:
        did = str(r["document_id"])
        title = str(r["title"] or "").strip()
        head = str(r["head_text"] or "")
        tn = norm_az(title)
        hn = norm_az(head[:2600])

        # Skip amendment / modification resolutions
        if "deyisiklikler edilm" in tn or "deyisiklik edilm" in tn or "elaveler edilm" in tn:
            continue

        is_plenum = (
            "ali mehkemesi plenumunun qerari" in hn[:1200]
            or "ali mehkemesinin plenumu" in hn[:1600]
            or ("mehkeme tecrubesi haqqinda" in tn and "ali mehkeme" in hn[:1600])
            or ("tetbiqi tecrubesi haqqinda" in tn and "ali mehkeme" in hn[:1600])
        )
        is_cc = (
            not is_plenum
            and (
                "konstitusiya mehkemesinin plenumu" in hn[:1600]
                or "konstitusiya mehkemesi adindan" in hn[:1200]
                or ("serh edilmesine dair" in tn and "konstitusiya mehkemesi" in hn[:1800])
                or ("uygunlugunun yoxlanilm" in tn and "konstitusiya mehkemesi" in hn[:1800])
            )
        )
        if not (is_plenum or is_cc):
            continue

        bs = bucket_map.get(did) or []
        if not bs:
            continue

        # Detect laws from title first, then fall back to full header/body text so zero rulings stay untagged!
        laws = detect_laws(tn)
        if not laws:
            laws = detect_laws(hn)
        if not laws:
            untagged += 1

        arts = extract_title_articles(title)
        entries.append({
            "id": did,
            "k": "plenum" if is_plenum else "cc",
            "t": title,
            "nt": tn,
            "laws": laws,
            "arts": arts,
            "bs": bs,
            "u": str(r["source_url"] or f"https://www.e-qanun.ai/results/{did}"),
        })

    conn.close()
    OUT_PATH.write_text(json.dumps(entries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Built {OUT_PATH.name}: {len(entries)} active rulings (untagged={untagged}, size={OUT_PATH.stat().st_size/1024:.1f}KB)")

if __name__ == "__main__":
    main()
