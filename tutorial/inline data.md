#Inline data extension

The input to the report generation process is the report template and some json input data. You will provide these data to the jsreport API in the runtime, but it's not very effective to call jsreport API every time you want to see how will the report look like. There for jsreport comes with extension `Inline Data`.

`Inline data` extension allows you to statically define input data directly in jsreport studio and easilly test your templates. The input data are defined using json syntax. You can define single input data and reuse them in many templates in `online` and `on-prem` version where you can use only one data for one template in `playground`.

? screen of inline data ?


