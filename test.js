const cdcm = require( './index' );

let config = {
    zipUrl : 'https://github.com/RevolutionVA/website2017/archive/master.zip',
    cdnUrl : 'https://raw.githubusercontent.com/revolutionva/website2017/master'
};

cdcm( config )
    .getData()
    .then( data => {
        console.log( JSON.stringify( data, null, '\t' ) );
    } )
    .catch( err => {
        console.error( err );
    } );