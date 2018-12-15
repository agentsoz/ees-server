## Emergency Evacuation Simulator - Web Server

### Setup for developers

The only requirement before starting is to ensure that you have
[`npm`](https://www.npmjs.com/get-npm) installed. If `npm -v` on the
command line gives something meaningful then skip this section,
else read on.

Npm ships with [Node.js](https://nodejs.org/en/) and the best way to
install that is via [NVM](https://github.com/creationix/nvm#installation)
which allows you to not only switch between Node versions as needed, but
also allows `npm` to install packages in the user account without
`sudo` access. In short, do this:
```
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
nvm install node
```
Check that `npm` is now installed by trying `npm -v`.


### How to build

For a dev build that will build and run the server locally, as well as watch for changes (while you code) and automatically reload build and reload the server:
```
npm run dev
```

To build and run a production server do:
```
npm run build && npm start
```

### Adding regions and fires
A region is represented by a MATSim road network on which the simulation will be run.
The EES server can serve mbtiles, and will automatically download and serve from a list
in `src/index.js`. Example region:
```
// Shape name: mount_alexander_shire_networkP
// NOTE: This name must be used as the matsimNetworkLayer attribute in the UI
tiledict["mount_alexander_shire_network"] = { // unique identifier and download file name
  // unique network path used to address each network when requesting tiles
  region: "mount-alexander-shire",
  // initial download location (server will download this on first run)
  download: "https://cloudstor.aarnet.edu.au/plus/s/oh23zw4a0Vy4PNQ/download"
}
```


Phoenix fire geojson can also be hosted by the ees-server. These are geojson formatted files
and are also downloaded on first run of the server. These are listed in `src/index.js`.
```
phoenixdict["20181109_mountalex_evac_ffdi50a_grid.shp.json"] = // destination filename
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi50a_grid.shp.json" // download location
```
