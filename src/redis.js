const redis = require('redis');
const fs = require('fs');
const _ = require('underscore');
const zlib = require('zlib');
const xmlStream = require('xml-stream');
require('redis-streams')(redis);
var multiStream = require('multistream');

var redisClient = null

var all_activities = {};

export function connectRedisClient() {
    redisClient = redis.createClient();

    redisClient.on('connect', function () {
        console.log('Redis client connected!');
    });
}

// Filter xml population file to set and add them to redis
export function loadPopulation() {

    // delete all sets
    redisClient.keys('*', function (err, keys) {
        if (err)
            console.log(err);
        else {
            keys.filter(function (key) {
                deleteSet(key);
            });
        }
    });

    var xml = null;
    try {
        // Create stream from population gzip file
        var readStream = fs.createReadStream('../../ees-data/scenarios/surf-coast-shire/typical-summer-weekday-50k/scenario_matsim_plans.xml.gz')
            .pipe(zlib.createGunzip());

        readStream.on('error', function (err) {
            console.log('Error loading population xml: ', err);
        });

        // Create xml stream and only retain activity tags
        xml = new xmlStream(readStream);
        xml.collect('activity');
        xml.on('endElement: activity', function (activity) {
            processActivities(activity);
        });

        // After xml stream ends add activity sets to redis
        xml.on('end', function () {
            // go through all keys in the map and add values to redis
            Object.keys(all_activities).filter(function (key) {
                setValues(key, all_activities[key][key]);

                // delete object so we wouldn't keep holding it in memory
                delete all_activities[key];

            });
        });

    } catch (e) {
        console.log('Error loading population xml: ', e.stack);
    }
}

export function getPopulationStream({ keys }) {

    var activityStreamsArr = [];

    // Collects an array of streams of requeseted activities 
    keys.filter(function (key) {
        activityStreamsArr.push(redisClient.readStream(key))
    });

    // runs array of multiple streams in sequence
    var activityStreams = multiStream(activityStreamsArr);

    activityStreams.on('end', function () {
        console.log('multistream ended');
    });

    activityStreams.on('error', function () {
        console.log('error reading multple streams array');
    });

    return activityStreams;
}

export function getPopulationSets({ keys }) {
    return new Promise(function (resolve, reject) {
        redisClient.multi()
            .get(keys[0])
            .get(keys[1])
            .get(keys[2])
            .get(keys[3])
            .get(keys[4])
            .get(keys[5])
            .exec(function (err, reply) {
                if (err)
                    reject(err);
                else
                    resolve(reply);
            });
    });
}

// Add elements to activity redis lists
function pushToRedisList(activity) {
    _.filter(activity,
        function (innerActivityObject) {
            var activityJson = JSON.stringify(innerActivityObject);
            var name = 'activities_' + innerActivityObject.type;
            redisClient.rpush(name, activityJson, function (err, reply) {
                if (err)
                    console.log('Error adding ' + activity + ': ', err);
            });
        });
}

function deleteSet(key) {
    redisClient.del(key, function (err, reply) {
        if (err)
            console.log(err)
        else
            console.log(key + ' deleted');
    });
}

// Add a set to redis
function setValues(key, set) {
    var setJson = JSON.stringify(set);
    redisClient.set(key, setJson, function (err, reply) {
        if (reply)
            console.log(key + ': ', reply);
        if (err)
            console.log('Error adding ' + key + ': ', err);
    });
}

// Generates lists on the fly given the activities stream
function processActivities(activity) {
    _.filter(activity,
        function (innerActivityObject) {
            // generate list key
            var key = 'activities_' + innerActivityObject.type;
            // if key does not exist, create a map on the fly using the key with an empty list value
            if (!all_activities[key]) {
                all_activities[key] = { [key]: [] };
            }

            // push element to key's list
            all_activities[key][key].push(innerActivityObject);
        });
}