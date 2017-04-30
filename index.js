'use strict';

const request = require( 'request' );
const fsx = require( 'fs-extra' ) || {};
const AdmZip = require( 'adm-zip' ) || {};
const marked = require( 'marked' );
const path = require( 'path' );

module.exports = function (config) {

    config = Object.assign( {
        zipUrl : false,
        cdnUrl : false,
        localPath : false,
        tempDir : '/.tmp-cdcm',
        verbose : 1000
    }, config );

    config.tempDir = process.cwd() + config.tempDir;

    config.zipFilePath = config.tempDir + '/tmp.zip';

    let timeout = false;

    return {
        getData : function getData () {

            if ( config.verbose )
                timeout = setTimeout( () => console.log( 'Getting data...' ), config.verbose );

            return getContent( config )
                .then( () => {

                    return generateData( config );
                } )
                .then( data => {

                    if ( timeout ) clearTimeout( timeout );
                    return Promise.resolve( data );
                } );
        }
    };

    function getContent () {

        return fsx.emptyDir( config.tempDir )
            .then( () => {

                if ( config.localPath && fsx.pathExistsSync( config.localPath ) && isDirectory( config.localPath ) ) {

                    return Promise.resolve();
                }
                else if ( config.zipUrl ) {

                    return getFromUrl();
                }

                return Promise.reject( 'Enter a valid localPath or config.zipUrl.' );
            } );

        function getFromUrl () {

            return downloadZip()
                .then( () => {
                    return extractZip();
                } )
                .then( () => {
                    return copyExtractedFiles();
                } )
        }

        function downloadZip () {

            return new Promise( (resolve, reject) => {

                return request( { url : config.zipUrl, encoding : null }, (err, resp, zipFile) => {
                    if ( err ) {
                        reject( err );
                    }

                    fsx.removeSync( config.zipFilePath );

                    fsx.writeFile( config.zipFilePath, zipFile, (err) => {

                        if ( err ) {
                            reject( err );
                        }

                        resolve( config.zipFilePath );
                    } );
                } );
            } );
        }

        function extractZip () {

            const zip = new AdmZip( config.zipFilePath );

            zip.extractAllTo( config.tempDir, true );

            fsx.removeSync( config.zipFilePath );

            return Promise.resolve();
        }

        function copyExtractedFiles () {

            fsx.readdirSync( config.tempDir )
                .forEach( extractFolder => {

                    let unzippedFolderPath = config.tempDir + '/' + extractFolder;

                    if ( isDirectory( unzippedFolderPath ) ) {

                        copyFiles( unzippedFolderPath, config.tempDir );

                    } else {
                        fsx.copySync( extractFolder, config.tempDir );
                    }

                    fsx.removeSync( unzippedFolderPath );
                } );

            return Promise.resolve();
        }

        function copyFiles (from, to) {

            fsx.readdirSync( from )
                .filter( file => !file.startsWith( '.' ) )
                .forEach( file => {
                    fsx.copySync( from + '/' + file, to + '/' + file );
                } );

            return Promise.resolve( to );
        }
    }

    function generateData () {

        let contentTypesRaw = fsx.readdirSync( config.tempDir );

        return contentTypesRaw
            .map( file => {

                const filePath = config.tempDir + '/' + file;

                let items = [];

                let type = file;

                if ( isDirectory( filePath ) ) {

                    items = processItemsDir( filePath, file );

                } else if ( '.json' === path.extname( file ) ) {

                    items = fsx.readJsonSync( filePath, 'utf-8' );

                    type = path.basename( file, '.json' );

                } else {
                    return false;
                }

                items = Array.isArray( items ) ? items : [ items ];

                items = typeProcessor( type )( items );

                return { items, type };

            } )
            .filter( items => items );

        function processItemsDir (dirPath, typeName) {

            let items = [];

            let itemFiles = fsx.readdirSync( dirPath )
                .filter( slug => {
                    return isDirectory( dirPath + '/' + slug )
                        && !slug.startsWith( '_' )
                        && !slug.startsWith( '.' )
                        && slug.toLowerCase() !== 'readme.md';
                } );

            itemFiles.forEach( slug => {

                let itemDirPath = dirPath + '/' + slug;

                let itemSource = { slug : slug };

                let itemContents = fsx.readdirSync( itemDirPath );

                let processedFiles = itemContents.map( file => {

                    let filePath = itemDirPath + '/' + file;
                    let fileName = path.basename( file, path.extname( file ) );
                    let extension = path.extname( file );

                    return fileProcessor( extension )( typeName, slug, fileName, filePath, itemSource );
                } );

                items.push( Object.assign( {}, ...processedFiles ) );

            } );

            return items;
        }

        function fileProcessor (fileExt) {

            let p = {

                '.md' : function (typeName, slug, fileName, filePath, source) {
                    const markdownContent = fsx.readFileSync( filePath, 'utf-8' );
                    source[ fileName ] = marked( markdownContent );
                    return source;
                },
                '.json' : function (typeName, slug, fileName, filePath, source) {

                    const data = fsx.readJsonSync( filePath, { throws : false } );
                    return Object.assign( source, data || {} );
                },
                '.png' : function (typeName, slug, fileName, filePath, source) {

                    source[ fileName ] = config.cdnUrl + '/'
                        + typeName + '/' + slug + '/' + fileName + '.png';
                    return source;
                },
                '.jpg' : function (typeName, slug, fileName, filePath, source) {

                    source[ fileName ] = config.cdnUrl + '/'
                        + typeName + '/' + slug + '/' + fileName + '.jpg';
                    return source;
                }
            };

            return function (typeName, slug, fileName, filePath, source) {

                if ( p.hasOwnProperty( fileExt ) && typeof p[ fileExt ] === 'function' ) {

                    source = p[ fileExt ]( typeName, slug, fileName, filePath, source );
                }

                return source;
            }
        }

        function typeProcessor (type) {

            let p = {
                'humans' : function (item) {
                    item.role = Array.isArray( item.role ) ? item.role : [ item.role ];
                    return item;
                }
            };

            return function (items) {

                if ( p.hasOwnProperty( type ) && typeof p[ type ] === 'function' ) {

                    items = items.map( item => p[ type ]( item ) );
                }

                return items;
            }
        }
    }
};

function isDirectory (path) {
    return fsx.lstatSync( path ).isDirectory();
}
