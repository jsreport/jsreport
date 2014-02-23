#Child templates extension

Sometimes you will get into situation where you find out that your report templates are starting to be too complicated. The html gets bigger and you need to copy paste several parts between templates quite often. You may consider using `Child templates` extension in this situation.

`Child templates` allows you to include report templates into each other even in multiple levels. For example you want to have a same first page for every template. It's tedious to copy paste the same code to every template. With `Child templates` extension you can separate first page into single template and reference it from other templates. 

Realization is very easy. You just create a standard template for first page and let's call it `Preamble template` and in every template where you want to have this first page just insert special tag `{#Preamble template}`.

`Child templates` works in the way that for every report rendering it searches for special tag `{#template name}` and replace it content with real report output. It basicaly call whole rendering process for child template and include result instead of `{#template name}` special tag.

> `Child templates` extension can be used to centralize your css styles into one child template and include css to all other templates.

