# Third-party notices

RNBeamX™ is © 2026 Rakesh Naik and Sachin Kumar Srivastava, all rights reserved
(see [`LICENSE`](LICENSE)). It uses the third-party components below, each under
its own licence. Those licences cover the components only, not RNBeamX itself.

The two PDF libraries are **included in this repository** (in
[`js/vendor/`](js/vendor/)) and are embedded, with their licence banners, in the
single-file build (`dist/rnbeamx-standalone.html`). They are loaded only when a
figure is exported as PDF. Everything else in RNBeamX, including the drawing,
ray tracing, 3D, animation and GIF code and the Learn pages, is original work of
the authors.

| Component | Version | Licence | Used for | Where |
|---|---|---|---|---|
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | MIT | Writing PDF files | included: `js/vendor/jspdf.umd.min.js` |
| [svg2pdf.js](https://github.com/yWorks/svg2pdf.js) | 2.2.3 | MIT | Converting the vector figure to PDF | included: `js/vendor/svg2pdf.umd.min.js` |

Visit counting uses the hosted [GoatCounter](https://www.goatcounter.com)
service (its `count.js` is loaded from gc.zgo.at). It sets no cookies and never
receives figure content; it is a service, not part of the app's code.

The test suite uses [Playwright](https://github.com/microsoft/playwright)
(Apache License 2.0) as a development tool. It is not part of the app and is not
distributed with it.

---

## jsPDF 2.5.1 — MIT License

Copyright
(c) 2010-2021 James Hall, https://github.com/MrRio/jsPDF
(c) 2015-2021 yWorks GmbH, https://www.yworks.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## svg2pdf.js 2.2.3 — MIT License

Copyright (c) 2015-2023 yWorks GmbH
Copyright (c) 2013-2015 by Vitaly Puzrin


Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Questions about licensing or permission to use RNBeamX: rakesh_n@cpqct.iitr.ac.in
