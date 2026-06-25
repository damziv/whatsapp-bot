#!/usr/bin/env python3
"""
find_emails.py — extract contact emails from a list of photographer websites,
ready to upload into a cold-email tool (Instantly / Smartlead).

It does the LIST-BUILDING only. Do NOT use it to send mail — send through a
proper tool with inbox warmup and deliverability handling.

Setup:
    pip install requests beautifulsoup4

Usage:
    1) Put one website per line in urls.txt (get these from Google Maps,
       a wedding directory, Apollo, etc.). Example:
           anastudio.de
           https://markovphoto.hr
    2) Run:
           python3 find_emails.py urls.txt emails.csv

Output: emails.csv with columns: website, email

Compliance: only collect BUSINESS contact emails, email business addresses,
always include an unsubscribe line, keep volume measured, and respect GDPR /
each site's terms. You are responsible for how you use the list.
"""
import csv
import re
import sys
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
CONTACT_PATHS = ["", "contact", "contact-us", "kontakt", "about", "about-us", "impressum", "info"]
SKIP = (
    "example.com", "sentry", "wixpress", "@2x", "@3x", ".png", ".jpg", ".jpeg",
    ".gif", ".webp", ".svg", "your@email", "name@", "email@domain", "user@",
)
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; OutreachListBuilder/1.0)"}


def normalize(url: str):
    url = url.strip()
    if not url:
        return None
    if not url.startswith("http"):
        url = "https://" + url
    return url.rstrip("/")


def clean(found):
    out = set()
    for e in found:
        e = e.strip().lower().strip(".,;:()<>\"'")
        if not e or len(e) > 80:
            continue
        if any(s in e for s in SKIP):
            continue
        out.add(e)
    return out


def emails_from_html(html: str):
    found = set(EMAIL_RE.findall(html or ""))
    try:
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select('a[href^="mailto:"]'):
            addr = a.get("href", "")[7:].split("?")[0]
            if addr:
                found.add(addr)
    except Exception:
        pass
    return clean(found)


def fetch(url: str):
    try:
        r = requests.get(url, headers=HEADERS, timeout=12)
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
            return r.text
    except Exception:
        return None
    return None


def find_for_site(base: str):
    emails = set()
    for path in CONTACT_PATHS:
        html = fetch(urljoin(base + "/", path))
        if html:
            emails |= emails_from_html(html)
        if emails:  # stop once we've found at least one address
            break
        time.sleep(0.4)
    return emails


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 find_emails.py urls.txt [emails.csv]")
        sys.exit(1)

    infile = sys.argv[1]
    outfile = sys.argv[2] if len(sys.argv) > 2 else "emails.csv"

    with open(infile) as f:
        sites = [s for s in (normalize(line) for line in f if line.strip()) if s]

    rows = []
    for i, site in enumerate(sites, 1):
        emails = find_for_site(site)
        print(f"[{i}/{len(sites)}] {site} -> {', '.join(emails) if emails else '(none)'}")
        rows.extend((site, e) for e in emails)
        time.sleep(1)  # be polite

    with open(outfile, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["website", "email"])
        w.writerows(rows)

    print(f"\nDone. {len(rows)} emails from {len(sites)} sites -> {outfile}")


if __name__ == "__main__":
    main()
