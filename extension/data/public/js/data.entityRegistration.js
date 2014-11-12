define([], function() {
    return function(context) {
        $data.Class.define("$entity.DataItem", $data.Entity, null, {
            'shortid': { 'type': 'Edm.String' },
            'name': { 'type': 'Edm.String' },
            "creationDate": { type: "date" },
            "modificationDate": { type: "date" },
            'dataJson': { 'type': 'Edm.String' }
        }, null);

        $entity.DataItem.prototype.toString = function () {
            return "DataItem " + (this.name || "");
        };

        $data.Class.define("$entity.DataItemRefType", $data.Entity, null, {
            dataJson: { type: 'Edm.String' },
            shortid: { type: 'Edm.String' }
        });


        $entity.Template.addMember("data", { 'type': "$entity.DataItemRefType" });
        //back compatibility
        $entity.Template.addMember("dataItemId", { 'type': "Edm.String" });

        $entity.DataItem.addMember('_id', { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' });
        context["data"] = { type: $data.EntitySet, elementType: $entity.DataItem };
    };
});