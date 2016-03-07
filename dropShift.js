var WhenIWork = require('wheniwork-unofficial');
var moment = require('moment');

var config = require('./config.js');

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

// Removes ownership of a shift belonging to a user and changes its id to '0', opening it. 
// Also performs that function on all other shifts in that chain. 

// we want to retrieve its parent_shift param from those notes object, and then search for all notes in the chain with that. 
function dropShift(email, shiftID) {
	api.get('users', function (users) {
		var userID;
	    users = users.users;
	    for (var i in users) {
	        if (users[i].email == email) {
	        	userID = users[i].id;
	            var q = {
	                user_id: userID,
	                start: moment().add(-1, 'day').format('YYYY-MM-DD 00:00:00'),
	                end: moment().add(50, 'years').format('YYYY-MM-DD HH:mm:ss'),
	                unpublished: true,
	                location_id: config.locationID.regular_shifts
	            };

	            var parentShift;

	            // Works to delete the normal volume of shifts associated with one user (2 shifts), recurred
	            // over 50 years. API will break if significantly larger volumes of shifts are attempted
	            // to be deleted. 

	            // First retrieve parent_shift param from the initial shift we're trying to delete. 
	            api.get('shifts/' + shiftID, function(response){ 
	            	var shift = response.shift;
	            	var notes = JSON.parse(response.shift.notes);
	            	parentShift = parseInt(notes.parent_shift);
	            	console.log('response from getting original shift: \n', response); 

	            	// Then, using that parent_shift param, delete all shifts with that parent_shift param. 
	            	api.get('shifts', q, function (shifts) {
	            		// console.log('shifts returned: ', shifts);
	            	    var batchPayload = [];
	            	    for (var i in shifts.shifts) {
	            	        var shift = shifts.shifts[i];
	            	        if (parseInt(shift.user_id) !==  userID) {
	            	        	continue;
	            	        }
	            	       	var childNotes = JSON.parse(shift.notes);
	            	        // console.log('parsing shift with id of ', shift.id, ', notes.parent_shift: ', childNotes.parent_shift, ' actual parentShift id: ', parentShift);

	            	        if (parseInt(childNotes.parent_shift) === parentShift) {
	            	        	// console.log('new shift with id of ', shift.id, ' added to batch, notes.parent_shift: ', childNotes.parent_shift, ' actual parentShift id: ', parentShift);

	            	        	// If the shift starts within a week, it's a shift that needs to be converted to an 
	            	        	// open shift because the open shift job has already run and passed that day. 
	            	        	if (Math.abs(moment().diff(moment(shift.start_time, 'ddd, DD MMM YYYY HH:mm:ss ZZ'), 'days')) < 8) {
	            	        	    var reassignShiftToOpenAndRemoveNotesRequest = {
	            	        	        "method": 'PUT',
	            	        	        "url": "/2/shifts/" + shift.id,
	            	        	        "params": {
	            	        	            user_id: 0, 
	            	        	            notes: ''
	            	        	        }
	            	        	    }
	            	        	    batchPayload.push(reassignShiftToOpenAndRemoveNotesRequest);
	            	        	}
	            	        	// Otherwise, we just delete the shift. 
	            	        	else {
	            	        	    var shiftDeleteRequest = {
	            	        	        "method": "delete",
	            	        	        "url": "/2/shifts/" + shift.id,
	            	        	        "params": {},
	            	        	    };
	            	        	    batchPayload.push(shiftDeleteRequest);
	            	        	}
	            	        }
	            	    }
	            	    api.post('batch', batchPayload, function(response) {
	            	        console.log('***All shifts in shift chain with shift ' + shiftID + 'belonging to ' + email + 'have been deleted.*** \n RESPONSE: \n', response);
	            	    })
	            	});
	            });
	            break;
	        }
	    }
	});
}

module.exports = dropShift