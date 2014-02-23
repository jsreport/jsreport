#Scripts extension

jsreport is designed to be highly extensible, but defining your own recipe or extension is often not necessary for simple customizations. Let's say you want to add standard set of helper functions to templates or you want to actively download and include some input data from jsreport server. For these kind of things jsreport offers `Scripts` extension.

`Scripts` extensions allows you to run any custom code in javascript before the actual report rendering process starts. This script is evaluated on the jsreport server in the sandbox but allows you to modify rendering process inputs.

Every script can access global variable called `request` to modify process inputs. Any script can alter:

 - `request.template.html`
 - `request.template.helpers`
 - `request.data`

Every script is interpreted asynchronously and you need to call global `done()` function when the script is finished.

Follows the example of script that is downloading rss data from bbc and creates items collection on the input data which template can later iterate over and render.
```js
//some of the node modules like feedparser are available to use
var FeedParser = require("feedparser");

request.data = { items: [] };

require('request')('http://www.bbc.co.uk/nature/collections.rss')
   .pipe(new FeedParser())
   .on('readable', function () {
       var stream = this, item;
       while (item = stream.read()) {
           request.data.items.push(item);
       }
   })
   //done is a function script must call at the end to signal async script is done
   .on("end", done);
```