#!/usr/bin/env python3
"""
Full 56,983-Document Azerbaijani Legal Corpus Indexer.
Reads all .txt files from data/full_eqanun_corpus/, cleans HTML spacing/linebreaks,
extracts articles (Maddə) & metadata, chunks with overlap, and builds a high-speed
SQLite FTS5 + normalized Azerbaijani search database at data/eqanun_full.sqlite.
"""

import glob
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT_DIR / "data" / "full_eqanun_corpus"
DB_PATH = ROOT_DIR / "data" / "eqanun_full.sqlite"
TMP_DB_PATH = ROOT_DIR / "data" / "eqanun_full.sqlite.tmp"

DIAC_SET = set("əıöüğçşƏIÖÜĞÇŞİ")
PRIMARY_CODE_IDS = {
    "897",    # Konstitusiya
    "46940",  # Su Məcəlləsi
    "46941",  # Meşə Məcəlləsi
    "46942",  # Torpaq Məcəlləsi
    "46943",  # Əmək Məcəlləsi
    "46944",  # Mülki Məcəllə
    "46945",  # Mülki Prosessual Məcəllə
    "46946",  # Ailə Məcəlləsi
    "46947",  # Cinayət Məcəlləsi
    "46948",  # Vergi Məcəlləsi
    "46950",  # Cinayət-Prosessual Məcəllə
    "46951",  # Cəzaların İcrası Məcəlləsi
    "46952",  # Ticarət Gəmiçiliyi Məcəlləsi
    "46953",  # Seçki Məcəlləsi
    "46955",  # Mənzil Məcəlləsi
    "46956",  # İnzibati Prosessual Məcəllə
    "46957",  # Gömrük Məcəlləsi
    "46958",  # Şəhərsalma və Tikinti Məcəlləsi
    "46959",  # Miqrasiya Məcəlləsi
    "46960",  # İnzibati Xətalar Məcəlləsi
    "3423",   # Yol hərəkəti haqqında
    "9479",   # İstehlakçıların hüquqlarının müdafiəsi haqqında
    "3933",   # Məhkəmələr və hakimlər haqqında
    "18343",  # Təhsil haqqında
    "2937",   # Polis haqqında
    "257",    # Vəkillər və vəkillik fəaliyyəti haqqında
}

STOP_WORDS_AZ = {
    "və", "bu", "o", "ki", "da", "də", "nə", "ya", "həm", "hər", "bir",
    "ilə", "üçün", "olan", "ola", "isə", "üzrə", "görə", "kimi", "belə",
    "daha", "çox", "az", "ən", "heç", "var", "yox", "öz", "şu", "üç",
}

AZ_TRANS = str.maketrans({
    "İ": "i", "I": "i", "ı": "i",
    "Ə": "e", "ə": "e",
    "Ö": "o", "ö": "o",
    "Ü": "u", "ü": "u",
    "Ğ": "g", "ğ": "g",
    "Ş": "s", "ş": "s",
    "Ç": "c", "ç": "c",
})

ISO_DIAC_RE = re.compile(r"(?:^|\s)[əıöüğçşƏIÖÜĞÇŞİ]{1,2}(?:\s|$)")
AZ_VALID_SHORT = {
    "bu", "və", "ki", "da", "də", "ya", "nə", "o", "az", "ən", "öz",
    "su", "iş", "ev", "ad", "il", "ol", "et", "əl", "at", "ay", "üç",
    "on", "be", "de", "is", "in", "an", "al",
}
NON_ASCII_VOWELS = set("əıöüƏÖÜ")
ALL_VOWELS_LOWER = set("aəeiıoöuü")

ARTICLE_HEADER_RE = re.compile(
    r"^(?:=== )?(?:Madd[əe]|MADD[ƏE])\s*([0-9]+(?:[\.\-][0-9]+)*)(?:\s*[\.\-–—:]+\s*(.*))?$"
    r"|^([0-9]+(?:[\.\-][0-9]+)*)\s*[-–.]\s*ci\s+madd[əe](?:\s*[\.\-–—:]+\s*(.*))?$",
    re.IGNORECASE,
)
CHAPTER_RE = re.compile(r"^(?:Fəsil|FƏSİL|Bölmə|BÖLMƏ|Xüsusi hissə|Ümumi hissə|[IVXLCDM]+\s+fəsil)\b", re.IGNORECASE)
STRUCT_LINE_RE = re.compile(r"^(?:Madd[əe]\s*\d|Fəsil\s|Bölmə\s|\d+[\.\)]\s|\d+\.\d+[\.\)]\s|[a-zəöüğçş]\)\s|[-–•])", re.IGNORECASE)
CHANGELOG_MARKER_RE = re.compile(
    r"(?:^|\n)\s*(?:İSTİFADƏ\s+OLUNMUŞ\s+MƏNBƏ\s+SƏNƏDLƏRİNİN\s+SİYAHISI|"
    r"(?:QANUNA|QƏRARA|FƏRMANA|MƏCƏLLƏYƏ|AKTA)?\s*EDİLMİŞ\s+DƏYİŞİKLİK\s+VƏ\s+ƏLAVƏLƏRİN\s+SİYAHISI)",
    re.IGNORECASE,
)


def normalize_az(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\u04d9", "ə").replace("\u04d8", "Ə")
    return re.sub(r"\s+", " ", text.translate(AZ_TRANS).lower()).strip()


def clean_article_title(raw_title: str) -> str:
    t = re.sub(r"(?:\s*===+|\s*KMQ\d+|\s*\[\d+\])+", "", raw_title or "").strip()
    t = re.sub(r"\s+", " ", t).strip(" .-–—")
    if len(t) > 160:
        sp = t.rfind(" ", 80, 160)
        t = t[: (sp if sp > 80 else 160)].strip()
    return t


def _is_iso_diac(tok: str) -> bool:
    core = tok.rstrip(".,;:!?)\"»”")
    return bool(core) and len(core) <= 2 and all(c in DIAC_SET for c in core)


def repair_spaced_diacritics(text: str) -> str:
    """Repair e-qanun HTML <span> splits around Azerbaijani diacritics & spaced headings."""
    text = (
        text.replace("\u04d9", "ə")
        .replace("\u04d8", "Ə")
        .replace("\u00a0", " ")
        .replace("\u200b", "")
        .replace("\ufeff", "")
    )
    text = re.sub(r"\b[Mm]\s+[Aa]\s*[Dd]\s*[Dd]\s*[ƏəEe]\b", "Maddə", text)
    text = re.sub(r"\b[Mm]\s*[Aa]\s+[Dd]\s*[Dd]\s*[ƏəEe]\b", "Maddə", text)
    text = re.sub(r"\b[Mm]\s*[Aa]\s*[Dd]\s+[Dd]\s*[ƏəEe]\b", "Maddə", text)
    text = re.sub(r"\b[Ff]\s+[Əə]\s*[Ss]\s*[İiI]\s*[Ll]\b", "Fəsil", text)
    text = re.sub(r"\b[Bb]\s+[Öö]\s*[Ll]\s*[Mm]\s*[Əə]\b", "Bölmə", text)
    text = re.sub(r"\bAz\s+[əe]\s+rbaycan\b", "Azərbaycan", text)
    text = re.sub(r"\bRespublikas\s+[ıi]\s+n\s*[ıi]\s*n\b", "Respublikasının", text)

    lines = text.split("\n")
    out = []
    for line in lines:
        if not ISO_DIAC_RE.search(line) and " " not in line:
            out.append(line)
            continue
        toks = line.split(" ")
        p1 = []
        i = 0
        n = len(toks)
        while i < n:
            t = toks[i]
            if not t:
                i += 1
                continue
            t_core = t.rstrip(".,;:!?)\"»”")
            if p1 and _is_iso_diac(t) and p1[-1].isalpha() and p1[-1].lower() not in STOP_WORDS_AZ:
                prev = p1[-1]
                # Avoid pulling a word-initial vowel diacritic (e.g. "aşağıdakı ə sas" -> "əsas") onto previous complete word
                if (
                    len(prev) >= 4
                    and prev[-1].lower() in ALL_VOWELS_LOWER
                    and t_core
                    and t_core[0] in NON_ASCII_VOWELS
                    and i + 1 < n
                    and toks[i + 1][:1].isalpha()
                ):
                    p1.append(t + toks[i + 1])
                    i += 2
                    continue
                p1[-1] = prev + t
                i += 1
                if i < n:
                    nxt = toks[i]
                    nxt_c = nxt.rstrip(".,;:!?)\"»”")
                    nxt_is_new_broken = (len(nxt_c) == 1 and i + 1 < n and _is_iso_diac(toks[i + 1]))
                    if (
                        nxt_c.isalpha()
                        and nxt_c.lower() not in STOP_WORDS_AZ
                        and not nxt_is_new_broken
                        and (len(nxt_c) <= 3 or (i + 1 < n and _is_iso_diac(toks[i + 1])))
                    ):
                        p1[-1] = p1[-1] + nxt
                        i += 1
                continue
            # Also repair 2-char CV syllable fragments ending in non-ASCII vowel ("hü quqlarının" -> "hüquqlarının")
            if (
                len(t_core) == 2
                and t == t_core
                and t_core.lower() not in AZ_VALID_SHORT
                and t_core[1] in set("əıöü")
                and i + 1 < n
                and toks[i + 1][:1].isalpha()
                and toks[i + 1][:1].islower()
            ):
                if p1 and p1[-1].isalpha() and len(p1[-1]) >= 4 and len(toks[i + 1]) <= 3:
                    p1[-1] = p1[-1] + t
                else:
                    p1.append(t + toks[i + 1])
                    i += 2
                    continue
            p1.append(t)
            i += 1
        out.append(" ".join(p1))
    return "\n".join(out)


def unwrap_soft_newlines(body: str) -> str:
    """Rejoin split article headers (`Maddə\\n5.`) & artificial mid-sentence wraps while preserving article structure."""
    pre = body.replace("\r\n", "\n")
    # Join split "Maddə\n5." / "Fəsil\n2." / "Bölmə\n1."
    pre = re.sub(r"(?im)^((?:=== )?(?:Madd[əe]|Fəsil|Bölmə))\s*\n+\s*(\d+)", r"\1 \2", pre)
    # Put inline chapter-to-article headers like "ÜMUMİ MÜDDƏALAR Maddə 1. Əsas anlayışlar" on their own line
    pre = re.sub(r"([^\n])\s+(Madd[əe]\s+\d+(?:[\.\-]\d+)*\.\s+[A-ZƏIÖÜĞÇŞ])", r"\1\n\2", pre)

    raw_lines = [re.sub(r"[ \t]+", " ", l).strip() for l in pre.split("\n")]
    out_lines = []
    buf = ""
    for line in raw_lines:
        if not line:
            if buf:
                out_lines.append(buf)
                buf = ""
            continue
        if STRUCT_LINE_RE.match(line) or CHAPTER_RE.match(line):
            if buf:
                out_lines.append(buf)
            buf = line
            continue
        if not buf:
            buf = line
        elif buf.endswith((".", "!", "?", ";", ":", "”", "»", ")")) and len(line) > 0 and line[0].isupper() and not STRUCT_LINE_RE.match(line):
            out_lines.append(buf)
            buf = line
        else:
            if buf.endswith("-") and len(buf) > 1 and buf[-2].isalpha():
                buf = buf[:-1] + line
            else:
                buf = buf + " " + line
    if buf:
        out_lines.append(buf)
    return "\n".join(out_lines)


def find_trailing_changelog_start(text: str):
    """Finds the start offset of the trailing amendment/source-list footer without truncating TOC links."""
    if not text:
        return None
    min_offset = max(250, int(len(text) * 0.40))
    for m in CHANGELOG_MARKER_RE.finditer(text):
        if m.start() < min_offset:
            continue
        tail_preview = text[m.end():m.end() + 250]
        if re.match(r"^\s*(?:ÜMUMİ\s+HİSSƏ|XÜSUSİ\s+HİSSƏ|FƏSİLLƏR|BÖLMƏLƏR|Maddə\s+1\b)", tail_preview, re.IGNORECASE):
            continue
        return m.start()
    return None


def classify_document(doc_id: str, title: str, full_body_raw: str):
    t_norm = normalize_az(title)
    body_norm = normalize_az(full_body_raw)
    head_norm = body_norm[:900]

    # 1. Detect repealed acts from title, top header, USSR/SSR header, or footnote [1]
    is_repealed = 1 if (
        "quvveden dusub" in t_norm
        or "quvveden dusmus" in t_norm
        or "quvvesini itirmis" in t_norm
        or "legv edilmisdir" in t_norm
        or "quvveden dusub" in head_norm[:250]
        or "quvveden dusmusdur" in head_norm[:250]
        or "sovet sosialist" in head_norm[:350]
        or "azerbaycan ssr" in head_norm[:350]
    ) else 0

    if not is_repealed and doc_id not in PRIMARY_CODE_IDS and "[1]" in head_norm[:600]:
        ch_start = find_trailing_changelog_start(full_body_raw)
        if ch_start is not None:
            notes_norm = normalize_az(full_body_raw[ch_start:ch_start + 2500])
            m1 = re.search(r"\[1\]\s*(.*?)(?=\s*\[\d+\]|\Z)", notes_norm)
            if m1:
                n1_no_paren = re.sub(r"\([^)]*\)", " ", m1.group(1))
                if (
                    "legv edilmis" in n1_no_paren
                    or "quvveden dusmus" in n1_no_paren
                    or "quvveden dusub" in n1_no_paren
                    or "quvvesini itirmis" in n1_no_paren
                ) and not re.search(
                    r"\b(?:madde|maddesinde|maddesinin|maddeleri|bend|hisse|abzas|cumle|adinda|sozler|elave edil|preambula|basliq|esasname)\b",
                    n1_no_paren,
                ):
                    is_repealed = 1

    # 2. Detect amendments, implementation orders, and Constitutional/Plenum interpretations
    is_amendment = 1 if (
        "deyisiklik edilm" in t_norm
        or "deyisiklikler edilm" in t_norm
        or "elave edilm" in t_norm
        or "elaveler edilm" in t_norm
        or "deyisiklikler ve elaveler" in t_norm
    ) else 0

    is_implementation = 1 if (
        "tetbiq edilm" in t_norm
        or "tetbiqi barede" in t_norm
        or "tetbiqi haqqinda" in t_norm
        or "tetbiqi ile elaqedar" in t_norm
    ) else 0

    is_interpretation_or_ruling = (
        "serh edilm" in t_norm
        or "serhi haqqinda" in t_norm
        or "uygunlugunun yoxlanilm" in t_norm
        or "uygunluguna dair" in t_norm
        or "sikayeti uzre" in t_norm
        or "maddesinin" in t_norm
        or "maddelerinin" in t_norm
        or "mecellesinin" in t_norm
        or "konstitusiyasinin" in t_norm
        or "qanununun" in t_norm
    )

    is_international = any(
        k in t_norm
        for k in ("konvensiya", "sazis", "muqavile", "protokol", "memorandum", "beynelxalq", "respublikasi hokumeti")
    )

    is_subsidiary_title = any(
        k in t_norm
        for k in (
            "fermani",
            "serencami",
            "qerari",
            "tesdiq edilm",
            "qaydasi",
            "qaydalari",
            "esasname",
            "telimat",
            "blank",
            "formasi",
            "siyahisi",
        )
    )

    if doc_id == "897":
        doc_type = "konstitusiya"
    elif doc_id in PRIMARY_CODE_IDS:
        doc_type = "kodeks" if "mecellesi" in t_norm else "qanun"
    elif is_interpretation_or_ruling:
        doc_type = "qerar"
    elif "mecellesi" in t_norm and not is_amendment and not is_implementation and not is_subsidiary_title:
        doc_type = "kodeks"
    elif is_international and ("tesdiq edilm" in t_norm or "qosulma" in t_norm):
        doc_type = "beynelxalq"
    elif (
        not is_amendment
        and not is_implementation
        and not is_subsidiary_title
        and not is_international
        and (
            "qanunu" in t_norm
            or "haqqinda qanun" in t_norm
            or "azerbaycan respublikasinin qanunu" in head_norm[:600]
        )
    ):
        doc_type = "qanun"
    elif "fermani" in t_norm:
        doc_type = "ferman"
    elif "serencami" in t_norm:
        doc_type = "serencam"
    elif "qerari" in t_norm or "tesdiq edilm" in t_norm:
        doc_type = "qerar"
    elif is_international:
        doc_type = "beynelxalq"
    else:
        doc_type = "diger"

    # Compute ranking prior boost
    boost = 0.0
    if doc_id in PRIMARY_CODE_IDS:
        boost += 120.0
    elif doc_type == "konstitusiya":
        boost += 115.0
    elif doc_type == "kodeks":
        boost += 105.0
    elif doc_type == "qanun":
        boost += 95.0
    elif doc_type in ("qerar", "ferman"):
        boost += 25.0
    elif doc_type == "beynelxalq":
        boost += 15.0
    elif doc_type == "serencam":
        boost += 5.0

    if is_interpretation_or_ruling:
        boost -= 25.0
    if is_implementation:
        boost -= 40.0
    if is_amendment:
        boost -= 65.0
    if is_repealed:
        boost -= 220.0

    return doc_type, is_repealed, boost


def split_chunks_for_doc(doc_id: str, title: str, body: str, max_chars: int = 1600, overlap: int = 180):
    lines = body.split("\n")
    sections = []
    cur_art_num = ""
    cur_art_title = ""
    cur_lines = []

    for line in lines:
        m = ARTICLE_HEADER_RE.match(line)
        if m:
            if cur_lines:
                sections.append((cur_art_num, cur_art_title, "\n".join(cur_lines).strip()))
            art_num = (m.group(1) or m.group(3) or "").replace("-", ".").strip(".")
            art_title = clean_article_title(m.group(2) or m.group(4) or "")
            cur_art_num = art_num
            cur_art_title = art_title
            cur_lines = [line]
        else:
            cur_lines.append(line)

    if cur_lines:
        sections.append((cur_art_num, cur_art_title, "\n".join(cur_lines).strip()))

    chunks = []
    # Merge consecutive tiny non-article sections or keep each article cleanly bounded
    pending_num = ""
    pending_title = ""
    pending_text = ""

    def emit_section(art_num: str, art_title: str, text: str):
        if not text:
            return
        if len(text) <= max_chars:
            chunks.append((art_num, art_title, text))
            return
        # Split long article/section cleanly along paragraph/line/sentence boundaries
        paras = text.split("\n")
        buf = ""
        header_prefix = f"Maddə {art_num}. {art_title}\n" if art_num else ""
        for p in paras:
            if not p.strip():
                continue
            if len(buf) + len(p) + 1 <= max_chars:
                buf = (buf + "\n" + p).strip()
            else:
                if buf:
                    chunks.append((art_num, art_title, buf))
                    tail = buf[-overlap:] if len(buf) > overlap else ""
                    buf = (header_prefix + tail + "\n" + p).strip() if len(p) < max_chars else ""
                if len(p) > max_chars:
                    # Hard split very long unbroken paragraph by sentence/word
                    start = 0
                    while start < len(p):
                        end = min(len(p), start + max_chars)
                        if end < len(p):
                            sp = p.rfind(" ", start + max_chars // 2, end)
                            if sp > start:
                                end = sp
                        part = p[start:end].strip()
                        if part:
                            chunks.append((art_num, art_title, (header_prefix + part).strip() if chunks else part))
                        if end >= len(p):
                            break
                        start = max(start + 1, end - overlap)
                    buf = ""
                elif not buf:
                    buf = (header_prefix + p).strip()
        if buf:
            chunks.append((art_num, art_title, buf))

    for art_num, art_title, sec_text in sections:
        if not sec_text or len(sec_text) < 10:
            continue
        if not art_num and not pending_num and len(pending_text) + len(sec_text) < 1100:
            pending_text = (pending_text + "\n" + sec_text).strip()
            continue
        if pending_text:
            emit_section(pending_num, pending_title, pending_text)
            pending_text = ""
        if not art_num and len(sec_text) < 900:
            pending_num = art_num
            pending_title = art_title
            pending_text = sec_text
        else:
            emit_section(art_num, art_title, sec_text)

    if pending_text:
        emit_section(pending_num, pending_title, pending_text)

    if not chunks and body.strip():
        chunks.append(("", title[:120], body.strip()[:max_chars]))

    return chunks


def parse_file(filepath: Path):
    raw = filepath.read_text(encoding="utf-8", errors="replace")
    fname = filepath.name
    id_match = re.match(r"eqanun_doc_(\d+)_", fname) or re.search(r"MƏNBƏ:\s*e-qanun\.az\s*\(ID:\s*(\d+)\)", raw)
    doc_id = id_match.group(1) if id_match else fname.replace(".txt", "")

    title = ""
    lines = raw.splitlines()
    body_start_idx = 0
    for idx, line in enumerate(lines[:10]):
        s = line.strip()
        if s.startswith("SƏNƏDİN ADI:"):
            title = s[len("SƏNƏDİN ADI:"):].strip()
            body_start_idx = max(body_start_idx, idx + 1)
        elif s.startswith("MƏNBƏ:") or s.startswith("URL:"):
            body_start_idx = max(body_start_idx, idx + 1)
        elif idx == body_start_idx and not s:
            body_start_idx = idx + 1

    body_raw = "\n".join(lines[body_start_idx:]).strip()
    if not title:
        for l in body_raw.splitlines():
            if l.strip():
                title = l.strip()[:250]
                break
        if not title:
            title = f"e-Qanun Sənədi № {doc_id}"

    body_clean = repair_spaced_diacritics(body_raw)
    body_clean = unwrap_soft_newlines(body_clean)
    title_clean = re.sub(r"\s*\[\d+\]\s*$", "", repair_spaced_diacritics(title)).strip()
    doc_type, is_repealed, boost = classify_document(doc_id, title_clean, body_clean)

    # Strip trailing historical amendment-changelog footnotes from operative text so BM25 indexes current articles cleanly
    ch_start = find_trailing_changelog_start(body_clean)
    if ch_start is not None:
        body_clean = body_clean[:ch_start].strip()

    chunks = split_chunks_for_doc(doc_id, title_clean, body_clean)
    article_count = len({c[0] for c in chunks if c[0]})
    if doc_type == "qanun" and article_count >= 10 and not is_repealed:
        boost += 10.0

    return {
        "document_id": doc_id,
        "title": title_clean,
        "title_norm": normalize_az(title_clean),
        "source_url": f"https://www.e-qanun.ai/results/{doc_id}",
        "file_name": fname,
        "doc_type": doc_type,
        "is_repealed": is_repealed,
        "priority_boost": boost,
        "char_length": len(body_clean),
        "article_count": article_count,
        "chunks": chunks,
    }


def main():
    t0 = time.time()
    files = sorted(Path(p) for p in glob.glob(str(CORPUS_DIR / "*.txt")))
    total = len(files)
    if total == 0:
        print(f"ERROR: No .txt files found in {CORPUS_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"Indexing {total} full legal documents from {CORPUS_DIR} -> {DB_PATH} ...", flush=True)
    if TMP_DB_PATH.exists():
        TMP_DB_PATH.unlink()

    conn = sqlite3.connect(str(TMP_DB_PATH))
    conn.execute("PRAGMA journal_mode = OFF;")
    conn.execute("PRAGMA synchronous = OFF;")
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.execute("PRAGMA cache_size = -131072;")  # 128 MB cache

    conn.executescript("""
        CREATE TABLE documents (
            document_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            title_norm TEXT NOT NULL,
            source_url TEXT NOT NULL,
            file_name TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            is_repealed INTEGER NOT NULL DEFAULT 0,
            priority_boost REAL NOT NULL DEFAULT 0.0,
            char_length INTEGER NOT NULL DEFAULT 0,
            article_count INTEGER NOT NULL DEFAULT 0,
            chunk_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            article_number TEXT NOT NULL DEFAULT '',
            article_title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL
        );

        CREATE INDEX idx_documents_type ON documents(doc_type, is_repealed);
        CREATE INDEX idx_chunks_doc_art ON chunks(document_id, article_number, chunk_index);

        CREATE VIRTUAL TABLE chunks_fts USING fts5(
            title_norm,
            article_number,
            article_title_norm,
            content_norm,
            content = '',
            tokenize = 'unicode61 remove_diacritics 0'
        );
    """)

    doc_rows = []
    chunk_rows = []
    fts_rows = []
    chunk_id = 0
    total_chunks = 0

    for idx, fp in enumerate(files, 1):
        parsed = parse_file(fp)
        doc_id = parsed["document_id"]
        title_norm = parsed["title_norm"]
        chunks = parsed["chunks"]

        doc_rows.append((
            doc_id,
            parsed["title"],
            title_norm,
            parsed["source_url"],
            parsed["file_name"],
            parsed["doc_type"],
            parsed["is_repealed"],
            parsed["priority_boost"],
            parsed["char_length"],
            parsed["article_count"],
            len(chunks),
        ))

        for c_idx, (art_num, art_title, content) in enumerate(chunks):
            chunk_id += 1
            total_chunks += 1
            art_title_norm = normalize_az(art_title)
            content_norm = normalize_az(content)
            chunk_rows.append((chunk_id, doc_id, c_idx, art_num, art_title, content))
            fts_rows.append((chunk_id, title_norm, art_num, art_title_norm, content_norm))

        if len(doc_rows) >= 5000 or idx == total:
            conn.executemany(
                "INSERT OR REPLACE INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                doc_rows,
            )
            conn.executemany(
                "INSERT INTO chunks (id, document_id, chunk_index, article_number, article_title, content) VALUES (?, ?, ?, ?, ?, ?)",
                chunk_rows,
            )
            conn.executemany(
                "INSERT INTO chunks_fts (rowid, title_norm, article_number, article_title_norm, content_norm) VALUES (?, ?, ?, ?, ?)",
                fts_rows,
            )
            conn.commit()
            doc_rows.clear()
            chunk_rows.clear()
            fts_rows.clear()
            if idx % 10000 == 0 or idx == total:
                elapsed = time.time() - t0
                print(f"  [{idx}/{total}] chunks={total_chunks} elapsed={elapsed:.1f}s", flush=True)

    print("Optimizing FTS5 index...", flush=True)
    try:
        conn.execute("INSERT INTO chunks_fts(chunks_fts) VALUES('optimize');")
    except sqlite3.OperationalError as opt_err:
        print(f"Skipping FTS5 optimize ({opt_err}) — continuing cleanly", flush=True)
    conn.execute("PRAGMA journal_mode = DELETE;")
    conn.commit()
    conn.close()

    if DB_PATH.exists():
        DB_PATH.unlink()
    TMP_DB_PATH.rename(DB_PATH)
    size_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"DONE! Indexed {total} docs, {total_chunks} chunks into {DB_PATH} ({size_mb:.1f} MB) in {time.time()-t0:.1f}s", flush=True)


if __name__ == "__main__":
    main()
