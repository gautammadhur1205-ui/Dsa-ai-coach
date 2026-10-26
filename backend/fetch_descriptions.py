"""
NeetCode 150 ke saare questions ka description LeetCode se nikaal ke JSON banata hai.

Use:
    python3 fetch_descriptions.py
Input : neetcode-150-list.json (isi folder mein)
Output: neetcode-150-with-descriptions.json

Sirf stdlib use hota hai, kuch install nahi karna.
Script resumable hai: beech mein ruk jaye to dobara chalao, jo ho chuka wo skip hoga.
"""
import json, re, time, os, html, ssl
import urllib.request
from html.parser import HTMLParser

INPUT = "neetcode-150-list.json"
OUTPUT = "neetcode-150-with-descriptions.json"
GRAPHQL = "https://leetcode.com/graphql"

QUERY = """query q($titleSlug: String!) {
  question(titleSlug: $titleSlug) { title content isPaidOnly }
}"""

# SSL context to bypass certificate verification errors on Mac/Linux
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


class HTMLToText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in ("br", "p", "li", "pre", "ul", "ol"):
            self.out.append("\n")
        if tag == "li":
            self.out.append("- ")

    def handle_data(self, data):
        self.out.append(data)

    def text(self):
        t = html.unescape("".join(self.out)).replace("\xa0", " ")
        return re.sub(r"\n{3,}", "\n\n", t).strip()


def to_text(h):
    p = HTMLToText()
    p.feed(h)
    return p.text()


def fetch(slug):
    body = json.dumps({"query": QUERY, "variables": {"titleSlug": slug}}).encode()
    req = urllib.request.Request(
        GRAPHQL, data=body,
        headers={
            "Content-Type": "application/json",
            "Referer": f"https://leetcode.com/problems/{slug}/",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=20) as r:
        return json.load(r)["data"]["question"]


def main():
    src = json.load(open(INPUT, encoding="utf-8"))
    done = {}
    if os.path.exists(OUTPUT):
        for item in json.load(open(OUTPUT, encoding="utf-8")):
            done[item["title"]] = item

    results, missing = [], []
    for category, problems in src.items():
        for title, info in problems.items():
            if title in done and done[title].get("description"):
                results.append(done[title])
                continue
            slug = info["url"].rstrip("/").split("/")[-1]
            entry = {
                "category": category,
                "title": title,
                "difficulty": info.get("difficulty"),
                "url": info["url"],
                "nurl": info.get("nurl"),
                "description": "",
                "description_html": "",
            }
            try:
                q = fetch(slug)
                if q and q.get("content"):
                    entry["description_html"] = q["content"]
                    entry["description"] = to_text(q["content"])
                else:
                    missing.append(title + (" (premium)" if q and q.get("isPaidOnly") else ""))
            except Exception as e:
                missing.append(f"{title} ({e})")
            results.append(entry)
            print(f"[{len(results)}/150] {title}")
            time.sleep(1)  # rate limit se bachne ke liye
            json.dump(results, open(OUTPUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    json.dump(results, open(OUTPUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"\nDone. Saved to {OUTPUT}")
    if missing:
        print("Ye questions ka description nahi mila (premium ya error):")
        for m in missing:
            print("  -", m)


if __name__ == "__main__":
    main()