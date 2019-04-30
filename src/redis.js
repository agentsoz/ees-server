const redis = require('redis');
var xml2js = require('xml2js').parseString;
const fs = require('fs');
const _ = require('underscore');
const zlib = require('zlib');
const xmlStream = require('xml-stream');

var redisClient = null

var activities_home = [];
var activities_work = [];
var activities_shops = [];
var activities_beach = [];
var activities_other = [];
var activities_end = [];

export function connectRedisClient() {
    redisClient = redis.createClient();

    redisClient.on('connect', function () {
        console.log('Redis client connected!');
    });
}

// Filter xml population file to set and add them to redis
export function loadPopulation() {

    redisClient.del('activities_end');
    redisClient.del('activities_other');
    redisClient.del('activities_beach');
    redisClient.del('activities_shops');
    redisClient.del('activities_home');
    redisClient.del('activities_work');

    var xml = null;
    try {
        // Create stream from population gzip file
        var readStream = fs.createReadStream('../../ees/test/output/io/github/agentsoz/ees/TypicalSummerWeekday50kTest/testTypicalSummerWeekday50k/matsim/output_plans.xml.gz')
            .pipe(zlib.createGunzip());

        // Create xml stream and only retain activity tags
        xml = new xmlStream(readStream);
        xml.collect('activity');
        xml.on('endElement: activity', function (activity) {
            processActivities(activity);
        });

        // After xml stream ends add activity sets to redis
        xml.on('end', function () {
            addSet('activities_home', activities_home);
            addSet('activities_work', activities_work);
            addSet('activities_shops', activities_shops);
            addSet('activities_beach', activities_beach);
            addSet('activities_other', activities_other);
            addSet('activities_end', activities_end);
        });

    } catch (e) {
        console.log('Error loading population xml: ', e.stack);
    }
}

export function getPopulationSets({ home, work, shops, beach, other, end }) {
    return new Promise(function (resolve, reject) {
        var allActivitiesSet = [];
        if (home) {
            redisClient.get('activities_home', function (err, reply) {
                allActivitiesSet = allActivitiesSet.concat(reply);
            });
        }

        if (work) {
            redisClient.get('activities_work', function (err, reply) {
                allActivitiesSet = allActivitiesSet.concat(reply);
                resolve(allActivitiesSet);
            });
        }

        if (shops) {
            redisClient.get('activities_shops', function (err, reply) {
                allActivitiesSet = allActivitiesSet.concat(reply);
            });
        }

        if (beach) {
            redisClient.get('activities_beach', function (err, reply) {
                allActivitiesSet = allActivitiesSet.concat(reply);
            });
        }

        if (other) {
            redisClient.get('activities_other', function (err, reply) {
                allActivitiesSet = allActivitiesSet.concat(reply);
            });
        }

        if (end) {
            redisClient.get('activities_end', function (err, reply) {
                allActivitiesSet = allActivitiesSet.concat(reply);
            });
        }
    });
}

// Add a set to redis
function addSet(name, set) {
    var setJson = JSON.stringify(set);
    redisClient.set(name, setJson, function (err, reply) {
        if (reply)
            console.log(name + ': ', reply);
        if (err)
            console.log('Error adding ' + name + ': ', err);
    });
}

// Allocates activity to its appropriate set
function processActivities(activity) {
    _.filter(activity,
        function (innerActivityObject) {
            switch (innerActivityObject.type) {
                case 'home':
                    activities_home.push(innerActivityObject);
                    break;
                case 'work':
                    activities_work.push(innerActivityObject);
                    break;
                case 'shops':
                    activities_shops.push(innerActivityObject);
                    break;
                case 'beach':
                    activities_beach.push(innerActivityObject);
                    break;
                case 'other':
                    activities_other.push(innerActivityObject);
                    break;
                case 'end':
                    activities_end.push(innerActivityObject);
                    break;
            }
        });
}