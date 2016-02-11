/*var url = require('url');
var path = require('path');
var mapnik = require('mapnik');


var sm = new (require('sphericalmercator'))();
var immediate = global.setImmediate || process.nextTick;
var mapnik_pool = require('mapnik-pool');
var Pool = mapnik_pool.Pool;
var os = require('os');*/

var fs = require('fs');
var qs = require('querystring');
var when = require('when');
var nodefn = require('when/node');

var tilelive = require('tilelive');
require('tilelive-bridge').registerProtocols(tilelive);
var MBTiles = require('mbtiles'); // Need instanceof MBTiles
MBTiles.registerProtocols(tilelive);
//var tilecache = new (require("node-cache"))();


module.exports = Hybrid;

function Hybrid(uri, callback) {
    //console.log(uri);
    // From node-mbtiles
    if (typeof uri === 'string') {
        uri = url.parse(uri, true);
        uri.pathname = qs.unescape(uri.pathname);
    }
    else if (typeof uri.query === 'string') uri.query = qs.parse(uri.query);

    if (!uri.pathname) {
        callback(new Error('Invalid URI ' + url.format(uri)));
        return;
    }

    if (uri.hostname === '.' || uri.hostname == '..') {
        uri.pathname = uri.hostname + uri.pathname;
        delete uri.hostname;
        delete uri.host;
    }
    uri.query = uri.query || {};
    if (!uri.query.batch) uri.query.batch = 100;

    this._sources = [];

    var that = this;

    this._open = nodefn.call(fs.readFile, uri.pathname, 'utf8').then(function(json) {
        config = JSON.parse(json);
        var promises = [];
        return when.map(config.sources, function(item) {
            console.log('Adding ' + item.source);
            // Add each source to _sources
            return nodefn.call(tilelive.load, item.source).then(function(source) {
                that._sources.push({ source: source, minZ: item.minZ, maxZ: item.maxZ });
            });
        });
    }).yield(this);

    nodefn.bindCallback(this._open, callback);
}

Hybrid.registerProtocols = function(tilelive) {
    tilelive.protocols['hybrid:'] = Hybrid;
};


Hybrid.prototype.open = function(callback) {
    console.log('checking open');
    nodefn.bindCallback(this._open, callback);
};

// Allows in-place update of XML/backends.
Hybrid.prototype.update = function(opts, callback) {
    console.log('update called');
    /*// Unset maxzoom. Will be re-set on first getTile.
    this._maxzoom = undefined;
    // Unset type. Will be re-set on first getTile.
    this._type = undefined;
    this._xml = opts.xml;
    this._readonly_map = new mapnik.Map(1,1);
    var mopts = { strict: false, base: this._base + '/' };
    this._readonly_map.fromString(this._xml,mopts,function(err) {
        if (err) {
            return callback(err);
        }
        this.close(function() {
            this._map = mapnikPool.fromString(this._xml,
                { size: 256, bufferSize: 256 },
                mopts);
            this._im = ImagePool(512);
            return callback();
        }.bind(this));
    }.bind(this));*/
    callback(new Error('update not defined'));
};

Hybrid.prototype.close = function(callback) {
    var that = this;
    console.log('Closing');
    when.map(this._sources, function(item) {
        return nodefn.call(item.close.bind(item));
    }).then(function() {
        // Release memory of sources
        delete that._sources;
        callback();
    })

};

function getSource(z, x, y) {
    for (var i = 0; i < this._sources.length; i++) {
        var item = this._sources[i];
        if (item.minZ <= z && z <= item.maxZ) {
            return item.source;
        }
    }
    return null;
}

// Get the tile from the first listed source that supports the zoom level
Hybrid.prototype.getTile = function(z, x, y, callback) {
    console.log('Getting ' + [z,x,y].join('/') + '.pbf');
    var source = getSource.call(this, z, x, y);
    return (source) ? source.getTile(z, x, y, callback) : callback(new Error('No sources for zoom level z=' + z));
};

// Hybrid is made to refer to the same set of data in multiple sources (pre-generated tiles and tiles generated as needed),
// each source's info should be the same, hence returning info from the first source should be fine
Hybrid.prototype.getInfo = function(callback) {
    console.log('getInfo called');
    if (this._sources && this._sources.length > 0) {
        this._sources[1].source.getInfo(console.log);
        return this._sources[1].source.getInfo(callback);
    }
    return callback(new Error('No sources'));
};

Hybrid.prototype.getIndexableDocs = function(pointer, callback) {
    console.log('getIndexableDocs called');
    callback(new Error('getIndexableDocs not defined'));
};

Hybrid.prototype.tileIsCached = function(z, x, y) {
    var source = getSource.call(this, z, x, y);
    return (source) ? source instanceof MBTiles : null;
}
