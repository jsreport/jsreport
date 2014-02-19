#API

You can communicate with jsreport using it's REST based API. jsreport will provide some wrappers for the most popular languages but using it directly is very easy when jsreport client wrapper does not exist for your language. This article is about using jsreport API in it's raw natural form. 

jsreport API is split into two different use cases:

1. Rendering reports - call when you need to invoke rendering process
2. Querying and CRUD - for maintaining templates, exporting ...

Next two sections are describing these use cases in detail.

>You should sent body in json format. Content negotiation is supported for some parts of API, but anyway it's not recommended since jsreport is running in the server in javascript.

## Rendering report
Invoking rendering process is the most common API method you will call. The next snippet shows the service enpoint url as well as the body schema.

> `POST:` https://test.jsreportonline.net/report
> `BODY:`
>```js 
   { 
      "template": { "shortid" : "g1PyBkARK" },
      "data" : { ... },
     ["options": { timeout: 60000 }]
   } 
>```



## Querying and CRUD

[odata](http://www.odata.org)

## Authentication
`On-Premise` jsreport version is currently single user based. There for you can reach the API on the same url as the studio is hosted on using `https` and you don't need to send any authorization headers.

`Online` jsreport version uses [basic http authentication](http://en.wikipedia.org/wiki/Basic_access_authentication) so you should be able to authenticate easily from any platform using your userename and password sent throught authorization header.

`Playground` version is just for fiddling and does not provide any API.


