var WhenIWork = require('wheniwork-unofficial');
var moment = require('moment');
var fs = require('fs');
var async = require('async');
var json2csv = require('json2csv');

var config = require('./config.js');
var date_format = 'YYYY-MM-DD HH:mm:ss';
var millisecondsInDay = 86400000;

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

var startDate = 1461556800000;
// var endDate = 1462248000000;

// Currently returns all users who are taking any time off, at all, between the start date and the end date. (The time off requests call returns all time off requests that share any portion of the search interval.) More notes below.

// Note that we can only retrieve up to 200 time off requests per call. So we'll need to run this in a loop.

function retrieveRequests(startDate) {
    var taskArray = []

    for (var i = 0; i < 14; i++) {
        var task = function(callback) {
            //Using moment.js to format time as WIW expects
            var intervalStartTime = startDate + i * millisecondsInDay;
            var intervalEndTime = startDate + (i + 1) * millisecondsInDay;
            var startDateToRetrieveRequests = moment(intervalStartTime).format(date_format);
            var endDateToRetrieveRequests = moment(intervalEndTime).format(date_format);
            var timeOffSearchParams = {
                "start": startDateToRetrieveRequests,
                "end": endDateToRetrieveRequests,
            };

            //Get all time off requests within timeOffSearchParams
            api.get('requests', timeOffSearchParams, function(response) {
                async.map(response.requests, retrieveUserNameAndEmailReturnTransformedItem, function(err, results) {
                    if (err) {
                        callback('error', err);
                        return;
                    }
                    callback(null, results);
                    return;
                })
            });
        }
        taskArray.push(task);
    }

    async.series(taskArray, function(err, results) {
        var finalResults = results[0];
        for (var i = 1; i < results.length; i++) {
            finalResults.concat(results[i]);
        }
        finalResults = removeDupUsersAndReturnArray(finalResults);
        json2csv({data: finalResults, fields: ['start_time', 'end_time', 'user_name', 'user_email']}, function(err, csv) {
            if (err) { console.log(err); }
            fs.writeFile('timeOffRequestResponse', csv, function(err) {
                if (err) { throw err; }
                console.log('file saved!');
            });
        });
    });

}

function removeDupUsersAndReturnArray(targetArray) {
    var seen = {};
    var returnArray = [];
    for (var i = 0 ; i < targetArray.length; i++) {
        // Handles empty categories.
        if (!targetArray[i]) {
            continue;
        }
        if (!seen[targetArray[i].user_email]) {
            returnArray.push(targetArray[i]);
            seen[targetArray[i].user_email] = true;
        }
    }
    return returnArray;
}

function retrieveUserNameAndEmailReturnTransformedItem(item, callback) {
    var userIDQueryString = 'users/' + item.user_id;
    api.get(userIDQueryString, function(response) {
        if (!response.user) {
            console.log('error in retrieving user data, continuing: ');
            callback('error in retrieving user data', null);
            return;
        }
        var user = response.user;
        var newItem = {};
        newItem.start_time = moment(item.start_time).format('YYYY-MM-DD');
        newItem.end_time = moment(item.end_time).format('YYYY-MM-DD');
        newItem['user_name'] = user.first_name + ' ' + user.last_name;
        newItem['user_email'] = JSON.parse(user.notes).canonicalEmail;
        callback(null, newItem);
        return;
    });
}

retrieveRequests(startDate);

/**

TimeOff Request API query parameters:
When retrieving time off requests, you will receive any requests that have time between the dates you pass. However, the end date is not inclusive. If you were to do a request like this:

/2/requests?start=2016-05-01&end=2016-05-03

you would not receive any requests on 2016-05-03 since it assumes a time of 00:00:00 and is looking for anything before that time. Basically, it sees

 /2/requests?start=2016-05-01 00:00:00&end=2016-05-03 00:00:00

If you instead sent a request like this:

/2/requests?start=2016-05-01&end=2016-05-03 23:59:59

you would receive requests that had time through the day on 05/03.

So, to break scenarios down further, a request of

/2/requests?start=2016-05-01&end=2016-05-03 23:59:59

would include the following requests since they have time that cross that span:

2016-05-01 00:00:00 - 2016-05-01 23:59:59

2016-04-01 00:00:00 - 2016-05-02 00:00:00

2016-04-01 00:00:00 - 2016-05-04 00:00:00

2016-05-03 00:00:00 - 2016-05-03 23:59:59

**/
