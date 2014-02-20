# .NET client

jsreport ships with .NET c# client which wraps REST API and is very convenient to use if you are in .NET environment. 

> jsreport .net client is portable and you can use it in wp8, .net, silverlight, monodroid and monotouch applications

## Get Started

I am assuming that you already hace access to jsreport server and understand basic concept. If you don't, please follow instruction in the get started tutorial.

When you have access to jsreport server you need to install nuget package containing .NET client or download it from [github](https://github.com/jsreport/net).
> PM> Install-Package jsreport.Client 

Main facade you will use to access jsreport from c# is called `ReportingService`. This class has different constructor overloads for on-prem and online version:

>on-prem
>```c#
>var service = new ReportingService("https://192.168.02.01");
>```

>online
>```c#
>var service = new ReportingService("https://[subdomain].jsreportonline.net", "email", "password");
>```

When you have the `ReportingService` instance, you will most likely want to invoke report rendering. In the most common case, you will grab `shortid` from jsreport studio, collect some data and invoke rendering.

```c#
var report = await service.RenderAsync("g1xcKBanJc", new {someData = "foo"});
new StreamReader(report.Content).ReadToEnd();
```

##Advanced rendering

If you want to have full control on template rendering you can use `RenderAsync` overload which accepts `RenderRequest` instance that allows you to fill bunch of other options. For example if you have some kind of a dynamic template, you don't need to specify template shortid and you can construct template content in c#.

```c#
var report = await service.RenderAsync(new RenderRequest() {
                template = new Template()
                {
                    recipe = "html",
                    content = "some dynamic template content"
                },
                data = new { firstName = "Jan", surname = "Blaha" }
            });
```

`Template` class contains only attributes that are in the core of jsreport, but many extensions are extending templates and adding additional attributes. What if you want to fill these additional attributes? For this purposes `Template` class contains dynamic additional property you can fill with any extension attributes and client will serialize them into template body.

```c#
var report = await service.RenderAsync(new RenderRequest() {
                template = new Template() {  shortid = "asd34fsd"  },
                additional = new {
                        phantom = new {
                            header = "specific header override"
                        }
                    }
            });
```

The best way in these scenarios is to use jsreport studio api helper to get possible values. API helper  is located at the report template. You can read more about it in the API article.

##Using reports extension

When you have `reports` extension enabled, you can send `saveResult=true`  option and let the jsreport server to take care of storing output report. You just need to store output `report.PermanentLink` and later use it for downloading actual report content.

```c#
var report = await service.RenderAsync(new RenderRequest()
            {
                template = new Template() { shortid = "g1xcKBanJc" },
                options = new RenderOptions() { saveResult = true }
            });

var loadedReport = await _reportingService.ReadReportAsync(report.PermanentLink);
```

##Odata

jsreport .net client does not include any wrap for odata API jsreport provides because there are already many libraries  you can use. Let's just quickly give you some hints how to communicate with jsreport odata api throught [Simple.OData.Client](https://github.com/object/Simple.OData.Client)

You need to first install Simple.OData.Client using nuget
> PM> Install-Package Simple.OData.Client 

Then you need to instantiate `ODataClient` instance. When you have on-premise verion of jsreport, it's very simple:

```c#
var odataClient = new ODataClient("https://192.168.02.01/odata");
```

When you are using jsreport online, it's little bit tricky because of authentication. You need to provide a basic authorization header for every request odata client makes. 

```c#
var odataClient = new ODataClient(new ODataClientSettings() {
                UrlBase = "https://pofider.local.net:3000/odata",
                BeforeRequest = (r) =>
                {
                    var encoded = System.Convert.ToBase64String(
                        System.Text.Encoding.UTF8.GetBytes("email:password"));
                    r.Headers["Authorization"] = "Basic " + encoded;
                }
});
```

When you have `odataClient` you can do all the crazy stuff odata provides. It's recommended to use `odataClient` dynamic API because of flexible nature of jsreport. Every time you enable/disable a jsreport extension the odata schema can be changed and you would need to upgrade your entities without dynamic using dynamic API.

To understand entities jsreport odata api provides see standard odata $metadata endpoint

> https://192.168.02.01/odata/$metadata

For jsreport online

> https://[subdomain].jsreportonline.net/odata/$metadata

### Filtering

```c#
dynamic x = ODataDynamic.Expression;
var entry = odataClient.For(x.templates)
                       .Filter(x.shortid == "g1xcKBanJc")
                       .FindEntry();
```                             


### Modifying entries


```c#
dynamic x = ODataDynamic.Expression;

var entry = odataClient.For(x.templates)
                       .Filter(x.shortid == "g1xcKBanJc")
                       .FindEntry();
                       
odataClient.For(x.templates)
           .Key(entry._id)
           //mention that you need currently send original _id with every update 
           .Set(new { name = "foo", _id = entry._id })
           .UpdateEntry();
```

## License 

(The MIT License)

Copyright (c) 2014 Jan Blaha &lt;jan.blaha@hotmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.