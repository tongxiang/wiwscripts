// Retrieves all shifts for a given user. 

var WhenIWork = require('wheniwork-unofficial');
var moment = require('moment');

var config = require('./config.js');

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

function retrieveShifts(userID) {
	var q = {
	    user_id: userID,
	    start: moment().add(-1, 'day').format('YYYY-MM-DD 00:00:00'),
	    end: moment().add(8, 'day').format('YYYY-MM-DD HH:mm:ss'),
	    location_id: config.locationID.regular_shifts
	};

	console.log(q)

	api.get('shifts', q, function (shifts) {
		console.log(shifts);

	});
}

module.exports = retrieveShifts;