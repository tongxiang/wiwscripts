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

// Currently finds ALL time off requests GREATER than 7 days, the intervals of which BEGIN or END in FEB or MARCH.
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
        var allRequests = response.requests;
        var relevantRequests = allRequests;

        var relevantRequests = allRequests.filter(function(request) {
            var parsedStartMonth = moment(request.start_time).format('MM');
            var parsedEndMonth = moment(request.end_time).format('MM');
            var startsInFebOrMarch = (parsedStartMonth === '02' || parsedStartMonth === '03');
            var endsInFebOrMarch = (parsedEndMonth === '02' || parsedEndMonth === '03');
            var diffInMilliseconds = moment(request.end_time) - moment(request.start_time);
            var timeOffGreaterThanAWeek = false;
            // console.log(diffInMilliseconds, '-->', (diffInMilliseconds / (1000*60*60*24)))
            if ((diffInMilliseconds / (1000*60*60*24)) > 7) {
                timeOffGreaterThanAWeek = true;
            }
            if ((startsInFebOrMarch || endsInFebOrMarch) && timeOffGreaterThanAWeek) {
                // console.log('saving this');
                return true;
            }
            // console.log('not saving this');
            return false;
        })

        async.map(relevantRequests, retrieveUserNameAndEmailReturnTransformedItem, function(err, results) {
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
