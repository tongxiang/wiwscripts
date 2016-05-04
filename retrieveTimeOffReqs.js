var WhenIWork = require('wheniwork-unofficial');
var moment = require('moment');
var fs = require('fs');
var async = require('async');

var config = require('./config.js');
var date_format = 'YYYY-MM-DD HH:mm:ss';
var date_format = 'ddd, DD MMM YYYY HH:mm:ss ZZ';

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

var startDate = 1460952000000;
var endDate = 1462248000000;

// Currently returns all users who are taking any time off, at all, between the start date and the end date. (The time off requests call returns all time off requests that share any portion of the search interval.) More notes below.

function handleTimeOffRequests() {
    //Using moment.js to format time as WIW expects
    var startDateToRetrieveRequests = moment(startDate).format(date_format);
    var endDateToRetrieveRequests = moment(endDate).format(date_format);
    var timeOffSearchParams = {
        "start": startDateToRetrieveRequests,
        "end": endDateToRetrieveRequests,
    };

    //Get all time off requests within timeOffSearchParams
    api.get('requests', timeOffSearchParams, function(response) {
        // console.log(response)
        async.map(response.requests, retrieveUserNameAndEmailReturnTransformedItem, function(err, results) {
            fs.writeFile("timeOffRequestResponse", JSON.stringify(results), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
        })
    });
}

function retrieveUserNameAndEmailReturnTransformedItem(item, callback) {
    var userIDQueryString = 'users/' + item.user_id;
    api.get(userIDQueryString, function(response) {
        var user = response.user;
        var newItem = {};
        newItem.start_time = moment(item.start_time).format('YYYY-MM-DD');
        newItem.end_time = moment(item.end_time).format('YYYY-MM-DD');
        newItem['user_name'] = user.first_name + ' ' + user.last_name;
        newItem['user_email'] = user.email;
        console.log(newItem);
        callback(null, newItem);
        return;
    });
}

handleTimeOffRequests();

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
