# CDCM
`cdcm` is community driven content management module. This module gets content stored in a folder structure (composed of json, markdown, and images) and creates consumable data. 

Check out a content repository in action here: [https://github.com/RevolutionVA/website2017](https://github.com/RevolutionVA/website2017)

```js
const cdcm = require( 'cdcm' );
```
Get the module.


```js
let config = {
    zipUrl : 'https://github.com/RevolutionVA/website2017/archive/master.zip',
    localPath : './master',
    cdnUrl : 'https://raw.githubusercontent.com/revolutionva/website2017/master'
};
```

Set the configuration.

- `zipUrl` : The url of a zip folder (required if `localPath` not set)
- `localPath` : The local path to a directory (as if you unzipped the folder locally) 
- `cdnUrl` : The url to prepend linked files with.
- `tempDir` : The temporary directory to move files to before processing (default : `'/.tmp-cdcm'`)
- `linkFileExt` : The files to create CDN links to. Defaults are [`.png`,`.jpg`].

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