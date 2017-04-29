'use strict';

const request = require( 'request' );
const fsx = require( 'fs-extra' ) || {};
const AdmZip = require( 'adm-zip' ) || {};
const marked = require( 'marked' );
const path = require( 'path' );

module.exports = function (config) {

    config = Object.assign( {
        githubBranchUrl: false,
        localPath: false,
        imageSourceUrl: false,
        tempDir: false,
        verbose: 1000
    }, config );

    config.tempDir = process.cwd() + config.tempDir;

    let gettingData = null;

    return {
        getData: function getData () {

            if ( config.verbose )
                gettingData = setTimeout( () => console.log( 'Getting data...' ), config.verbose );

            return getContent( config )
                .then( response => {
                    return generateData( response.dir, response.imgSrcUrl );
                } )
                .then( data => {

                    if ( config.verbose )
                        clearTimeout( gettingData );

                    return Promise.resolve( data );
                } );
        }
    }
};

function getContent (config) {

    return fsx.emptyDir( config.tempDir )
        .then( () => {

            let response = { dir: false, imgSrcUrl: false };

            if ( config.localPath && fsx.pathExistsSync( config.localPath ) && isDirectory( config.localPath ) ) {

                response.dir = config.localPath;
                response.imgSrcUrl = config.imageSourceUrl;
                return Promise.resolve( response );
            }
            else if ( config.githubBranchUrl ) {
                return getFromUrl( config.githubBranchUrl + '.zip', config.tempDir )
                    .then( () => {

                        response.dir = config.tempDir;
                        response.imgSrcUrl = config.githubBranchUrl
                            .replace( 'github.com', 'cdn.rawgit.com' )
                            .replace( '/archive', '' )
                        ;
                        return response;
                    } );
            }

            return Promise.reject( 'Enter a valid localPath or zipUrl.' );
        } );

    function getFromUrl (zipUrl, tmpDir) {

        return downloadZip( zipUrl, tmpDir )
            .then( zipFilePath => {
                return extractZip( zipFilePath, tmpDir );
            } )
            .then( () => {
                return copyExtractedFiles( tmpDir );
            } )
    }

    function downloadZip (zipUrl, dir) {

        return new Promise( (resolve, reject) => {

            return request( { url: zipUrl, encoding: null }, (err, resp, zipFile) => {
                if ( err ) {
                    reject( err );
                }

                let zipFilePath = dir + '/tmp.zip';

                fsx.removeSync( zipFilePath );

                fsx.writeFile( zipFilePath, zipFile, (err) => {

                    if ( err ) {
                        reject( err );
                    }

                    resolve( zipFilePath );
                } );
            } );
        } );
    }

    function extractZip (zipPath, dir) {

        const zip = new AdmZip( zipPath );

        zip.extractAllTo( dir, true );

        fsx.removeSync( zipPath );

        return Promise.resolve();
    }

    function copyExtractedFiles (dir) {

        fsx.readdirSync( dir )
            .forEach( unzippedFolder => {

                let unzippedFolderPath = dir + '/' + unzippedFolder;

                if ( isDirectory( unzippedFolderPath ) ) {
                    copyFiles( unzippedFolderPath, dir );
                } else {
                    fsx.copySync( unzippedFolder, dir );
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

function generateData (tempDir, imgSrcUrl) {

    let contentTypesRaw = fsx.readdirSync( tempDir );

    return contentTypesRaw
        .map( function (file) {

            const filePath = tempDir + '/' + file;

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

            let itemSource = { slug: slug };

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

            '.md': function (typeName, slug, fileName, filePath, source) {
                const markdownContent = fsx.readFileSync( filePath, 'utf-8' );
                source[ fileName ] = marked( markdownContent );
                return source;
            },
            '.json': function (typeName, slug, fileName, filePath, source) {

                const data = fsx.readJsonSync( filePath, { throws: false } );
                return Object.assign( source, data || {} );
            },
            '.png': function (typeName, slug, fileName, filePath, source) {

                source[ fileName ] = imgSrcUrl + '/'
                    + typeName + '/' + slug + '/' + fileName + '.png';
                return source;
            },
            '.jpg': function (typeName, slug, fileName, filePath, source) {

                source[ fileName ] = imgSrcUrl + '/'
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
            'humans': function (item) {
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

function isDirectory (path) {
    return fsx.lstatSync( path ).isDirectory();
}
