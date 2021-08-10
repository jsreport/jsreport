# @jsreport/jsreport-pug

**Use [pug](https://pugjs.org) templating engine in [jsreport](https://github.com/jsreport/jsreport/tree/master/packages/jsreport) and [jsreport-core](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-core)**

```bash
npm install @jsreport/jsreport-pug
```

You can access the input data through pug locals and you can find helpers on `templateHelpers`
```html
doctype html
html(lang="en")
  head
  body
    p Hello from helper: #{templateHelpers.hello()}
    p Hello from input data: #{hello}
```

**Guide: jsreport-cli with pug template engine instalation**
1. Create a local folder that will hold the server, i.e. (~/myTools/jsreport)
2. Go to that directory (cd ~/myTools/jsreport)
3. Do ```yarn global add @jsreport/jsreport-cli``` (you can also use ```npm install -g @jsreport/jsreport-cli```)
4. Execute ```jsreport init``` (this will create folder structure)
5. Add this template engine or anyother (i.e. ejs) this command: ```yarn add @jsreport/jsreport-pug```
6. Start the server with this command ```jsreport start```

When jsreport starts, it looks for engines in node_modules folder and if it founds any it loads them with no extra configuration.

**See the [playground example](https://playground.jsreport.net/studio/workspace/Vy9Y0fHz-/3)**
