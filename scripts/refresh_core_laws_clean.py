#!/usr/bin/env python3
"""
Refreshes the 49 most critical Azerbaijani Codes & Active Laws directly from
official public https://e-qanun.az/framework/<id> with 100% strikethrough-aware
DOM cleaning:
  - Whole repealed articles/sub-articles wrapped in <s>/<del>/<strike>/line-through
    have their repealed wording REMOVED and replaced with:
      "<prefix> [QÜVVƏDƏN DÜŞÜB — <repeal law from endnote>]"
  - Inline struck-through repealed words inside active sentences are REMOVED
    completely so only active in-force statutory wording remains.
  - Trailing amendment changelogs ("İSTİFADƏ OLUNMUŞ MƏNBƏ SƏNƏDLƏRİNİN SİYAHISI",
    "Əvvəlki redaksiyada deyilirdi:") and noisy [123] footnote links are stripped.
Writes clean .txt files directly into data/full_eqanun_corpus/ ready for
build_full_rag_index.py and build_static_rag.py.
"""

from __future__ import annotations

import asyncio
import glob
import json
import re
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT_DIR / "data" / "full_eqanun_corpus"
REPORT_PATH = ROOT_DIR / "data" / "core_refresh_report.json"

CORE_DOC_IDS = [
    # Constitution & All 20 Active Codes
    "897",    # Konstitusiya
    "46944",  # Mülki Məcəllə
    "46960",  # İnzibati Xətalar Məcəlləsi
    "46943",  # Əmək Məcəlləsi
    "46946",  # Ailə Məcəlləsi
    "46945",  # Mülki Prosessual Məcəllə
    "46947",  # Cinayət Məcəlləsi
    "46950",  # Cinayət-Prosessual Məcəllə
    "46948",  # Vergi Məcəlləsi
    "46956",  # İnzibati Prosessual Məcəllə
    "46955",  # Mənzil Məcəlləsi
    "46942",  # Torpaq Məcəlləsi
    "46957",  # Gömrük Məcəlləsi
    "46959",  # Miqrasiya Məcəlləsi
    "46958",  # Şəhərsalma və Tikinti Məcəlləsi
    "46953",  # Seçki Məcəlləsi
    "46951",  # Cəzaların İcrası Məcəlləsi
    "46940",  # Su Məcəlləsi
    "46941",  # Meşə Məcəlləsi
    "46952",  # Ticarət Gəmiçiliyi Məcəlləsi
    "56187",  # Rəqabət Məcəlləsi
    # 28 Most-Queried Active Laws
    "3423",   # Yol hərəkəti haqqında
    "9479",   # İstehlakçıların hüquqlarının müdafiəsi haqqında
    "41828",  # Mediasiya haqqında
    "11566",  # Əmək pensiyaları haqqında
    "11508",  # Sosial müavinətlər haqqında
    "22228",  # İcbari sığortalar haqqında
    "80",     # Tibbi sığorta haqqında
    "3813",   # Sosial sığorta haqqında
    "36310",  # İşsizlikdən sığorta haqqında
    "107",    # Notariat haqqında
    "1406",   # İcra haqqında
    "2860",   # Dövlət rüsumu haqqında
    "11254",  # İnzibati icraat haqqında
    "5825",   # Banklar haqqında
    "9902",   # İpoteka haqqında
    "5456",   # Daşınmaz əmlakın dövlət reyestri haqqında
    "31281",  # Vətəndaşların müraciətləri haqqında
    "19675",  # Fərdi məlumatlar haqqında
    "39846",  # Məşğulluq haqqında
    "4481",   # Dövlət qulluğu haqqında
    "23021",  # Hərbi vəzifə və hərbi xidmət haqqında
    "3933",   # Məhkəmələr və hakimlər haqqında
    "2937",   # Polis haqqında
    "257",    # Vəkillər və vəkillik fəaliyyəti haqqında
    "18343",  # Təhsil haqqında
    "30348",  # Reklam haqqında
    "10406",  # Elektron ticarət haqqında
    "7039",   # İcarə haqqında
    # Also check legacy pension law status
    "7739",   # Vətəndaşların pensiya təminatı haqqında (check if repealed!)
]

DOM_CLEAN_JS = r"""() => {
  // 1. Detect page-level repealed badge from official e-qanun.az header
  const fullHead = (document.body.innerText || '').slice(0, 1400);
  const pageTitle = (document.title || '').replace(/^[\s\-–]+/, '').trim();
  const statusRepealed = /qüvvədən\s+düşüb|qüvvədən\s+düşmüşdür|ləğv\s+edilmişdir/i.test(fullHead.slice(0, 500));

  // 2. Find main WordSection / document container (avoid top nav chrome)
  const container =
    document.querySelector('.WordSection1') ||
    document.querySelector('[class*="WordSection"]') ||
    document.querySelector('.document-content') ||
    document.querySelector('main') ||
    document.body;

  const root = container.cloneNode(true);

  // 3. Build endnote map BEFORE removing endnotes section: ednId -> concise text
  const endnoteMap = {};
  for (const edn of root.querySelectorAll('div[id^="edn"], p[id^="edn"]')) {
    const id = (edn.id || '').replace(/\D+/g, '');
    if (id) {
      endnoteMap[id] = (edn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 320);
    }
    edn.remove();
  }
  // Also scan a[name^="_edn"] not inside div[id^="edn"]
  for (const a of root.querySelectorAll('a[name^="_edn"]')) {
    const nm = a.getAttribute('name') || '';
    if (nm.startsWith('_ednref')) continue;
    const id = nm.replace(/\D+/g, '');
    const block = a.closest('p, div');
    if (id && block) {
      if (!endnoteMap[id]) {
        endnoteMap[id] = (block.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 320);
      }
      block.remove();
    }
  }

  // Remove any trailing "İSTİFADƏ OLUNMUŞ MƏNBƏ SƏNƏDLƏRİNİN SİYAHISI" / changelog divider & siblings
  const allBlocks = Array.from(root.querySelectorAll('p, div, h1, h2, h3, h4, hr'));
  let cutFromEl = null;
  for (let i = Math.floor(allBlocks.length * 0.35); i < allBlocks.length; i++) {
    const t = (allBlocks[i].textContent || '').replace(/\s+/g, ' ').trim();
    if (/^(?:İSTİFADƏ\s+OLUNMUŞ\s+MƏNBƏ\s+SƏNƏDLƏRİNİN\s+SİYAHISI|(?:QANUNA|MƏCƏLLƏYƏ|QƏRARA|FƏRMANA|AKTA)?\s*EDİLMİŞ\s+DƏYİŞİKLİK\s+VƏ\s+ƏLAVƏLƏRİN\s+SİYAHISI)/i.test(t)) {
      cutFromEl = allBlocks[i];
      break;
    }
  }
  if (cutFromEl) {
    let cur = cutFromEl;
    while (cur) {
      const next = cur.nextSibling;
      cur.remove();
      cur = next;
    }
  }

  // Remove scripts, styles, nav, buttons
  for (const bad of root.querySelectorAll('script, style, nav, button, header, footer')) {
    bad.remove();
  }

  // 4. Process ALL struck-through repealed elements (<s>, <del>, <strike>, style*="line-through")
  let wholeRepealedCount = 0;
  let inlineRepealedCount = 0;
  const repealedSamples = [];

  const isStruck = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') return true;
    const st = (el.getAttribute('style') || '').toLowerCase();
    return st.includes('line-through');
  };

  // First handle whole-paragraph repealed articles / clauses cleanly
  for (const p of Array.from(root.querySelectorAll('p, li'))) {
    const struckChildren = Array.from(p.querySelectorAll('s, del, strike, [style*="line-through"]'));
    if (struckChildren.length === 0 && !isStruck(p)) continue;

    // Extract footnote reference id (if present on this paragraph) for exact repeal law attribution
    let repealRefText = '';
    const refLinks = Array.from(p.querySelectorAll('a[href^="#_edn"], a[name^="_ednref"]'));
    for (const rl of refLinks) {
      const href = rl.getAttribute('href') || rl.getAttribute('name') || '';
      const id = href.replace(/\D+/g, '');
      if (id && endnoteMap[id]) {
        const note = endnoteMap[id];
        if (/ləğv\s+edil|çıxarıl|qüvvədən\s+düş/i.test(note)) {
          // Extract concise law date & number: e.g. "28 iyun 2024-cü il tarixli 1198-VIQD nömrəli Qanun"
          const dm = note.match(/(\d{1,2}\s+[a-zəöüğışç]+\s+\d{4}-c[iıuü]\s+il\s+tarixli\s+[\w\-\/]+\s+nömrəli[^()]{0,60}?Qanunu?)/i);
          repealRefText = dm ? `${dm[1].trim()} ilə ləğv edilib` : 'qanunla ləğv edilib';
          break;
        }
      }
    }

    // Clone paragraph without footnote links to compute struck-through ratio
    const pClone = p.cloneNode(true);
    for (const rl of pClone.querySelectorAll('a[href^="#_edn"], a[name^="_ednref"], sup')) rl.remove();
    const totalTxt = (pClone.textContent || '').replace(/\s+/g, ' ').trim();
    if (!totalTxt) {
      p.remove();
      continue;
    }

    let struckTxt = '';
    if (isStruck(pClone)) {
      struckTxt = totalTxt;
    } else {
      for (const sc of pClone.querySelectorAll('s, del, strike, [style*="line-through"]')) {
        // Avoid double-counting nested struck tags
        if (sc.parentElement && sc.parentElement.closest('s, del, strike, [style*="line-through"]')) continue;
        struckTxt += ' ' + (sc.textContent || '').replace(/\s+/g, ' ').trim();
      }
      struckTxt = struckTxt.trim();
    }

    const ratio = totalTxt.length > 0 ? struckTxt.length / totalTxt.length : 0;
    const prefixMatch = totalTxt.match(/^((?:Maddə\s+\d+(?:[\.\-]\d+)*\.?|\d+(?:-\d+)?(?:\.\d+(?:-\d+)?)*\.|[a-zəöüğışç]\)))/i);

    if (ratio >= 0.80) {
      wholeRepealedCount++;
      if (repealedSamples.length < 6) repealedSamples.push(totalTxt.slice(0, 120));
      if (prefixMatch) {
        const tag = repealRefText ? `[QÜVVƏDƏN DÜŞÜB — ${repealRefText}]` : '[QÜVVƏDƏN DÜŞÜB / LƏĞV EDİLİB]';
        p.textContent = `${prefixMatch[1]} ${tag}`;
      } else {
        // Continuation paragraph of a repealed clause -> remove completely
        p.remove();
      }
    }
  }

  // Remove all remaining inline struck-through words/phrases inside active sentences
  for (const sc of Array.from(root.querySelectorAll('s, del, strike, [style*="line-through"]'))) {
    const t = (sc.textContent || '').trim();
    if (t) inlineRepealedCount++;
    sc.remove();
  }

  // Remove noisy footnote link superscripts [373], [6], etc. (keep actual article text clean!)
  for (const rl of Array.from(root.querySelectorAll('a[href^="#_edn"], a[name^="_ednref"]'))) {
    rl.remove();
  }

  // 5. Extract structured lines cleanly from block elements
  const lines = [];
  const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR']);
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 1) {
      const hasChildBlocks = Array.from(node.children || []).some(c => blockTags.has(c.tagName));
      if (blockTags.has(node.tagName) && !hasChildBlocks) {
        const txt = (node.textContent || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\u200b/g, '')
          .replace(/[ \t]+/g, ' ')
          .trim();
        if (txt) lines.push(txt);
        return;
      }
      for (const child of node.childNodes) walk(child);
    }
  };
  walk(root);

  return {
    pageTitle,
    statusRepealed,
    wholeRepealedCount,
    inlineRepealedCount,
    repealedSamples,
    text: lines.join('\n'),
  };
}"""


def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = clean.replace(" ", "_")
    return clean[:60]


def strip_nav_prefix(text: str) -> str:
    """Drop leading e-qanun.az UI menu lines ('Mətn', 'Şəkil', 'Rekvizitlər', 'Versiyalar', 'Əlaqəli Sənədlər')."""
    lines = text.splitlines()
    nav_words = {"Mətn", "Şəkil", "Rekvizitlər", "Versiyalar", "Əlaqəli Sənədlər", "Çap et", "Yüklə"}
    start = 0
    for i in range(min(15, len(lines))):
        if lines[i].strip() in nav_words:
            start = i + 1
    return "\n".join(lines[start:]).strip()


async def fetch_one(sem: asyncio.Semaphore, context, doc_id: str) -> dict:
    async with sem:
        t0 = time.perf_counter()
        last_err = ""
        for attempt in range(3):
            page = await context.new_page()
            try:
                url = f"https://e-qanun.az/framework/{doc_id}"
                await page.goto(url, wait_until="domcontentloaded", timeout=50000)
                await page.wait_for_function(
                    "() => document.title && document.title.trim() !== 'E-QANUN' && (document.body?.innerText || '').length > 2200",
                    timeout=35000,
                )
                await page.wait_for_timeout(1200)

                res = await page.evaluate(DOM_CLEAN_JS)
                clean_body = strip_nav_prefix(res.get("text") or "")
                title = (res.get("pageTitle") or "").strip()

                if len(clean_body) < 1800 or not title or title.upper() == "E-QANUN":
                    last_err = f"incomplete_hydration (len={len(clean_body)}, title={title!r})"
                    await page.close()
                    await asyncio.sleep(1.5)
                    continue

                # Find existing corpus file to preserve exact filename (or create new one)
                existing = glob.glob(str(CORPUS_DIR / f"eqanun_doc_{doc_id}_*.txt"))
                if not existing:
                    exact_file = CORPUS_DIR / f"eqanun_doc_{doc_id}.txt"
                    if exact_file.exists():
                        existing = [str(exact_file)]

                if existing:
                    out_path = Path(existing[0])
                else:
                    out_path = CORPUS_DIR / f"eqanun_doc_{doc_id}_{sanitize_filename(title)}.txt"

                if res.get("statusRepealed") and "QÜVVƏDƏN DÜŞÜB" not in title.upper():
                    title = f"{title} (QÜVVƏDƏN DÜŞÜB)"

                header = (
                    f"SƏNƏDİN ADI: {title}\n"
                    f"MƏNBƏ: e-qanun.az (ID: {doc_id})\n"
                    f"URL: https://www.e-qanun.ai/results/{doc_id}\n\n"
                )
                out_path.write_text(header + clean_body, encoding="utf-8")

                elapsed = round(time.perf_counter() - t0, 1)
                print(
                    f"  [OK] {doc_id:>5} | {elapsed:>4.1f}s | chars={len(clean_body):>7} | "
                    f"whole_rep={res['wholeRepealedCount']:>3} | inline_rep={res['inlineRepealedCount']:>3} | "
                    f"repealed_doc={res['statusRepealed']} | {title[:55]}",
                    flush=True,
                )
                await page.close()
                return {
                    "doc_id": doc_id,
                    "ok": True,
                    "title": title,
                    "chars": len(clean_body),
                    "whole_repealed": res["wholeRepealedCount"],
                    "inline_repealed": res["inlineRepealedCount"],
                    "status_repealed": res["statusRepealed"],
                    "samples": res["repealedSamples"],
                    "file": out_path.name,
                }
            except Exception as e:
                last_err = str(e)
                await page.close()
                await asyncio.sleep(1.5)
        print(f"  [ERR] {doc_id}: {last_err}", flush=True)
        return {"doc_id": doc_id, "ok": False, "error": last_err}


async def main():
    t0 = time.perf_counter()
    print(f"Refreshing {len(CORE_DOC_IDS)} core Azerbaijani Codes & Laws from official e-qanun.az (strikethrough-purged)...", flush=True)
    sem = asyncio.Semaphore(3)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
        # Block images/fonts/stylesheets? Keep stylesheets? Actually inline <s>/<del>/style*="line-through" needs NO external CSS/images/fonts!
        await context.route(
            "**/*",
            lambda route: route.abort()
            if route.request.resource_type in ("image", "media", "font")
            else route.continue_(),
        )
        results = await asyncio.gather(*(fetch_one(sem, context, did) for did in CORE_DOC_IDS))
        await browser.close()

    ok_cnt = sum(1 for r in results if r.get("ok"))
    tot_whole = sum(r.get("whole_repealed", 0) for r in results if r.get("ok"))
    tot_inline = sum(r.get("inline_repealed", 0) for r in results if r.get("ok"))
    REPORT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"\nDONE in {time.perf_counter()-t0:.1f}s: {ok_cnt}/{len(CORE_DOC_IDS)} refreshed | "
        f"whole_repealed_purged={tot_whole} | inline_struck_purged={tot_inline}",
        flush=True,
    )
    if ok_cnt < len(CORE_DOC_IDS) - 3:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
