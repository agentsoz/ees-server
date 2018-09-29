## MBTiles Example

This example build a tile server to serve the MATSim network to the borwser client. Uses the [npm mbtiles package](https://www.npmjs.com/package/mbtiles).

### How to install
```
wget -O mbtiles.zip https://cloudstor.aarnet.edu.au/plus/s/a10DqAGJDP8QXFf/download
unzip -o mbtiles.zip
npm install
```

### How to run
```
npm start
```

### Notes on the `.mbtiles` file
The `mount_alexander_shire_network.mbtiles` file is a MATSim simulation network file in  [MBTiles](https://github.com/mapbox/mbtiles-spec) format. The idea is to load this database and serve each tile as requested by the browser OpenLayers client. Below are the steps to create this file.

1. Create the MATSim network (``.xml.gz`) for Mount Alexander Shire and convert it to
GeoJSON format (`.json`):
```
../../data/createExampleMATSimJsonNetworks.sh
```

2. Build `tippecanoe` (see [instructions here](https://github.com/mapbox/tippecanoe#installation)):
```
git clone git@github.com:mapbox/tippecanoe.git
cd tippecanoe
make -j
```

3. Use tippecanoe to convert the GeoJSON (`.json`) to MBTiles (`.mbtiles`) format:
```
./tippecanoe/tippecanoe \
-o mount_alexander_shire_network.mbtiles \
mount_alexander_shire_network/mount_alexander_shire_networkP.json
```
