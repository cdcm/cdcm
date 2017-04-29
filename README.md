# CDCM
Community driven content management. This module get content stored in a github repos (composed of json, markdown, and images) and creates consumable data. 

<pre>

let cdcm = require( 'cdcm' );

let config = {
    githubBranchUrl: 'https://github.com/RevolutionVA/website2017/archive/master',
    tempDir: '/.tmp-cdcm'
};

cdcm( config )
    .getData()
    .then( data => {
        console.log( JSON.stringify( data, null, '\t' ) );
    } )
    .catch( err => {
        console.error( err );
    } );

</pre>

Original developed as part of the [Revolution Conf](http://revolutionconf.com) website.