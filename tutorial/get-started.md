# Getting started

This is the very first article from series of tutorials about jsreport, business reporting platform based on javascript. This article is kind of "Hello world" into jsreport which will cover basic principles you need to understand to get started with jsreport. You may see the full list of all tutorials [here](http://jsreport.net/learn). 

## Basic concepts

To be able to render reports, you need to have access to first jsreport server first. The server is responsible for rendering reports and it also hosts html based studio you can use to design and maintain your report templates.

You can choose from three versions of jsreport server: 

 * [playground](http://jsreport.net/plaground) for trying and fiddling with reports
 * [on-prem](http://jsreport.net/on-prem) for installing jsreport on your server
 * [online](http://jsreport.net/online) for using multitenant SaaS jsreport in the cloud

How to install jsreport on your server or how to register to online version is not topic of this article, but you can read about it if you will follow the links. It does not matter which version you choose right now. Basic principles are applicable to all of them so if you haven't decided yet you can just open [playground](http://jsreport.net/plaground) and continue with the tutorial. 

When you have jsreport server you need to create a report template defining how will the report look like and how it will be rendered. The best way to define report template is to use html based studio which is hosted in jsreport server and you can access it using any web browser.

?studio screenshot?

Typical scenario is that you will define a report template during design time and call jsreport API in runtime to render reports. The input of rendering process is the report template and some kind of a data report will display. For example if you want a monthly sales report for your company. You will have one report template, but the report data will be different every month.

?schema of architecture, worflow?

## Report templates

Report template together with the rendering process is the hearth of jsreport. Template defines how will the result report look like and it's used together with input data every time you render a new report.

### Templating engines

The templates are defined using common javascript templating engines (like [jsrender](https://github.com/BorisMoore/jsrender) or [handlebars](http://handlebarsjs.com/)). You can bind input data, use loops, conditions or javascript helpers... Templating engines basicaly provides you way to define any custom report you like.

```html
<div class="entry">
  {{#if author}}
    <h1>{{firstName}} {{lastName}}</h1>
  {{else}}
    <h1>Unknown Author</h1>
  {{/if}}
</div>
```

Every template can use different templating engine. And it's up to you which you will choose. They have very similar feature scope and only use different syntax, but every one has different prefferences.

?specify engine in the studio screen?

### Recipes
jsreport is not only great for rendering output formats based on xml like html. It can also easily convert html into pdf using [phantomjs](phantomjs.org). Or even generate precise pdf using [Apache FOP](http://xmlgraphics.apache.org/fop). You can customize the rendering process and output format with specifying report template recipe. 

?specify recipe in the studio screen?

Currently there are three recipes you can choose:

1. `html` - only use specified templating engine and output html result
2. `phantom-pdf` - use html recipe to render html and print html into pdf using phantomjs
3. `fop-pdf` - apply specified templating engine on the fop based xml and transform using xslt transformations into pdf using Apache FOP

Many other recipes should come in the near future, or you can even define your own.

## Extensions
jsreport is designed to be highly extensible from the start. You can not only define your own recipes but you can also define your own extensions that will add special attributes to the templates or customize jsreport studio. jsreport ships out of the box with several extensions and if you want to read more about it, follow the next tutorials. 
