declare module "pdfjs" {
    export class Image {
        /**
         * Creates a new image that can be added to one or multiple documents.
         * @param src a buffer of the image source (supported formats: jpeg, pdf)
         */
        constructor(src: Buffer | ArrayBuffer);
    }

    export class Font {
        /**
         * Creates a new AFM font pr OTF font object that can be used with PDF documents.
         * TFont objects can be used multiple times.
         * @param arg the font data, as either Buffer or ArrayBuffer of an OTF font or a JSON object descriping an AFM font
         */
        constructor(arg: Buffer | ArrayBuffer);
    }

    export const mm: number;
    export const cm: number;

    export type DocumentProperties = {
        /**
         * The document's title
         */
        title?: string;
        /**
         * The name of the person who created the document
         */
        author?: string;
        /**
         * The subject of the document
         */
        subject?: string;
        /**
         * Keywords associated with the document
         */
        keywords?: string;
        /**
         * If the document was converted to PDF from another format, the name of the conforming product that created the original document from which it was converted
         */
        creator?: string;
        /**
         * If the document was converted to PDF from another format, the name of the conforming product that converted it to PDF
         * default: pdfjs v1.3 (github.com/rkusa/pdfjs)
         */
        producer?: string;
        /**
         * The date and time the document was created
         * default: new Date()
         */
        creationDate?: Date;
        /**
         * The date and time the document was most recently modified
         */
        modDate?: Date;
    };

    export class Document extends Fragment {
        /**
         * Creates a new PDF document
         * @param opts document options
         */
        constructor(opts?: DocumentOptions);

        /**
         * Get document's properties
         */
        info: DocumentProperties & { id: string };

        /**
         * Document is a Readable stream and can therefore piped into other streams
         * @param dest destination
         * @param opts options
         */
        pipe<T>(dest: T, opts?: { end?: boolean }): T;

        on(event: string | symbol, listener: (...args: any[]) => void): this;

        /**
         * Must be called to finish writing the PDF document
         */
        end(): Promise<void>;

        /**
         * Can be used to render the document as a buffer
         */
        asBuffer(): Promise<Buffer>;

        /**
         * Can be used to render the document as a buffer
         * @param callback callback called with either error or buffer
         */
        asBuffer(callback?: (err: Error, data: Buffer) => void): void;

        /**
         * Add a header to the document
         */
        header(): Header;

        /**
         * Add a footer to the document
         */
        footer(): Footer;

        /**
         * Add all pages of an external PDF into this document (aka merge an external document into this document)
         * @param external The external document to merge
         */
        addPagesOf(external: ExternalDocument): void;

        /**
         * Add one specific page of an external PDF into this document (aka merge an external document into this document)
         * @param page The number of the page that should be added
         * @param external The external document to merge
         */
        addPageOf(page: number, external: ExternalDocument): void;

        /**
         * Use an external document as a page template (i.e. external PDF will be used as a starting point / as a background for all pages)
         * @param external The external document to merge
         */
        setTemplate(external: ExternalDocument): void;

        /**
         * Add an outline to the document outlines of this document
         * @param title The title of the outline that should be added
         * @param destination The name of the destination that the outline to be added points to
         * @param parent The title of the parent outline of the outline that should be added
         */
        outline(title: string, destination: string, parent?: string | number): void;
    }

    export class Fragment {
        end(): void; // TODO

        /**
         * Add some text to the document
         * @param text A string that should be rendered
         * @param opts Options
         */
        text(text?: string, opts?: TextOptions): Text;

        /**
         * Add some text to the document
         * @param opts Options
         */
        text(opts: TextOptions): Text;

        /**
         * Add a cell to the document
         * @param text A string that should be rendered into the cell
         * @param opts Styling options
         */
        cell(text?: string, opts?: FragmentCellOptions & TextOptions): Cell;

        /**
         * Add a cell to the row
         * @param opts Styling options
         */
        cell(opts: FragmentCellOptions & TextOptions): Cell;

        /**
         * Add a table to the document
         * @param opts
         */
        table(opts: TableOptions): Table;

        /**
         * Add an image to the document
         * @param img A pdf.Image object of the image
         * @param opts Image options
         */
        image(img: Image, opts?: ImageOptions): void;

        /**
         * A manual page break
         */
        pageBreak(): void;

        /**
         * Execute PDF operations manually
         * @param fn function returning parameters for the PDF operation
         */
        op(fn: (x: number, y: number) => any[]): void;

        /**
         * Execute PDF operations manually
         * @param args parameters for the PDF operation
         */
        op(...args: any[]): void;

        /**
         * Add a named destination to the document and the current position
         * @param name name of the destination
         */
        destination(name: string): void;
    }

    export class Row {
        /**
         * Add a cell to the row
         * @param text A string that should be rendered into the cell
         * @param opts Styling options
         */
        cell(text?: string, opts?: TableCellOptions & TextOptions): Cell;
        /**
         * Add a cell to the row
         * @param opts Styling options
         */
        cell(opts: TableCellOptions & TextOptions): Cell;
    }

    export class Table {
        /**
         * Add a table header
         * @param opts
         */
        header(opts?: TableCellOptions & TextOptions): Row;
        /**
         * Add a table row
         * @param opts
         */
        row(opts?: TableCellOptions & TextOptions): Row;
    }

    export class Text {
        /**
         * Adds text to the text fragment
         * @param text the string
         * @param opts styling options
         */
        add(text: string, opts?: TextOptions): Text;

        /**
         * Same as add, but directly appends the text, i.e., adds the text without a space
         * @param text the string
         * @param opts styling options
         */
        append(text: string, opts?: TextOptions): Text;

        /**
         * Adds a line break
         */
        br(): Text;
    }

    export class ExternalDocument {
        /**
         * Creates a new external PDF document that can be merged into the document or that can be added to the document as a page template.
         * @param src a buffer of the PDF source
         */
        constructor(src: Buffer | ArrayBuffer);
    }

    export class Header extends Fragment {
        /**
         * Add page numbers
         * @param fn A function that is used to format the page numbers
         * @param opts Options
         */
        pageNumber(
            fn?: (currentPage: number, totalPage: number) => string,
            opts?: PageNumberOptions
        ): void;

        /**
         * Add page numbers
         * @param opts Options
         */
        pageNumber(opts: PageNumberOptions): void;
    }

    export class Footer extends Fragment {
        /**
         * Add page numbers
         * @param fn A function that is used to format the page numbers
         * @param opts Options
         */
        pageNumber(
            fn: (currentPage: number, totalPage: number) => string,
            opts?: PageNumberOptions
        ): void;

        /**
         * Add page numbers
         * @param opts Options
         */
        pageNumber(opts: PageNumberOptions): void;
    }

    export class Cell extends Fragment {}

    export type PageNumberOptions = {
        /**
         * Expects an pdf.Font object being either a AFM font or a OTF font
         */
        font?: Font;
        /**
         * The font size
         * default: 11
         */
        fontSize?: number;
        /**
         * The font color as hex number (e.g. 0x000000)
         * default: black
         */
        color?: number;
        /**
         * The line height
         */
        lineHeight?: number;
        /**
         * The text alignment
         * default: left
         */
        textAlign?: TextAlignment;
        /**
         * The text alignment
         * default: left
         */
        alignment?: TextAlignment;
    };

    type FragmentOptions = {
        /**
         * A pdf.Font object being either a AFM font or a OTF font
         */
        font?: Font;
        /**
         * The font size
         */
        fontSize?: number;
        /**
         * The font color as hex number (e.g. 0x000000)
         */
        color?: number;
        /**
         * The line height
         */
        lineHeight?: number;
    };

    type TextOptions = {
        /**
         * Whether to underline the text
         */
        underline?: boolean;
        /**
         * Whether to strikethrough the text
         */
        strikethrough?: boolean;
        /**
         * The text alignment
         * default: left
         */
        alignment?: TextAlignment;
        /**
         * The text alignment
         * default: left
         */
        textAlign?: TextAlignment;
        /**
         * A URI the text should link to
         */
        link?: string;
        /**
         * A name for a destination which could be used for document-local links
         */
        destination?: string;
        /**
         * The name of the document-local destination the text should link to
         */
        goTo?: string;
    } & FragmentOptions;

    export type FragmentCellOptions = {
        /**
         * The cell width
         * default: 100%
         */
        width?: number;
        /**
         * The cell minimal height
         * default: 0
         */
        minHeight?: number;
        /**
         * x coordinate of where to render the cell
         * default: undefined
         */
        x?: number;
        /**
         * y (y starts at the bottom of the document) coordinate of where to render the cell
         * default: undefined
         */
        y?: number;
        /**
         * The background color the cell
         * default: none
         */
        backgroundColor?: number;
        /**
         * The border width of the cell
         * default: 0
         */
        borderWidth?: number;
        /**
         * The top border width of the cell
         * default: 0
         */
        borderTopWidth?: number;
        /**
         * The tight border width of the cell
         * default: 0
         */
        borderRightWidth?: number;
        /**
         * The bottom border width of the cell
         * default: 0
         */
        borderBottomWidth?: number;
        /**
         * The left border width of the cell
         * default: 0
         */
        borderLeftWidth?: number;
        /**
         * The border color of the cell
         * default: black
         */
        borderColor?: number;
        /**
         * The top border color of the cell
         * default: black
         */
        borderTopColor?: number;
        /**
         * The right border color of the cell
         * default: black
         */
        borderRightColor?: number;
        /**
         * The bottom border color of the cell
         * default: black
         */
        borderBottomColor?: number;
        /**
         * The left border color of the cell
         * default: black
         */
        borderLeftColor?: number;
    } & PaddingOptions;

    export type ImageOptions = {
        /**
         * The image width
         * default: auto
         */
        width?: number;
        /**
         * The image height
         * default: auto
         */
        height?: number;
        /**
         * x coordinate of where to render the image
         * default: undefined
         */
        x?: number;
        /**
         * y (y starts at the bottom of the document) coordinate of where to render the image
         * default: undefined
         */
        y?: number;
        /**
         * Whether to wrap text or not
         * default: false
         */
        wrap?: boolean;
        /**
         * Horizontal alignment of the image (left, center or right)
         * default: left
         */
        align?: ImageAlignment;
        /**
         * A URI the image should link to
         */
        link?: string;
        /**
         * A name for a destination which could be used for document-local links
         */
        destination?: string;
        /**
         * The name of the document-local destination the image should link to
         */
        goTo?: string;
    };

    export type TableOptions = {
        /**
         * An array of the widths of all table columns
         */
        widths: ("*" | number | null)[];
        /**
         * The table width
         */
        width?: number;
        /**
         * The width of all borders
         * default: 0
         */
        borderWidth?: number;
        /**
         * The color of all borders
         * default: black
         */
        borderColor?: number;
        /**
         * The border width of all vertical borders of the table
         * default: none
         */
        borderVerticalWidth?: number;
        /**
         * An array defining the widths of all vertical borders of the table
         * default: none
         */
        borderVerticalWidths?: number[];
        /**
         * The border color of all vertical borders of the table
         * default: black
         */
        borderVerticalColor?: number;
        /**
         * An array defining the colors of all vertical borders of the table
         * default: none
         */
        borderVerticalColors?: number[];
        /**
         * The border width of all horizontal borders
         * default: 0
         */
        borderHorizontalWidth?: number;
        /**
         * A function that is used to determine the width of all horizontal borders (e.g. i => i * 5)
         * default: none
         */
        borderHorizontalWidths?: (rowIndex: number) => number;
        /**
         * The border color of all horizontal borders
         * default: black
         */
        borderHorizontalColor?: number;
        /**
         * A function that is used to determine the color of all horizontal borders
         * default: none
         */
        borderHorizontalColors?: (rowIndex: number) => number;
    } & FragmentOptions & TableCellOptions;

    type TableCellOptions = {
        /**
         * The cell minimal height
         * default: 0
         */
        minHeight?: number;
        /**
         * How many columns the cell should span
         * default: 1
         */
        colspan?: number;
        /**
         * The background color the cell
         * default: none
         */
        backgroundColor?: number;
    } & PaddingOptions;

    type DocumentOptions = {
        /**
         * A pdf.Font object being either a AFM font or a OTF font
         */
        font: Font;
        /**
         * The page width
         */
        width?: number;
        /**
         * The page height
         */
        height?: number;
        /**
         * Document properties
         */
        properties?: DocumentProperties;
        highWaterMark?: number;
    } & FragmentOptions & PaddingOptions;

    type PaddingOptions = {
        /**
         * The cell padding
         * default: 0
         */
        padding?: number;
        /**
         * The cell top padding
         * default: 0
         */
        paddingTop?: number;
        /**
         * The cell right padding
         * default: 0
         */
        paddingRight?: number;
        /**
         * The cell bottom padding
         * default: 0
         */
        paddingBottom?: number;
        /**
         * The cell left padding
         * default: 0
         */
        paddingLeft?: number;
    };

    export type TextAlignment = "left" | "right" | "center" | "justify";
    export type ImageAlignment = "left" | "right" | "center";
}
