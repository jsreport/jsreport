## specification

the terms used in this specification refer to some special fields of an entity, the identifier `_id` and the humanReadableKey `shortid` fields, for now we will use just **`_id`** and **`shortid`** to mention these fields.

the logic assumes we want the import/export flow to be incremental and for that the best is that we follow some rules.

## rules

1. we should always **preserve local `_id`**
2. we should always **preserve local `shortid`**
3. we should always try to **reuse and keep the `_id` and `shortid` fields from the export file, and only in case of conflict re-generate it on the export file**
4. when there is **conflict about `_id` then we just regenerate it on the export file** and continue with the expected operation (insert or update)
5. when we need to **regenerate `shortid` field we should always fix the references to that field on the export file**

### logic

the logic is based on the idea that we should detect duplicates by the **entity path**, and according to that decide if we need to process the entity as a new one or as an update to it.

1. **no collision on path**
    1. **no conflict of shortid** -> **insert** normally, nothing to fix on the export file here
    2. **shortid conflict** -> two things can happen here
        1. **target path of the import is the same than the parent path of local entity in conflict** -> if we ever get to this point it means that the entity was just renamed, and then we should just **update existing with values from export file,** nothing to fix on the export file here
        2. **target path of the import is different than the parent path of local entity in conflict** -> **insert with new shortid and update references on the export file to the new generated shortid**
2. **collision on path**
    1. **no conflict of shortid** -> **update existing with values from export file except shortid, update references on the export file to the shortid of local**
    2. **shortid conflict** -> **update existing entity** normally**,** nothing to fix on the export file here

as we can see from the above notes, an entity will either be **inserted** or **updated** depending if there is collision on path or not

### handling renames and import of duplicated entities into folder

renaming an entity is covered on point `1.2.1` of the logic, described in the following case:

- on your local you have entity `/a`, you export it and import it into another instance, on that instance you change the name of that entity to `/b`, then you export it and want to integrate such changes into your local. so in this case when you do the import your target path is the root `/`, since there will be a `shortid` conflict here and the entity on local with the conflict `/a` is at the same level `/` than the target path of the import `/` then this case will enter to the `1.2.1` point of the logic and just do an update and the rename is done as expected.

importing of duplicated entity into folder is covered on point `1.2.2` of the logic, described in the followin case:

- on your local you have entity `/a`, you export it and import it into another instance, on that instance you change the name of that entity to `/b`, then you export it and want to integrate such changes into your local, however in this case you want to import it into another folder, let's say a folder called `folder1`, then your target path will be `/folder1`, since there will be a `shortid` conflict here but the entity on local with the conflict `/a` is not at the same level `/` of target path of import `/folder1` then this case will enter to the `1.2.2` point of the logic and just insert a new entity as expected.

### **Caveats:**

- since we will now update shortid and references to new values there are some cases which we won't be able to automatically "fix", for example if user does api calls with { template: { shortid: 'xx' } } or document store reads in scripts using old shortid then such code can break. this can happen in the **update entity case**, if you for example create entity /a/b on you local, then in other machine you also create /a/b and export, then if you try to import that export file on your local the new logic will detect a conflict by entity path
