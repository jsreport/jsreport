JavaScript files inside the [`./pdfs`](pdfs) directory are picked up automatically and their result is compared to their *.pdf* counterparts.

There will be false negatives.

Ideas for a better PDF testing setup are welcome.

Run specific tests:

```bash
node --harmony-async-await test/index.js test/pdfs/text/*.js
```

Additional PDF validation could be done using [preflight](https://pdfbox.apache.org/download.cgi):

```bash
java -classpath ./preflight-app-2.0.4.jar org.apache.pdfbox.preflight.Validator_A1b ./test.pdf
```

Use all results as future expectations:

```bash
rename -f 's/\.result\.pdf$/\.pdf/' test/pdfs/**/*.pdf
```