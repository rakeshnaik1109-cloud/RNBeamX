#!/usr/bin/env python3
"""
Rebuild dist/rnbeamx-standalone.html from the modular source.

The single-file build lets a collaborator, reviewer or student open
RNBeamX from one attachment, offline. Run after changing css/ or js/:

    python3 build-standalone.py
"""
import os
import re
import time

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Stamp every css/js link with ?v=<build time> so browsers fetch fresh
# files after an update (GitHub Pages caches aggressively).
build_id = time.strftime('%Y%m%d%H%M', time.gmtime())
page = open('index.html', encoding='utf-8').read()
page = re.sub(r'((?:src|href)="(?:css|js)/[^"?]+)(?:\?v=[^"]*)?"', lambda m: '%s?v=%s"' % (m.group(1), build_id), page)
open('index.html', 'w', encoding='utf-8').write(page)


def inline_css(m):
    return '<style>\n/* %s */\n%s\n</style>' % (m.group(1), open(m.group(1), encoding='utf-8').read())


def inline_js(m):
    return '<script>\n/* %s */\n%s\n</script>' % (m.group(1), open(m.group(1), encoding='utf-8').read().replace('</script', '<\\/script'))


src = re.sub(r'<link href="(css/[^"?]+)(?:\?v=[^"]*)?" rel="stylesheet"/>', inline_css, page)
src = re.sub(r'<script src="(js/[^"?]+)(?:\?v=[^"]*)?"></script>', inline_js, src)
# the PDF libraries are loaded on demand from js/vendor/ normally; inline them here
vendor = ''.join(inline_js(re.match(r'(.*)', 'js/vendor/' + f)) for f in ('jspdf.umd.min.js', 'svg2pdf.umd.min.js'))
src = src.replace('</body>', vendor + '\n</body>')
fav = open('assets/favicon.svg', encoding='utf-8').read()
import base64
src = src.replace('href="assets/favicon.svg"', 'href="data:image/svg+xml;base64,%s"' % base64.b64encode(fav.encode()).decode())

# the standalone file lives anywhere, so the guide link points to the live site
live = 'https://rakeshnaik1109-cloud.github.io/RNBeamX/guide.html'
src = src.replace("guide: 'guide.html'", "guide: '%s'" % live).replace('href="guide.html"', 'href="%s"' % live)

os.makedirs('dist', exist_ok=True)
open('dist/rnbeamx-standalone.html', 'w', encoding='utf-8').write(src)
print('dist/rnbeamx-standalone.html  %.0f kB  (build %s)' % (len(src.encode()) / 1024, build_id))
