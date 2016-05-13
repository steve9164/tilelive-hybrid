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
    this.open = false;

    var that = this;
    var p = nodefn.call(fs.readFile, uri.pathname, 'utf8').then(function(json) {
        config = JSON.parse(json);
        var promises = [];
        return when.map(config.sources, function(item) {
            if (item.minZ === undefined) item.minZ = 0;
            if (item.maxZ === undefined) item.maxZ = Infinity;
            console.log('Adding ' + item.source);
            // Add each source to _sources
            return nodefn.call(tilelive.load, item.source).then(function(source) {
                that._sources.push({ source: source, minZ: item.minZ, maxZ: item.maxZ });
            });
        });
    }).then(function() {
        that.open = true;
    }).yield(this);
    nodefn.bindCallback(p, callback);
}

Hybrid.registerProtocols = function(tilelive) {
    tilelive.protocols['hybrid:'] = Hybrid;
};

Hybrid.prototype.close = function(callback) {
    var that = this;
    when.map(this._sources, function(item) {
        return nodefn.call(item.source.close.bind(item.source));
    }).then(function() {
        // Release memory of sources
        that._sources = null;
        that.open = false;
        callback();
    }).catch(function(err) {
        callback(err);
    });
};

function getSource(sources, z, x, y) {
    for (var i = 0; i < sources.length; i++) {
        var item = sources[i];
        if (item.minZ <= z && z <= item.maxZ) {
            return item.source;
        }
    }
    return null;
}

// Get the tile from the first listed source that supports the zoom level
Hybrid.prototype.getTile = function(z, x, y, callback) {
    if (!this.open) return callback(new Error('Hybrid data sources not yet loaded'));
    var source = getSource(this._sources, z, x, y);
    return (source) ? source.getTile(z, x, y, callback) : callback(new Error('No sources for zoom level z=' + z));
};

// Hybrid is made to refer to the same set of data in multiple sources (pre-generated tiles and tiles generated as needed),
// each source's info should be the same, hence returning info from the first source should be fine
Hybrid.prototype.getInfo = function(callback) {
    if (!this.open) return callback(new Error('Hybrid data sources not yet loaded'));
    if (this._sources && this._sources.length > 0) {
        this._sources[this._sources.length-1].source.getInfo(console.log);
        return this._sources[this._sources.length-1].source.getInfo(callback);
    }
    return callback(new Error('No sources'));
};

// Used by steve9164/tilelive-cache
Hybrid.prototype.tileIsCached = function(z, x, y) {
    var source = getSource(this._sources, z, x, y);
    return (source) ? source instanceof MBTiles : null;
}
