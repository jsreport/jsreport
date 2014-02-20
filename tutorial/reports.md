#Reports extension

Everytime you call jsreport API to render report, you will get back stream with report content. This is usefull when you want to display report directly to the user or you want to store the result in your data storage for later use. But sometimes you just don't want the report in the time of generation and you don't want to store it on your own. In this case you can use `Reports` extension and let the jsreport store the report for you.

`Reports` extension adds the option `SaveResult`to the API and rendering process that will store every rendered report to jsreport server and also adds the response header `Permanent-Link` that you can use later to actualy download report content. Modified example from the API then looks like this:

> `POST:` https://test.jsreportonline.net/report
> `BODY:`
>```js 
   { 
      "template": { "shortid" : "g1PyBkARK" },
      "data" : { ... },
     ["options": { "SaveResult": true }]
   } 
>```

`Reports` extension also adds several usecases to the jsreport studio in which you can see recently rendered reports and so on.

? screen of the reports in studio ?

> you can use API and odata endpoint to query or CRUD reports:  https://test.jsreportonline.net/odata/reports

