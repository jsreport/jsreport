import * as pdf from "pdfjs";
import * as fs from "fs"
import * as path from "path"


const helveticaFont: pdf.Font = require("pdfjs/font/Helvetica");
const helveticaBoldFont: pdf.Font = require("pdfjs/font/Helvetica-Bold");
const timesRomanFont: pdf.Font = require("pdfjs/font/TimesRoman");

const src: Buffer = readFileSync("tor-logo.jpg");
const logo: pdf.Image = new pdf.Image(src);

let doc: pdf.Document;

// from docs
// ReadMe
doc = new pdf.Document()
doc = new pdf.Document({
    font: require("pdfjs/font/helvetica"),
    padding: 10
});
doc.pipe(createWriteStream("output.pdf"));

// render something onto the document

async () => {
    await doc.end();
};

new pdf.Font(readFileSync("./opensans/regular.ttf"));

const image1 = readFileSync("image.jpg");
let img = new pdf.Image(image1);
doc.image(img);

const externalDoc1 = readFileSync("other.pdf");
const ext = new pdf.ExternalDocument(externalDoc1);
doc.setTemplate(ext);
doc.addPagesOf(ext);
doc.addPageOf(1, ext);

let header = doc.header();
header.text("This is a header");

let footer = doc.footer();
footer.text("This is a footer");

doc
    .asBuffer()
    .then((data:Buffer) => writeFileSync("test.pdf", data, { encoding: "binary" }));

doc.asBuffer((err:Error, data:Buffer) => {
    if (err) {
        console.error(err);
    } else {
        writeFileSync("test.pdf", data, { encoding: "binary" });
    }
});

doc.text("Lorem Ipsum ...");
let text = doc.text({ fontSize: 12 });
text.add("Lorem Ipsum ...");

let cell = doc.cell("Cell Text", { padding: 10 });
cell.text("More text ...");

const table1 = doc.table({
    widths: [256, 256],
    borderHorizontalWidth: 10
});

let row = table1.row();
row.cell("Cell 1");
row.cell("Cell 2");

const img1 = new pdf.Image(readFileSync("image.jpg"));
doc.image(img1, {
    height: 55,
    align: "center"
});

doc.op(1, 0, 0, "sc");
doc.op((x: any, y: any) => {
    const height = 40;
    return [x, y - height, x + 60, height, "re"];
});
doc.op("f");

doc.text("goto", { goTo: "here" });
doc.pageBreak();
doc.destination("here");

const footer1 = doc.footer();
footer1.pageNumber({ textAlign: "center" });

const header1 = doc.header();
header1.pageNumber((curr:number, total:number) => `${curr} / ${total}`);

const table2 = doc.table({
    widths: [200, 200]
});

let row1 = table2.row();
row1.cell("Cell Left");
row1.cell("Cell Right");

const table3 = doc.table({
    widths: [200, 200],
    borderWidth: 1
});

const header2 = table3.header();
header2.cell("Header Left");
header2.cell("Header Right");

const table4 = doc.table({
    widths: [200, 200],
    borderWidth: 1
});

let row2 = table4.row();
row2.cell("Cell Left");
row2.cell("Cell Right");

const text2 = doc.text();
text2.add("add 1", { fontSize: 14 });
text2.br();
text2.add("add 2");
text.append("add3");
text.append("add4", { alignment: "justify" });

// from playground
const lorem = "lorem";
var docPlayground = new pdf.Document({ font: helveticaFont });

var header3 = docPlayground
    .header()
    .table({ widths: [null, null], paddingBottom: 1 * pdf.cm })
    .row();
header3.cell().image(logo, { height: 2 * pdf.cm });
header3
    .cell()
    .text({ textAlign: "right" })
    .add(
        "A Portable Document Format (PDF) generation library targeting both the server- and client-side."
    )
    .add("https://github.com/rkusa/pdfjs", {
        link: "https://github.com/rkusa/pdfjs",
        underline: true,
        color: 0x569cd6
    });

docPlayground.footer().pageNumber(
    function(curr:number, total:number) {
        return curr + " / " + total;
    },
    { textAlign: "center" }
);

let cell2 = docPlayground.cell({ paddingBottom: 0.5 * pdf.cm });
cell2.text("Features:", { fontSize: 16, font: helveticaBoldFont });
cell2
    .text({ fontSize: 14, lineHeight: 1.35 })
    .add("-")
    .add("different", { color: 0xf8dc3f })
    .add("font", { font: timesRomanFont })
    .add("styling", { underline: true })
    .add("options", { fontSize: 9 });
cell2.text("- Images (JPEGs, other PDFs)");
cell2.text("- Tables (fixed layout, header row)");
cell2.text(
    "- AFM fonts && OTF font embedding (as CID fonts, i.e., support for fonts with large character sets)"
);
cell2.text("- Add existing PDFs (merge them or add them as page templates)");

docPlayground
    .cell({ paddingBottom: 0.5 * pdf.cm })
    .text()
    .add("For more information visit the")
    .add("Documentation", {
        link: "https://github.com/rkusa/pdfjs/tree/master/docs",
        underline: true,
        color: 0x569cd6
    });

var table5 = docPlayground.table({
    widths: [1.5 * pdf.cm, 1.5 * pdf.cm, null, 2 * pdf.cm, 2.5 * pdf.cm],
    borderHorizontalWidths: function(i:number) {
        return i < 2 ? 1 : 0.1;
    },
    padding: 5
});

var tr2 = table5.header({ font: helveticaBoldFont });
tr2.cell("#");
tr2.cell("Unit");
tr2.cell("Subject");
tr2.cell("Price", { textAlign: "right" });
tr2.cell("Total", { textAlign: "right" });

function addRow(qty: number, name: string, desc: string, price: number) {
    var tr3 = table.row();
    tr3.cell(qty.toString());
    tr3.cell("pc.");

    var article = tr3.cell().text();
    article
        .add(name, { font: helveticaBoldFont })
        .br()
        .add(desc, { fontSize: 11, textAlign: "justify" });

    tr3.cell(price.toFixed(2) + " €", { textAlign: "right" });
    tr3.cell((price * qty).toFixed(2) + " €", { textAlign: "right" });
}

addRow(2, "Article A", lorem, 500);
addRow(1, "Article B", lorem, 250);
addRow(2, "Article C", lorem, 330);
addRow(3, "Article D", lorem, 1220);
addRow(2, "Article E", lorem, 120);
addRow(5, "Article F", lorem, 50);

// from tests

const openSansRegular = fs.readFileSync(path.join(__dirname, 'font/opensans/regular.ttf'))
const openSansBold = fs.readFileSync(path.join(__dirname, 'font/opensans/bold.ttf'))
const jpegImage = fs.readFileSync(path.join(__dirname, 'image/pdfjs.jpg'))
const pdfImage = fs.readFileSync(path.join(__dirname, 'image/pdfjs.pdf'))
const complexPdfImage = fs.readFileSync(path.join(__dirname, 'image/complex.pdf'))

const f = {
    font: {
        opensans: {
            regular: new pdf.Font(openSansRegular),
            bold: new pdf.Font(openSansBold)
        },
        afm: {
            regular: require('../../font/Helvetica'),
            bold: require('../../font/Helvetica-Bold'),
            monoRegular: require('../../font/Courier'),
            monoBold: require('../../font/Courier-Bold'),
        }
    },
    image: {
        jpeg: new pdf.Image(jpegImage),
        pdf: new pdf.Image(pdfImage),
        complexPdf: new pdf.Image(complexPdfImage),
    },
    lorem: {
        long: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\n\nDuis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.\n\nUt wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.',
        short: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
        shorter: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.',
    },
    document: {
        test: new pdf.ExternalDocument(fs.readFileSync(path.join(__dirname, 'document/test.pdf'))),
        pdfjsCreated: new pdf.ExternalDocument(fs.readFileSync(path.join(__dirname, 'document/pdfjs-created.pdf'))),
    }
};

doc = new pdf.Document({
    font: f.font.afm.regular,
    padding: 10,
    lineHeight: 1,
})

doc.info.id = '42'
doc.info.creationDate = new Date(2015, 1, 19, 22, 33, 26)
doc.info.producer = 'pdfjs tests (github.com/rkusa/pdfjs)'

doc.end().catch(err => {
    console.error(err)
})

doc.text('goto', { goTo: 'here' })

doc.pageBreak()
doc.destination('here')

doc.text('goto', { goTo: 'here' })

doc.pageBreak()

doc.image(f.image.jpeg, {
    destination: 'here'
})

doc.image(f.image.jpeg, {
    goTo: 'here'
})

doc.pageBreak()

doc.text('here', { destination: 'here' })

doc.image(f.image.jpeg, {
    link: 'https://github.com/rkusa/pdfjs'
})

doc.text('goto B', { goTo: 'B' })
doc.text('goto A', { goTo: 'A' })

doc.pageBreak()
doc.text('A', { destination: 'A' })

doc.pageBreak()
doc.text('B', { destination: 'B' })

doc.text('pdfjs', { link: 'https://github.com/rkusa/pdfjs' })
    .add('issues', { link: 'https://github.com/rkusa/pdfjs/issues' })

doc.text('before')

doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderBottomWidth: 5
})

doc.text('in between')

doc.cell('Cell 2', {
    fontSize: 15, width: 256, padding: 10,
    borderBottomWidth: 1, borderBottomColor: 0x2980b9
})

doc.text('after')

cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 270,
    padding: 0,
    borderWidth: 10,
})

cell.text(f.lorem.long, { textAlign: 'justify', fontSize: 20 })
cell.text(f.lorem.long, { textAlign: 'justify', fontSize: 20 })

cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 200,
    padding: 0,
    borderWidth: 10,
})

cell.text(f.lorem.long, { textAlign: 'justify', fontSize: 15 })

doc.text('before')

doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderLeftWidth: 5
})

doc.text('in between')

doc.cell('Cell 2', {
    fontSize: 15, width: 256, padding: 10,
    borderLeftWidth: 1, borderLeftColor: 0x2980b9
})

doc.text('after')

doc.text('before')

doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderTopWidth: 2, borderTopColor: 0xe74c3c,
    borderRightWidth: 4, borderRightColor: 0x2980b9,
    borderBottomWidth: 6, borderBottomColor: 0x27ae60,
    borderLeftWidth: 8, borderLeftColor: 0xf1c40f,
})

doc.text('after')

for (let i = 0; i < 3; ++i) {
    doc.text(f.lorem.short, { fontSize: 20 })
}

doc.text('--------------------------', { fontSize: 20 })

// should be moved to the next page retrospectively
cell = doc.cell({ backgroundColor: 0xeeeeee, padding: 0, borderWidth: 1 })
for (let i = 0; i < 4; ++i) {
    cell.text(f.lorem.short, { fontSize: 20 })
}

doc.text(f.lorem.short, { fontSize: 20 })

doc.text('before')

doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderRightWidth: 5
})

doc.text('in between')

doc.cell('Cell 2', {
    fontSize: 15, width: 256, padding: 10,
    borderRightWidth: 1, borderRightColor: 0x2980b9
})

doc.text('after')

doc.text('before')

doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderTopWidth: 5
})

doc.text('in between')

doc.cell('Cell 2', {
    fontSize: 15, width: 256, padding: 10,
    borderTopWidth: 1, borderTopColor: 0x2980b9
})

doc.text('after')

doc.text('before')

doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderWidth: 5
})

doc.text('in between')

doc.cell('Cell 2', {
    fontSize: 15, width: 256, padding: 10,
    borderWidth: 1, borderColor: 0x2980b9
})

doc.text('after')

cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 250,
    padding: 10
})

cell.text(f.lorem.long, { textAlign: 'justify', fontSize: 20 })
cell.text(f.lorem.long, { textAlign: 'justify', fontSize: 20 })

cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 250,
    padding: 10
})

cell.text(f.lorem.shorter, { fontSize: 20 })

let inner = cell.cell({
    backgroundColor: 0xdddddd,
    padding: 10
})

inner.text(f.lorem.long, { fontSize: 20 })

cell.text(f.lorem.shorter, { fontSize: 20 })

cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 200,
    padding: 10
})

cell.text(f.lorem.long, { textAlign: 'justify', fontSize: 15 })

doc.text(f.lorem.shorter)
const outer = doc.cell({ width: 400, padding: 20, backgroundColor: 0xeeeeee })
inner = outer.cell({ padding: 20, backgroundColor: 0xdddddd })
inner.text(f.lorem.short)
inner.text(f.lorem.short)
outer.text('Hello World')
doc.text('Hello World')

for (let i = 0; i < 3; ++i) {
    doc.text(f.lorem.short, { fontSize: 20 })
}

// should be moved to the next page retrospectively
cell = doc.cell({ backgroundColor: 0xeeeeee, padding: 20 })
for (let i = 0; i < 4; ++i) {
    cell.text(f.lorem.short, { fontSize: 20 })
}

doc.text(f.lorem.short, { fontSize: 20 })

for (let i = 0; i < 3; ++i) {
    doc.text(f.lorem.short, { fontSize: 20 })
}

// should be moved to the next page retrospectively
doc.cell(f.lorem.short, { backgroundColor: 0xeeeeee, padding: 30, fontSize: 20 })

doc.text(f.lorem.short, { fontSize: 20 })

doc.cell(f.lorem.short, { width: 200, padding: 20, backgroundColor: 0xeeeeee })

doc.text(f.lorem.short)

cell = doc.cell({
    backgroundColor: 0xeeeeee, padding: 10, width: 256, borderWidth: 1,
    x: 256,
    y: 256,
})
cell.text(f.lorem.short)

doc.text(f.lorem.short)

doc = new pdf.Document({
    font: f.font.afm.regular,
    paddingLeft: 0,
    paddingRight: 0,
})
doc.text(f.lorem.short)

const external = f.document.test

doc.addPagesOf(external)

doc.text('Should be on third page ...')

doc.text('Should be on first page ...')

doc.addPagesOf(external)

doc.text('Should be on fourth page ...')
doc.text('TEST', { fontSize: 200, color: 0xdddddd, textAlign: 'center' })

doc.setTemplate(f.document.pdfjsCreated)

doc.text('TEST', { fontSize: 200, color: 0xdddddd, textAlign: 'center' })

doc.addPageOf(1, external)

doc.text('Should be on second page ...')

doc.addPageOf(2, external)

doc.text('Should be on second page ...')

doc.setTemplate(f.document.test)

doc.text('TEST', { fontSize: 40 })

doc.pageBreak()

doc.text(f.lorem.short, { fontSize: 20 })

// header
header = doc.header()
header.text('text')

cell = header.cell({ padding: 20, backgroundColor: 0xdddddd })
cell.text('TESTING')
cell.image(f.image.pdf)

// footer
footer = doc.footer()
footer.text('text')

cell = footer.cell({ padding: 20, backgroundColor: 0xdddddd })
cell.image(f.image.complexPdf)
cell.text('TESTING')

// body

doc.text('Hello')

doc.pageBreak()

doc.text(f.lorem.long, { fontSize: 20 })

footer = doc.footer()
footer.text('text')

cell = footer.cell({ padding: 20, backgroundColor: 0xdddddd })
cell.text('TESTING')
cell.image(f.image.pdf)

doc.text('Hello')

doc.pageBreak()

doc.text(f.lorem.long, { fontSize: 20 })

header = doc.header()
header.text('First')

doc.text('Hello World 1')

header = doc.header()
header.text('Second')

doc.text('Hello World 2')

header = doc.header()
header.text('text')

cell = header.cell({ padding: 20, backgroundColor: 0xdddddd })
cell.text('TESTING')
cell.image(f.image.pdf)

doc.text('Hello')

doc.pageBreak()

doc.text(f.lorem.long, { fontSize: 20 })

footer = doc.footer()
footer.pageNumber((curr: number, total: number) => `${curr} / ${total}`, { textAlign: 'center', fontSize: 16 })
footer.text('after', { textAlign: 'center' })

header = doc.header()
header.text('before', { textAlign: 'center' })
header.pageNumber((curr: number, total: number) => `${curr} / ${total}`, { textAlign: 'center', fontSize: 16 })

doc.text('Hello World 1')

doc.pageBreak()

doc.text('Hello World 2')

footer = doc.footer()
footer.text('before', { textAlign: 'center' })
footer.pageNumber({ textAlign: 'center', fontSize: 16 })

header = doc.header()
header.pageNumber({ textAlign: 'center', fontSize: 16 })
header.text('after', { textAlign: 'center' })

doc.text('Hello World 1')

doc.pageBreak()

doc.text('Hello World 2')

doc.image(f.image.jpeg, {
    width: 64, align: 'center', wrap: false, x: 10, y: 30
})

doc.text(f.lorem.shorter)

doc.image(f.image.jpeg)

doc.image(f.image.jpeg, {
    width: 128, align: 'left'
})

doc.image(f.image.jpeg, {
    height: 55, align: 'center'
})

doc.image(f.image.jpeg, {
    width: 128, align: 'right'
})

doc.text(f.lorem.shorter)

doc.image(f.image.pdf, {
    wrap: false, y: 831.896, x: 10
})

doc.text(f.lorem.shorter)

doc.text(f.lorem.shorter)

doc.image(f.image.complexPdf)

doc.text(f.lorem.shorter)

doc.image(f.image.pdf, {
    width: 64, align: 'center', wrap: false, x: 10, y: 30
})

doc.text(f.lorem.shorter)

doc.image(f.image.pdf)

doc.image(f.image.pdf, {
    width: 128, align: 'left'
})

doc.image(f.image.pdf, {
    height: 55, align: 'center'
})

doc.image(f.image.pdf, {
    width: 128, align: 'right'
})

doc.text(f.lorem.shorter)

doc.text('https://github.com/rkusa/pdfjs << click me')

doc.text('абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', { font: f.font.opensans.regular })
doc.text('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', { font: f.font.opensans.regular })

doc.header().text('Test', { font: f.font.afm.bold })

doc.footer().text('Footer', { font: undefined }) // originally it was f.font.afm.mono, but this font isn't defined in fixtures

doc.text('TEST:', { fontSize: 16, font: f.font.afm.bold })
doc.text().add('TE').append('ST', { font: f.font.afm.monoRegular })

doc.text()
    .add('Manage your calories by', { font: f.font.opensans.regular })
    .add('eating a quarter pack per day.', { font: f.font.opensans.bold });

// absolute
doc.op(0, 0, 1, 'sc')
doc.op(0, 830, 297.6648, 11.896, 're')
doc.op('f')

doc.text(f.lorem.short)

doc.text(f.lorem.short)

// relative
doc.op(1, 0, 0, 'sc')
doc.op((x: number, y: number) => {
    const height = 40
    return [x, y - height, x + 60, height, 're']
})
doc.op('f')

img = new pdf.Image(fs.readFileSync(path.join(__dirname, '/fixtures/illustrator.pdf')))

doc.image(img, {
    wrap: false, x: 0, y: 841.89, width: 595.28
})

img = new pdf.Image(fs.readFileSync(path.join(__dirname, '/fixtures/indesign-interactive.pdf')))

doc.image(img, {
    wrap: false, x: 0, y: 841.89, width: 595.28, height: 841.89
})

let table = doc.table({
    widths: [256, 256],
    padding: 0,
    borderWidth: 10,
})



row = table.row()

row.cell(f.lorem.short, { textAlign: 'justify', fontSize: 20, padding: 10, backgroundColor: 0xdddddd })
row.cell(f.lorem.long + '\n' + f.lorem.long, { textAlign: 'justify', fontSize: 20, padding: 10, backgroundColor: 0xeeeeee })

doc.text(f.lorem.short, { fontSize: 20 })

table = doc.table({
    widths: [256, 256],
    padding: 0,
    borderWidth: 10,
})

row = table.row()

row.cell(f.lorem.short, { textAlign: 'justify', fontSize: 20, padding: 10, backgroundColor: 0xdddddd })
row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10, backgroundColor: 0xeeeeee })

table = doc.table({
    widths: [256, 256],
    borderWidth: 10,
    borderColor: 0xe74c3c,
})

row = table.row()

row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })

table = doc.table({
    widths: [256, 256],
    borderHorizontalWidth: 10,
    borderHorizontalColor: 0xe74c3c,
    borderVerticalWidth: 10,
    borderVerticalColor: 0x2980b9,
})

for (let i = 0; i < 3; ++i) {
    const row = table.row()

    row.cell('Left ' + i, { fontSize: 20, padding: 10 })
    row.cell('Right ' + i, { fontSize: 20, padding: 10 })
}

doc.text('–––––')

const colors = [0xe74c3c, 0x2980b9, 0x27ae60, 0xf1c40f]
table = doc.table({
    widths: [256, 256],
    borderHorizontalWidth: 10,
    borderHorizontalColors: (i: number) => colors[i],
    borderVerticalWidth: 10,
    borderVerticalColors: [0xe74c3c, 0x2980b9, 0x27ae60],
})

for (let i = 0; i < 3; ++i) {
    const row = table.row()

    row.cell('Left ' + i, { fontSize: 20, padding: 10 })
    row.cell('Right ' + i, { fontSize: 20, padding: 10 })
}

table = doc.table({
    widths: [256, 256],
    borderHorizontalWidth: 10
})

for (let i = 0; i < 3; ++i) {
    const row = table.row()

    row.cell('Left ' + i, { fontSize: 20, padding: 10 })
    row.cell('Right ' + i, { fontSize: 20, padding: 10 })
}

doc.text('–––––')

table = doc.table({
    widths: [256, 256],
    borderHorizontalWidths: (i: number) => (i + 1) * 5
})

for (let i = 0; i < 3; ++i) {
    const row = table.row()

    row.cell('Left ' + i, { fontSize: 20, padding: 10 })
    row.cell('Right ' + i, { fontSize: 20, padding: 10 })
}

doc.cell({ y: 60 })

table = doc.table({
    widths: [null, null],
    borderWidth: 1,
    padding: 10,
})

for (let i = 0; i < 3; ++i) {
    const row = table.row()
    row.cell('Cell ' + i)
    row.cell('Cell ' + i)
}

for (let i = 0; i < 3; ++i) {
    doc.text(f.lorem.short, { fontSize: 20 })
}

doc.text('---------------------')

table = doc.table({ widths: [200, 200], borderWidth: 10 })

// should be moved to the next page retrospectively
row = table.row()
row.cell(f.lorem.short, { backgroundColor: 0xeeeeee, padding: 10, fontSize: 20 })
row.cell(f.lorem.short, { backgroundColor: 0xbbbbbb, padding: 10, fontSize: 20 })

doc.text(f.lorem.short, { fontSize: 20 })
doc.text(f.lorem.short, { fontSize: 20 })

table = doc.table({
    widths: [256, 256],
    borderWidth: 1,
    borderVerticalWidth: 10
})

row = table.row()

row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })


doc.text('----')

table = doc.table({
    widths: [256, 256],
    borderVerticalWidths: [5, 15, 20]
})

row = table.row()

row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })

table = doc.table({
    widths: [256, 256],
    borderWidth: 10,
})

row = table.row()

row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
row.cell(f.lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })

doc.cell({ y: 28 })

table = doc.table({
    widths: [null, null, null, null, null, null, null],
    borderWidth: 1,
    padding: 0,
})

for (let i = 0; i < 3; ++i) {
    const row = table.row()
    row.cell('Cell ' + i)
    row.cell()
    row.cell()
    row.cell('Cell ' + i)
    row.cell()
    row.cell('Cell ' + i)
    row.cell('Cell ' + i)
}

table = doc.table({ widths: [null, null] })
row = table.row()

let cell1 = row.cell({ padding: 0, backgroundColor: 0xeeeeee })
cell1.text(f.lorem.short, { fontSize: 20 })

cell2 = row.cell({ padding: 20, backgroundColor: 0xbbbbbb })

let innerTable = cell2.table({ widths: [null] })
const innerRow = innerTable.row()
const innerCell = innerRow.cell({ padding: 10, backgroundColor: 0xdddddd })

for (let i = 0; i < 2; ++i) {
    innerCell.text(f.lorem.short, { fontSize: 20 })
}

doc.text(f.lorem.shorter, { fontSize: 20 })

doc.header().text('HAS HEADER')
doc.footer().text('HAS FOOTER')

doc.text(f.lorem.long)

table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
})

let tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell(f.lorem.short, { fontSize: 13, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

row2 = table.row()

row2.cell(f.lorem.short, { fontSize: 13, padding: 10, backgroundColor: 0xdddddd })
row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Foo')

doc.header().text('HAS HEADER')

doc.text(f.lorem.long)

table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
})

tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell(f.lorem.short, { fontSize: 14, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

row2 = table.row()

row2.cell(f.lorem.short, { fontSize: 14, padding: 10, backgroundColor: 0xdddddd })
row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Foo')

table = doc.table({
    widths: [null, null, null],
    borderWidth: 1,
    borderVerticalWidths: [2, 4, 6, 8],
})

{
    const row = table.row()
    row.cell('First', { fontSize: 20, padding: 10 })
    row.cell('Second', { fontSize: 20, padding: 10 })
    row.cell('Third', { fontSize: 20, padding: 10 })
}

{
    const row = table.row()
    row.cell('First', { fontSize: 20, padding: 10, colspan: 2 })
    row.cell('Second', { fontSize: 20, padding: 10 })
}

{
    const row = table.row()
    row.cell('First', { fontSize: 20, padding: 10 })
    row.cell('Second', { fontSize: 20, padding: 10 })
    row.cell('Third', { fontSize: 20, padding: 10 })
}

{
    const row = table.row()
    row.cell('First', { fontSize: 20, padding: 10 })
    row.cell('Second', { fontSize: 20, padding: 10, colspan: 2 })
}

{
    const row = table.row()
    row.cell('First', { fontSize: 20, padding: 10, colspan: 3 })
}

{
    const row = table.row()
    row.cell('First', { fontSize: 20, padding: 10 })
    row.cell('Second', { fontSize: 20, padding: 10 })
    row.cell('Third', { fontSize: 20, padding: 10 })
}

table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
})

tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell(f.lorem.long, { fontSize: 11, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })


row2 = table.row()

row2.cell(f.lorem.long, { fontSize: 16, padding: 10, backgroundColor: 0xdddddd })
row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

const row3 = table.row()

row3.cell('Cell 1', { fontSize: 16, padding: 10, backgroundColor: 0xdddddd })
row3.cell(f.lorem.short, { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Foo')

doc.text('Foo').br().br().br().br().br().br().br().br().br()

table = doc.table({
    widths: [null, null],
    borderWidth: 1,
})

tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell('Cell 1', { fontSize: 11, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Bar')

doc.text(f.lorem.long)

table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
})

tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell(f.lorem.short, { fontSize: 11, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

row2 = table.row()

row2.cell(f.lorem.short, { fontSize: 16, padding: 10, backgroundColor: 0xdddddd })
row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Foo')

doc.header().text('HAS HEADER')

doc.text(f.lorem.long)

table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
})

tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell(f.lorem.short, { fontSize: 15, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

row2 = table.row()

row2.cell(f.lorem.short, { fontSize: 15, padding: 10, backgroundColor: 0xdddddd })
row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Foo')

doc.text(f.lorem.shorter, { fontSize: 20 })

table = doc.table({ widths: [null, null, null] })
row = table.row()

cell1 = row.cell({ padding: 0, backgroundColor: 0xeeeeee })
cell1.text(f.lorem.short, { fontSize: 20 })

cell2 = row.cell({ padding: 20, backgroundColor: 0xbbbbbb })
for (let i = 0; i < 2; ++i) {
    cell2.text(f.lorem.short, { fontSize: 20 })
}

let cell3 = row.cell({ padding: 10, backgroundColor: 0xdddddd })
cell3.text(f.lorem.shorter, { fontSize: 20 })

doc.text(f.lorem.shorter, { fontSize: 20 })

doc.text(f.lorem.shorter, { fontSize: 20 })

table = doc.table({ widths: [200, 200] })
row = table.row()

cell1 = row.cell({ padding: 20, backgroundColor: 0xbbbbbb })
for (let i = 0; i < 2; ++i) {
    cell1.text(f.lorem.short, { fontSize: 20 })
}

cell2 = row.cell({ padding: 10, backgroundColor: 0xdddddd })
cell2.text(f.lorem.short, { fontSize: 20 })

doc.text(f.lorem.shorter, { fontSize: 20 })

doc.text(f.lorem.shorter)

table = doc.table({ widths: [200, 200] })

for (let r = 0; r < 4; ++r) {
    const row = table.row()

    for (let c = 0; c < 2; ++c) {
        const cell = row.cell({ padding: 10, backgroundColor: 0xbbbbbb })
        for (let i = 0; i < 2; ++i) {
            cell.text(f.lorem.shorter, { fontSize: 20 })
        }
    }
}

doc.text(f.lorem.shorter)

table = doc.table({ widths: [205, 205] })

for (let r = 0; r < 3; ++r) {
    const row = table.row()

    for (let c = 0; c < 2; ++c) {
        const cell = row.cell({ padding: 10, backgroundColor: 0xbbbbbb })
        for (let i = 0; i < 2; ++i) {
            cell.text(f.lorem.short, { fontSize: 20 })
        }
    }
}

doc.text(f.lorem.shorter)

table = doc.table({ widths: [200, 200] })
row = table.row()
row.cell(f.lorem.short, { backgroundColor: 0xeeeeee, padding: 10, fontSize: 20 })
row.cell('Uneven ...', { backgroundColor: 0xbbbbbb, padding: 10, fontSize: 20 })

doc.header().text('HAS HEADER')
doc.footer().text('HAS FOOTER')

doc.text(f.lorem.long)

table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
})

tableHeader = table.header()
tableHeader.cell('Header Left', { textAlign: 'center', padding: 30 })
tableHeader.cell('Header Right', { textAlign: 'center', padding: 30 })

row1 = table.row()

row1.cell(f.lorem.short, { fontSize: 14, padding: 10, backgroundColor: 0xdddddd })
row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

row2 = table.row()

row2.cell(f.lorem.short, { fontSize: 14, padding: 10, backgroundColor: 0xdddddd })
row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

doc.text('Foo')

for (let i = 0; i < 3; ++i) {
    doc.text(f.lorem.short, { fontSize: 20 })
}

doc.text('---------------------')

table = doc.table({ widths: [200, 200] })

// should be moved to the next page retrospectively
row = table.row()
row.cell(f.lorem.short, { backgroundColor: 0xeeeeee, padding: 10, fontSize: 20 })
row.cell('Uneven ...', { backgroundColor: 0xbbbbbb, padding: 10, fontSize: 20 })

doc.text(f.lorem.short, { fontSize: 20 })

for (let i = 0; i < 3; ++i) {
    doc.text(f.lorem.short, { fontSize: 20 })
}

doc.text('---------------------')

table = doc.table({ widths: [200, 200] })

// should be moved to the next page retrospectively
row = table.row()
row.cell(f.lorem.short, { backgroundColor: 0xeeeeee, padding: 10, fontSize: 20 })
row.cell(f.lorem.short, { backgroundColor: 0xbbbbbb, padding: 10, fontSize: 20 })

doc.text(f.lorem.short, { fontSize: 20 })
doc.text(f.lorem.short, { fontSize: 20 })

doc.text(f.lorem.shorter)

table = doc.table({ widths: [null, null, null] })
row = table.row()

cell1 = row.cell({ padding: 0, backgroundColor: 0xeeeeee })
cell1.text(f.lorem.short)

cell2 = row.cell({ padding: 0, backgroundColor: 0xbbbbbb })
for (let i = 0; i < 3; ++i) {
    cell2.text(f.lorem.short)
}

cell3 = row.cell({ padding: 20, backgroundColor: 0xdddddd })
cell3.text(f.lorem.shorter)

doc.text(f.lorem.shorter)

doc.text(f.lorem.short + '\n\n', { textAlign: 'left' })
doc.text(f.lorem.short + '\n\n', { textAlign: 'center' })
doc.text(f.lorem.short + '\n\n', { textAlign: 'right' })
doc.text(f.lorem.short + '\n\n', { textAlign: 'justify' })

doc.text(f.lorem.short + '\n\n', { font: f.font.opensans.regular, textAlign: 'left' })
doc.text(f.lorem.short + '\n\n', { font: f.font.opensans.regular, textAlign: 'center' })
doc.text(f.lorem.short + '\n\n', { font: f.font.opensans.regular, textAlign: 'right' })
doc.text(f.lorem.short + '\n\n', { font: f.font.opensans.regular, textAlign: 'justify' })

const txt1 = doc.text('foo', { font: f.font.afm.monoRegular })
    .append('bar', { font: f.font.afm.monoBold })
    .append('_')

for (let i = 0; i < 100; ++i) {
    txt1.add('.')
}

const txt2 = doc.text('foo', { font: f.font.afm.monoRegular, textAlign: 'center' })
    .append('bar', { font: f.font.afm.monoBold })
    .append('_')

for (let i = 0; i < 30; ++i) {
    txt2.add('.')
}

doc.text('Lorem ipsum dolor sit amet, consetetur sadipscing elitr')
    .append(',')
    .add('sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat.')

doc.text('AVA')
doc.text('A').append('VA')

// alignment
doc.text('AVA\n_ V _', { textAlign: 'center' })
doc.text('AVA\n_ A', { textAlign: 'right' })
doc.text('AVA ' + f.lorem.short, { textAlign: 'justify' })

// break long
doc.text('AVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAV')

// OTF font

doc.text('AVA', { font: f.font.opensans.regular })
doc.text('A', { font: f.font.opensans.regular }).append('VA', { font: f.font.opensans.regular })

// alignment
doc.text('AVA\n_ V _', { textAlign: 'center', font: f.font.opensans.regular })
doc.text('AVA\n_ A', { textAlign: 'right', font: f.font.opensans.regular })
doc.text('AVA ' + f.lorem.short, { textAlign: 'justify', font: f.font.opensans.regular })

// break long
doc.text('AVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAV', { font: f.font.opensans.regular })

doc.text(f.lorem.long, { fontSize: 20 })
doc.text(f.lorem.long, { fontSize: 20 })

doc.text('Hello World')

{ // afm
    const text = doc.text()
    text.add(f.lorem.shorter, { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true })
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar', { strikethrough: true })
}

{ // otf
    const text = doc.text({ font: f.font.opensans.regular, fontSize: 9.5 })
    text.add(f.lorem.shorter, { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true })
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar', { strikethrough: true })
}

{ // single word line break
    doc.text('foobar', { strikethrough: true, fontSize: 8.5 })
    doc.text(f.lorem.shorter, { strikethrough: true, fontSize: 8.5 })
}

{ // long word
    const text = doc.text()
    text.add('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { strikethrough: true })
    text.add('foobar')
}

{ // color change
    const text = doc.text()
    text.add('foo', { strikethrough: true })
    text.add('bar', { strikethrough: true, color: 0xff0000 })
}

{ // append
    doc.text()
        .add('fo', { strikethrough: true })
        .append('ob')
        .append('ar', { strikethrough: true })
}

text = doc.text()
text.add('Regular')
    .add('Bold', { font: f.font.afm.bold })
    .add('Regular', { font: f.font.afm.regular })
    .add('Big', { fontSize: 20 })
    .add('BigBold', { fontSize: 20, font: f.font.afm.bold })
    .add('Red', { color: 0xff0000 })
    .add('Regular')
    // test changing line heights
    .add('\nRegular')
    .add('\nBigger', { fontSize: 40 })
    .add('\nRegular')

{ // afm
    const text = doc.text()
    text.add(f.lorem.shorter, { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true })
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar', { underline: true })
}

{ // otf
    const text = doc.text({ font: f.font.opensans.regular, fontSize: 9.5 })
    text.add(f.lorem.shorter, { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true })
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar', { underline: true })
}

{ // single word line break
    doc.text('foobar', { underline: true, fontSize: 8.5 })
    doc.text(f.lorem.shorter, { underline: true, fontSize: 8.5 })
}

{ // long word
    const text = doc.text()
    text.add('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { underline: true })
    text.add('foobar')
}

{ // color change
    const text = doc.text()
    text.add('foo', { underline: true })
    text.add('bar', { underline: true, color: 0xff0000 })
}

{ // append
    doc.text()
        .add('fo', { underline: true })
        .append('ob')
        .append('ar', { underline: true })
}

cell = doc.cell({ padding: 10, width: 50, backgroundColor: 0xeeeeee })
cell.text('abcdefghijklmnopqrstuvw abcd')

{ // Outlines
    doc.outline('1. An outline', 'Text')

    // Outlines can be set to any kind of destinations
    doc.outline('2. Works with any kind of dest', 'Doc')
    doc.outline('2.1. Image', 'Image', '2. Works with any kind of dest')
    doc.outline('2.2. Text', 'Text', '2. Works with any kind of dest')
    doc.outline('2.3. Doc', 'Doc', '2. Works with any kind of dest')

    // Outlines can be deeply nested
    doc.outline('3. Can be deeply nested', 'Text')
    doc.outline('3.1 Level 1', 'Image', '3. Can be deeply nested')
    doc.outline('3.1.1 Level 2', 'Text', '3.1 Level 1')

    // An outline with an unknown or empty destination is added to the outlines but is not reactive
    doc.outline('4. Empty/Unknown destinations', '')
    doc.outline('4.1. Can have children', 'Unknown', '4. Empty/Unknown destinations')
    doc.outline('4.2. But are not reactive', 'Unknown', '4. Empty/Unknown destinations')

    // If an outline is defined with a parent that has not already been declared, then the parent is added to the root with the same destination before the child outline is added
    doc.outline('5.1. Can have children', 'Image', '5. Undeclared parents')

    // An outline with an empty or undefined parent is attached to the root
    doc.outline('6. An outline with an undefined parent is added to the root', 'Text')
    doc.outline('7. So is an outline with an empty parent', 'Doc', '')
}

// from real usage

doc = new pdf.Document({ font: helveticaFont });

doc.cell({ paddingBottom: 0.5 * pdf.cm }).image(logo, { width: 150 });
doc
    .cell({ paddingBottom: 0.5 * pdf.cm })
    .text()
    .add("Receipt", { font: helveticaBoldFont, fontSize: 14 })
    .br()
    .add("The Old Reader, Inc.")
    .br()
    .add("theoldreader.com", {
        underline: true,
        color: 0x569cd6,
        link: "https://theoldreader.com"
    })
    .br()
    .add(`Invoice ID: 456-4581-4545`);

doc
    .cell({ paddingBottom: 0.5 * pdf.cm })
    .text()
    .add("Account: ", { font: helveticaBoldFont })
    .add("my-account");

let billTable: pdf.Table = doc.table({
    widths: ["*", "*", "*"],
    borderWidth: 1,
    padding: 5
});

const trHead: pdf.Row = billTable.header({
    font: helveticaBoldFont
});
trHead.cell("Item");
trHead.cell("Date");
trHead.cell("Amount");

const tr: pdf.Row = billTable.row();
tr.cell("250 feeds");
tr.cell("2017-10-19", { textAlign: "right" });
tr.cell("20$", { textAlign: "right" });

doc
    .cell({ paddingTop: 0.5 * pdf.cm })
    .text("Thank you!", { font: helveticaBoldFont });

doc.end();

// utilities

function readFileSync(src: string): Buffer {
    return new Buffer(src);
}

function createWriteStream(destination: string): any {
    return destination;
}

function writeFileSync(_name: string, _data: Buffer, _opts: any) {}
