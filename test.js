let cdcm = require( './index' );

let config = {
    githubBranchUrl: 'https://github.com/RevolutionVA/website2017/archive/master',
    //localPath: process.cwd() + '/.source',
    //imageSourceUrl : '/assets/images',
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