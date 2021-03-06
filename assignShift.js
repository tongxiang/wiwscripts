// takes a shift from a user and assigns it to another user. 

var WhenIWork = require('wheniwork-unofficial');
var moment = require('moment');

var config = require('./config.js');

var api = new WhenIWork(config.wheniwork.api_key, config.wheniwork.username, config.wheniwork.password);

// 1) email of user for shift to be removed from, 2) shift ID of shift to be moved, 3) userID of new user to assign shifts to
function assignShift(email, shiftID, newUserID) {
	var newUserID = newUserID;
	api.get('users', function (users) {
	    users = users.users;
	    for (var i in users) {
	        if (users[i].email == email) {
	            var q = {
	                user_id: users[i].id,
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
	            	console.log('response from getting original shift: \n', response); 
	            	var shift = response.shift
	            	var notes = JSON.parse(response.shift.notes)
	            	parentShift = parseInt(notes.parent_shift);

	            	// Then, using that parent_shift param, delete all shifts with that parent_shift param. 
	            	api.get('shifts', q, function (shifts) {
	            		// console.log('shifts returned: ', shifts);
	            	    var batchPayload = [];
	            	    for (var i in shifts.shifts) {
	            	        var shift = shifts.shifts[i];
	            	       	var childNotes = JSON.parse(shift.notes);
	            	        console.log('parsing shift with id of ', shift.id, ', notes.parent_shift: ', childNotes.parent_shift, ' actual parentShift id: ', parentShift);

	            	        if (parseInt(childNotes.parent_shift) === parentShift) {
	            	        	console.log('new shift with id of ', shift.id, ' added to batch, notes.parent_shift: ', childNotes.parent_shift, ' actual parentShift id: ', parentShift);

	            	        	if (Math.abs(moment().diff(moment(shift.start_time, 'ddd, DD MMM YYYY HH:mm:ss ZZ'), 'days')) < 8) {
	            	        	    var requestToReassignShift = {
	            	        	        "method": 'PUT',
	            	        	        "url": "/2/shifts/" + shift.id,
	            	        	        "params": {
	            	        	            user_id: newUserID, 
	            	        	            notes: ''
	            	        	        }
	            	        	    }
	            	        	    batchPayload.push(requestToReassignShift);
            	        		}
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
	            	        console.log('***All shifts in shift chain with shift ' + shiftID + 'belonging to ' + email + 'have been reassigned to ' + newUserID + '.*** \n RESPONSE: \n', response);
	            	    })
	            	});
	            });
	            break;
	        }
	    }
	});
}

// assignShift('admin+schwartzcamerongmailcom@crisistextline.org', '279305455', '5677279');

module.exports = assignShift;