export default jsreportInstance;
declare const jsreportInstance: JsReportClient;
declare class JsReportClient {
    headers: {};
    _jsreportRequest({ method, path, body }: {
        method: any;
        path: any;
        body: any;
    }): Promise<Response>;
    /**
     * Render report in remote server
     * @param {RenderRequest} renderRequest
     * @returns {Promise<RenderResponse>}
     */
    render(renderRequest: any): Promise<RenderResponse>;
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
     * @param {Object} options - optinal configs passed to the window.open
     * @param {string} options.windowName - name of the window
     * @param {string} options.windowFeatures - features of the window
     * @param {Number} options.cleanInterval - how often to check if the window is closed to clean up the object URL
     * @returns {Promise<Window}
     */
    openInWindow({ cleanInterval, windowName, windowFeatures }?: {
        windowName: string;
        windowFeatures: string;
        cleanInterval: number;
    }): Promise<Window>;
    /**
     * Return the response as object URL. Remember you need to revoke the object URL when you are done with it
     * @returns {Promise<string>}
     */
    toObjectURL(): Promise<string>;
}
