//some of the node modules like feedparser are available to use
var FeedParser = require("feedparser");

//request.template.content
//request.template.helpers
//request.data
//are available to be modified and change the rendering inputs
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