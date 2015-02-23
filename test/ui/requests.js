var requests = {};

requests.extensions = [
    {"name":"express","main":"lib/reporter.express.js","dependencies":[],"options":{},"isRegistered":true},
    {"name":"templates","main":"lib/templates.js","embeddedSupport":true,"dependencies":[],"options":{},"isRegistered":true},
    {"name":"excel-parser","main":"lib/excelParser.js","dependencies":[],"hasPublicPart":false,"options":{}},
    {"name":"html","main":"lib/html.js","hasPublicPart":false,"dependencies":[],"options":{},"isRegistered":true},
    {"name":"fop-pdf","main":"lib/fop.js","hasPublicPart":false,"dependencies":[],"options":{}},
    {"name":"authentication","main":"lib/authentication.js","hasPublicPart":false,"dependencies":[],"isRegistered":true},
    {"name":"client-html","main":"lib/main.js","embeddedSupport":true,"dependencies":[],"options":{},"isRegistered":true},
    {"name":"data","main":"lib/data.js","dependencies":["templates"],"embeddedSupport":true,"options":{},"isRegistered":true},
    {"name":"childTemplates","main":"lib/childTemplates.js","dependencies":["templates"],"hasPublicPart":false,"options":{},"isRegistered":true},
    {"name":"images","main":"lib/images.js","dependencies":["templates"],"options":{},"isRegistered":true},
    {"name":"phantom-pdf","main":"lib/phantom.js","dependencies":["templates"],"embeddedSupport":true,"options":{},"isRegistered":true},
    {"name":"reports","main":"lib/reports.js","dependencies":["templates"],"options":{},"isRegistered":true},
    {"name":"scripts","main":"lib/scripts.js","dependencies":["templates","data"],"embeddedSupport":true,"options":{},"isRegistered":true},
    {"name":"statistics","main":"lib/statistics.js","dependencies":["templates","reports"],"options":{}},
    {"name":"sample-template","main":"lib/sample.js","dependencies":["templates","data","phantom-pdf"],"hasPublicPart":false,"options":{}},
    {"name":"embedding","main":"lib/embedding.js","hasPublicPart":false,"dependencies":["templates","scripts","data","phantom-pdf","html"],"options":{},"isRegistered":true},
    {"name":"authorization","main":"lib/authorization.js","hasPublicPart":false,"dependencies":["templates","scripts","data","phantom-pdf","html"],"isRegistered":true}];

requests.settings = "{\"@odata.context\":\"http://localhost:4000/odata/$metadata#settings\",\"value\":[{\"key\":\"test\",\"value\":\"val\",\"_id\":\"LQvHqWikuLvzoedR\"},{\"key\":\"sample-created\",\"value\":true,\"_id\":\"ik14eL19bFojKOEE\"}]}";
