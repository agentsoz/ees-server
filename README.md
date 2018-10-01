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
