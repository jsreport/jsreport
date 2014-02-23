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

In the most typical case, you will just insert your template shortid and input data. The best way to find out shortid and to get other informations is to use API button in the template designer. This button will popup dialog with very usefull informations for the particular template you should have in order to render it using API.

? screen of the api button and dialog ?

Using this dialog is quite important because options you have may be different based on the extensions you have activated. 

> See the POST response headers to get usefull informations about report like content type.

In the advanced scenario where you have some kind of a dynamic template, you can remove `shortid` value from the request and fill template attributes manually as you want. Look at the following snippet rendering simple hello world.

> `POST:` https://test.jsreportonline.net/report
> `BODY:`
>```js 
   { 
      "template": { "html" : "Hello world", "recipe" : "phantom-pdf" },
   } 
>```

## Querying and CRUD

Querying and CRUD API in jsreport is based on [odata](http://www.odata.org) protocol. You can use it to query or CRUD any object jsreport server contains. For example, to get list of all jsreport entities, you can call standard odata notation endpoint.

> `GET:` https://test.jsreportonline.net/odata/$metadata

Or to get list of all template names:

> `GET:` http://test.jsreportonline.net/odata/templates?$select=name

Odata protocol has client libraries for various languages and you should be able to find a wrapper for yours [here](http://www.odata.org/libraries).

## Authentication
`On-Premise` jsreport version is currently single user based. There for you can reach the API on the same url as the studio is hosted on using `https` and you don't need to send any authorization headers.

`Online` jsreport version uses [basic http authentication](http://en.wikipedia.org/wiki/Basic_access_authentication) so you should be able to authenticate easily from any platform using your userename and password sent throught authorization header.

`Playground` version is just for fiddling and does not provide any API.


