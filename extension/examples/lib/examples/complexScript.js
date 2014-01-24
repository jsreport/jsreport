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
   .on("end", done);