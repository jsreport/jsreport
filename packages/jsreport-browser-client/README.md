# @jsreport/jsreport-browser-client
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-browser-client.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-browser-client)

**Adds recipe html-with-browser-client which creates html output with attached [jsreport browser client script](http://jsreport.net/learn/browser-client).**

The html output is then extended with [jsreport](http://jsreport.net/learn/browser-client) global object. That can be used to invoke jsreport server rendering directly from the output report.

See the [browser-client](http://jsreport.net/learn/browser-client) for API documentation.


## Export part of the report to PDF
The most simple scenario. You have html report but you want to additionally add controls for printing particular parts into PDF.
```html
<div id='printedArea'>
    <h1>Hello world</h1>
</div>
<input type='button' onclick='print()' value='print me'></input>
<script>
    function print() {
        jsreport.download('report.pdf', {
          template: {
              content: document.getElementById('printedArea').innerHTML,
              engine: 'none',
              recipe: 'phantom-pdf'
        }});
    }
</script>
```


## Drill down to sub report
Also very common scenario. The report is too complex to display at once and you want let the users to drill down to particular sections.

The master template can contain several links to the detail drill down. Every link can then render different template and also push additional information through data property.
```html
Hello from master....
<input type='button' onclick='detail()' value='Drill down'></input>

<script>
    function detail() {
        jsreport.render('_self', {name: 'detail', data: { detailId: 'foo' }});
    }
</script>
```

The detail template can use data provided from the master template or use [custom script](http://jsreport.net/learn/scripts) to actively fetch required data. There can be also `back` button for navigating back to the master template.
```html
Hello from detail {{detailId}} ....
<input type='button' onclick='window.history.back()' value='back'/>

<script>
    function detail() {
        jsreport.render('_self', { template: { name: 'master'} })
    }
</script>
```

The whole usecase can be implemented also through AJAX calls, this can prevent URL changes.

```js
jsreport.renderAsync({ template: { name: 'master'} }).then(function(r) {
	document.open();
    document.write(r.toString());
    document.close();
});
```


## Editable templates
The last example shows how to use the [jsreport borwser client](http://jsreport.net/learn/browser-client) to edit and preview the template in third party WYSIWYG editor.

```html
<script src="//cdn.tinymce.com/4/tinymce.min.js"></script>

<div>
    <input type='button' value='Edit Template' id='editACE' onclick='edit()'/>
    <input type='button' value='Save' id='refresh' onclick='refresh()'/>
</div>

<div id='editorBox'>
</div>

<div id="reportBox" >
</div>

<script>
    var template;
    var templateName = 'My editable report template';
    var data = { foo: '...' };

    //load template definition so we can edit it's content
    jsreport.getTemplateByName(templateName).then(function(r) {
       template = r;
    });

    //also render into the preview pane
    jsreport.render('reportBox', {
      template: { name: templateName },
      data: data
    });

    //open editor with the edited template content
    function edit() {
        tinymce.init({ selector:'#editorBox' });
        tinyMCE.activeEditor.setContent(template.content);
    }

    //save the template with updated content and preview
    function refresh() {
        template.content = tinyMCE.activeEditor.getContent()
        tinyMCE.activeEditor.destroy();
        document.getElementById('editorBox').innerHTML = '';
        jsreport.updateTemplate(template).then(function() {
            jsreport.render('reportBox', {
	            template: { name: templateName },
	            data: data
	        });
        });
    }

</script>
```

## Changelog

### 4.1.0

- internal changes to support new `response.output` api

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.1.2

- fix url normalization. it was breaking playground serverUrl

### 3.1.1

- changes to enable caching of system helpers

## License
MIT
