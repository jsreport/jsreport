export default jsreportInstance;
declare const jsreportInstance: JsReportClient;
declare class JsReportClient {
    headers: {};
    _normalizeUrl(baseUrl: any, ...paths: any[]): string;
    _jsreportRequest({ method, path, body }: {
        method: any;
        path: any;
        body: any;
    }): Promise<Response>;
    _submitFormRequest(req: any, target: any, title: any): void;
    /**
     * Render report in remote server and initiate download
     * This method doesn't support submitting to jsreport with authentication enabled
     * @param {filename} new tab title
     * @param {RenderRequest} renderRequest
     */
    download(filename: any, req: any): void;
    /**
     * Render report in remote server and open in new tab
     * This method doesn't support submitting to jsreport with authentication enabled
     * @param {Object} options
     * @param {string} options.filename
     * @param {string} options.title
     * @param {RenderRequest} renderRequest
     */
    openInWindow({ title, filename }: {
        filename: string;
        title: string;
    }, req: any): void;
    /**
     * Render report in remote server
     * @param {RenderRequest} renderRequest
     * @returns {Promise<RenderResponse>}
     */
    render(renderRequest: RenderRequest): Promise<RenderResponse>;
    /**
     * Create new instance of the client, this is rarely needed and you can use the default in the most of the cases
     * @returns {JsReportClient}
     */
    createClient(): JsReportClient;
}
declare class RenderResponse {
    constructor(res: any);
    _response: any;
    /**
     * Return the fetch original response
     */
    get response(): any;
    /**
     * Returns Promise<string> content of the response
     * @returns {Promise<string>}
     */
    toString(): Promise<string>;
    /**
     * Invoke save of the output content as the file
     * @param {string} afilename  - filename to save the file as
     */
    download(afilename: string): Promise<void>;
    /**
     * Returns Promise<Blob> content of the response
     * @returns {Promise<Blob>}
     */
    toBlob(): Promise<Blob>;
    /**
     *  Return Promise<string> data URI of the response
     * @returns {Promise<string>}
     */
    toDataURI(): Promise<string>;
    /**
     * Opens the response content in a new browser window
     * @param {Object} options - optional configs passed to the window.open
     * @param {string} options.windowName - name of the window
     * @param {string} options.windowFeatures - features of the window
     * @param {Number} options.cleanInterval - how often to check if the window is closed to clean up the object URL
     * @param {Number} options.title - tab title name
     * @returns {Promise<Window}
     */
    openInWindow({ cleanInterval, windowName, windowFeatures, title }?: {
        windowName: string;
        windowFeatures: string;
        cleanInterval: number;
        title: number;
    }): Promise<Window>;
    /**
     * Return the response as object URL. Remember you need to revoke the object URL when you are done with it
     * @returns {Promise<string>}
     */
    toObjectURL(): Promise<string>;
}
