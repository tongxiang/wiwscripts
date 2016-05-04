// The findUsersForTimeRange() function Returns the email addresses for all users who have taken shifts in a given time interval.

// We also have a bunch of



var WhenIWork = require('wheniwork-unofficial');
var moment = require('moment');
var fs = require('fs');
var async = require('async');

var config = require('./config.js');
var shiftSearchDateFormat = 'YYYY-MM-DD HH:mm:00'

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

function findUsersForTimeRange(searchStartTime, searchEndTime) {
    var query = {
        start: moment(searchStartTime).format(shiftSearchDateFormat),
        end: moment(searchEndTime).format(shiftSearchDateFormat),
        location_id: [config.locationID.regular_shifts, config.locationID.makeup_and_extra_shifts]
    }
    api.get('shifts', query, function(response) {
        var shifts = response.shifts;
        for (var i = 0; i < shifts.length; i++) {
            console.log('Shift start time: ', shifts[i].start_time, ' shift end time: ', shifts[i].end_time);
        }
        async.map(response.shifts, retrieveUserEmail, function(err, results) {
            results = uniqueArray(results);
            // Appends, rather than writes a new file so that we can run this function multiple times for multiple time intervals.
            fs.writeFile('user emails for shift starting ' + moment(searchStartTime).format(shiftSearchDateFormat) + ' and ending ' + moment(searchEndTime).format(shiftSearchDateFormat) + '.emailsTxt', JSON.stringify(results), function(err) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('The file was saved!');
            });

        });
    });

}

function uniqueArray(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

function retrieveUserEmail(item, callback) {
    var userIDQueryString = 'users/' + item.user_id;
    api.get(userIDQueryString, function(response) {
        if (response.user) {
            callback(null, response.user.email);
        } else {
            callback('error');
            return;
        }

        return;
    });
}

// findUsersForTimeRange(1462147200000 - (86400000), 1462176000000 - (86400000));

for (var i = 0; i < 7; i++) {
    // 10pm on Sunday, May 1. With 24 hours in milliseconds being added.
    var startTime = 1462147200000 + (86400000 * i);
    // 4am on Monday, May 1. With 24 hours in milliseconds being added.
    var endTime = 1462176000000 + (86400000 * i);
    findUsersForTimeRange(startTime, endTime);
}
