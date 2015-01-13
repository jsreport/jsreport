/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * text recipe simply just evaluates engines and return the defined content type.
 */ 

module.exports  = function (reporter, definition) {

    reporter.templates.TemplateType.addMember("contentType", { type: "string" });
    reporter.templates.TemplateType.addMember("fileExtension", { type: "string" });
    reporter.templates.TemplateType.addMember("contentDisposition", { type: "string" });

    reporter.extensionsManager.recipes.push({
        name: "text",
        execute: function(request, response) {
            response.headers["Content-Type"] = request.template.contentType;
            response.headers["File-Extension"] = request.template.fileExtension;

            request.template.contentDisposition =  request.template.contentDisposition || "inline";
                        response.headers["Content-Disposition"] = request.template.contentDisposition + (request.template.contentDisposition.indexOf(";") !== -1 ? "" :
                                                        ";filename=report." + request.template.fileExtension);

            return reporter.renderContent(request, response);
        }
    });
};