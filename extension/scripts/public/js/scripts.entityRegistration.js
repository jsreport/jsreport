define([], function() {
    return function(context) {
        $data.Class.define("$entity.Script", $data.Entity, null, {
            '_id':{ 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
            'content': { 'type': 'Edm.String' },
            'name': { 'type': 'Edm.String' },
            'shortid': { 'type': 'Edm.String' },
            "creationDate": { type: "date" },
            "modificationDate": { type: "date" }
        }, null);

        $data.Class.define("$entity.ScriptRefType", $data.Entity, null, {
            content: { type: 'Edm.String' },
            shortid: { type: 'Edm.String' }
        });

        $entity.Script.prototype.toString = function () {
            return "Script " + (this.name || "");
        };

        $entity.Template.addMember("script", { 'type': "$entity.ScriptRefType" });
        //back compatibility
        $entity.Template.addMember("scriptId", { 'type': "Edm.String" });

        context["scripts"] = { type: $data.EntitySet, elementType: $entity.Script };
    };
})