/**
  how to use:
  Pull time off requests from this page: https://app.wheniwork.com/requests/
  Convert it to JSON, then require it within the retrieveUserEmailsFromNames.js file and then run the function.
**/

var WhenIWork = require('wheniwork-unofficial');
// var moment = require('moment');
var fs = require('fs');
// var async = require('async');
var json2csv = require('json2csv');

var config = require('./config.js');
var date_format = 'YYYY-MM-DD HH:mm:ss';
var millisecondsInDay = 86400000;
var timeOffRequests = require('./requests');

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

function convertCSV(timeOffRequests) {

  api.get('users', function (dataResponse) {
    var users = dataResponse.users
      , user
      , templateData
      , userNameTimeOff
      , userNameUsers
      ;

    for (var j = 0; j < timeOffRequests.length; j++) {
      userName = timeOffRequests[j].Employee;
      for (var i = 0; i < users.length; i++) {
        userNameUsers = users[i].first_name + ' ' + users[i].last_name;
        if (userNameUsers === userName) {
          try {
            var canonicalEmail = JSON.parse(users[i].notes).canonicalEmail;
          }
          catch(e) {
            console.log('JSON.parse failed: ', e);
          }
          if (canonicalEmail) {
            timeOffRequests[j].email = canonicalEmail;
          }
          else {
            timeOffRequests[j].email = users[i].email;
          }
        }
      }
    }

    fs.writeFile('convertedEmails.json', JSON.stringify(timeOffRequests), function(err) {
        if (err) { throw err; }
        console.log('file saved!');
    });
  });
}

convertCSV(timeOffRequests);
