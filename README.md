# CDCM
`cdcm` is community driven content management module. This module gets content stored in a folder structure (composed of json, markdown, and images) and creates consumable data. 

```js
let cdcm = require( 'cdcm' );
```
Get the module.


```js
let config = {
    zipUrl : 'https://github.com/RevolutionVA/website2017/archive/master.zip',
    cdnUrl : 'https://raw.githubusercontent.com/revolutionva/website2017/master'
};
```

Set the configuration.


```js
cdcm( config )
    .getData()
    .then( data => {
        console.log( JSON.stringify( data, null, '\t' ) );
    } )
    .catch( err => {
        console.error( err );
    } );
````

Running `.getData()` returns each an array of data types, their name, and collection of items.

Original developed as part of the [Revolution Conf](http://revolutionconf.com) website.