tilelive-hybrid
---------------
Implements the tilelive API for serving tiles from multiple tilelive sources depending on the requested zoom level. Ideal for vector tile sources where some zoom levels use pre-generated tiles and other zoom levels generate tiles from a mapnik data source

### new Hybrid(options, callback)

- *xml*: a Mapnik XML string that will be used to generate vector tiles.
- *base*: Optional, basepath for Mapnik map. Defaults to `__dirname`.

## Installation

    npm install steve9164/tilelive-hybrid

Though `tilelive` is not a dependency of `tilelive-hybrid` you will want to
install it to actually make use of `tilelive-hybrid` through a reasonable
API.

## Usage

```javascript
var tilelive = require('tilelive');
require('tilelive-hybrid').registerProtocols(tilelive);

tilelive.load('hybrid:///path/to/file.json', function(err, source) {
    if (err) throw err;

    // Interface is in XYZ/Google coordinates.
    // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
    source.getTile(0, 0, 0, function(err, tile, headers) {
        // `err` is an error object when generation failed, otherwise null.
        // `tile` contains the compressed image file as a Buffer
        // `headers` is a hash with HTTP headers for the image.
    });

    // The `.getGrid` is implemented accordingly.
});
```

## Example JSON hybrid configuration

```json
{
    "sources": [
        {
            "source": "mbtiles://C:/Users/sdavies/Documents/tilelive/server-config/data/FID_SA4_2011_AUST/store_backup.mbtiles",
            "minZ": 3,
            "maxZ": 11
        },
        {
            "source": "bridge://C:/Users/sdavies/Documents/tilelive/server-config/data/FID_SA4_2011_AUST/data.xml",
            "minZ": 0,
            "maxZ": 25
        }
    ]
}
```

This will configure tilelive-hybrid to use the mbtiles source for zoom 3 to 11 (inclusive) and the bridge source for zoom levels 0 to 2 and 12 to 25 (inclusive)
