(function (vision) {
	vision.flickerURL = 'https://s3.amazonaws.com/files.d20.io/images/4277467/iQYjFOsYC5JsuOPUCI9RGA/thumb.png?1401938659';
	vision.flickerPeriod = 400;
	vision.lightRadiusDelta = 0.15;
	vision.flickerInterval = false;

	vision.version = 0.001;
	vision.schemaVersion = 0.001;

	vision.registerHandlers = function () {
		on('chat:message', vision.handleInput);
		on('destroy:graphic', vision.handleTokenDelete);
		on("change:graphic", vision.checkForTokenMove);

		log('vision ' + vision.version + ' ready');
	};

	vision.checkInstall = function () {
		if( ! _.has(state,'Vision') || state.Vision.version !==  vision.schemaVersion) {
			log('  > Updating Schema to v' +  vision.schemaVersion + ' <');
			/* Default Settings stored in the state. */
			state.Vision = {
				version:  vision.schemaVersion,
				flickers: {}
			};
		}

		vision.flickerInterval = setInterval(vision.animateFlicker, vision.flickerPeriod);
	};


	vision.handleInput = function (msg) {
		if(msg.type !== 'api') {
			return;
		}
		var args = msg.content.split(/\s+--/);
		switch(args[0]) {
			case '!day':
				vision.getSelectedToken(msg, '', vision.day);
				break;
			case '!night':
				vision.getSelectedToken(msg, '', vision.night);
				break;
			case '!torch':
				vision.getSelectedToken(msg, 'verify', vision.torch);
				break;
			case '!darkvision':
				break;
		}
	}
	vision.dayNightToggle = function (token, dayNight) {
		var page = getObj('page', (token && token.get('pageid')) || Campaign().get('playerpageid'));

		if(page) {
			page.set({
				lightglobalillum: dayNight === 'Day' ? true : false
			});
			sendChat('','/w gm It is now <b>' + dayNight + '</b> on '+page.get('name')+'!');
		}
	};

	vision.day = function (token) {
		vision.dayNightToggle(token, 'Day');
	};
	vision.night = function (token) {
		vision.dayNightToggle(token, 'Night');
	};

	vision.torch = function(token, args) {
		var radius = parseInt(args[1],10) || 40,
			dim_radius = parseInt(args[2],10) || (radius/2),
			other_players = _.contains([1,'1','on','yes','true','sure','yup','-'], args[3] || 1 );

		vision.setFlicker(token, radius, dim_radius, other_players);
	};


	vision.setFlicker = function(token, radius, dim_radius, other_players) {
		var found = _.findWhere(state.Vision.flickers, {parent: token.id}),
			torch;

		if(found) {
			torch = getObj('graphic', found.id);
			if(torch) {
				torch.remove();
				delete state.Vision.flickers[found.id];
			}
		}
		if(!torch) {
			found = _.findWhere(state.Vision.flickers, {page: token.get('pageid'), active: false});
			while(!torch && found ) {
				torch = getObj('graphic', found.id);
				if(torch) {
					torch.set({
						layer: 'objects',
						showname: false,
						aura1_radius: '',
						showplayers_aura1: false,
						light_radius: radius,
						light_dimradius: dim_radius,
						light_otherplayers: other_players
					});
				} else {
					delete state.Vision.flickers[found.id];
					found = _.findWhere(state.Vision.flickers, {page: token.get('pageid'), active: false});
				}
			}
			torch = createObj('graphic',{
				imgsrc: vision.flickerURL,
				subtype: 'token',
				name: 'Flicker',
				pageid: token.get('pageid'),
				width: 70,
				height: 70,
				top: token.get('top'),
				left: token.get('left'),
				layer: 'objects',
				light_radius: radius,
				light_dimradius: dim_radius,
				light_otherplayers: other_players
			});
		}
		toBack(torch);
		state.Vision.flickers[torch.id] = {
			id: torch.id,
			parent: token.id,
			active: true,
			page: token.get('pageid'),
			lightRadius: radius,
			lightRadiusMax: radius ,
			light_dimradius: radius,
		};
	};

	vision.clearFlicker = function(fid) {
		var f = getObj('graphic',fid);
		if(f) {
			f.remove();
		}
		delete state.Vision.flickers[fid];
	};

	vision.animateFlicker = function() {
		var pages = _.union([Campaign().get('playerpageid')], _.values(Campaign().get('playerspecificpages')));

		_.chain(state.Vision.flickers).where({active:true})
			.filter(function(obj) {
				return _.contains(pages, obj.page);
			})
			.each(function(flicker) {
				var token = getObj('graphic', flicker.parent),
					flickerToken = getObj('graphic', flicker.id);

				if(!token) {
					clearFlicker(flicker.id);
				} else {
					if(!flickerToken) {
						delete state.Vision.flickers[flicker.id];
					} else {
						var positiveOrNegative = Math.random() < 0.5 ? -1 : 1;

						if(positiveOrNegative === 1) {
							flicker.lightRadius -= vision.lightRadiusDelta;
						} else if(positiveOrNegative === -1) {
							flicker.lightRadius += vision.lightRadiusDelta;
						}

						if(flicker.lightRadius < flicker.lightRadiusMax * .95) {
							flicker.lightRadius += vision.lightRadiusDelta;
						} else if (flicker.lightRadius > flicker.lightRadiusMax) {
							flicker.lightRadius -= vision.lightRadiusDelta;
						}

						flickerToken.set({
							light_radius: flicker.lightRadius,
							light_dimradius: flicker.lightRadius / 2
						});
					}
				}
			});
	};

	vision.moveAllFlickers = function () {
		for(var key in state.Vision.flickers) {
			var flicker = state.Vision.flickers[key],
				token = getObj('graphic', flicker.parent),
				flickerToken = getObj('graphic', flicker.id);

			if(flickerToken) {
				flickerToken.set({
					'top': token.get('top'),
					'left': token.get('left')
				});
			} else {
				delete state.Vision.flickers[key];
			}
		}
	};

	vision.checkForTokenMove = function(obj) {
		if(obj) {
			for(var key in state.Vision.flickers) {
				var flicker = state.Vision.flickers[key];
				if(flicker.parent == obj.id) {
					var flickerObj = getObj('graphic', flicker.id);

					flickerObj.set({
						'top': obj.get('top'),
						'left': obj.get('left')
					});
					break;
				}
			}
		}
	};

	vision.handleTokenDelete = function(obj) {
		var found = _.findWhere(state.Vision.flickers, {parent: obj.id});

		if(found) {
			clearFlicker(found.id);
		} else {
			found = _.findWhere(state.Vision.flickers, {id: obj.id});
			if(found) {
				delete state.Vision.flickers[obj.id];
			}
		}
	};

	vision.getSelectedToken = vision.getSelectedToken || function(msg, veryify, callback) {
		if(playerIsGM(msg.playerid)) {
			if (msg.selected || (msg.selected && msg.selected.length)) {
				for (var i = 0; i < msg.selected.length; i++) {
					if (msg.selected[i]._type === 'graphic') {
						var token = getObj('graphic', msg.selected[i]._id);
						if (token && token.get('subtype') === 'token') {
							callback(token, arguments[2]);
						}
					}
				}
			} else {
				if(veryify === 'verify') {
					var message = 'No token selected';
					log(message);
					sendChat('GM', '/w gm ' + message);
				} else {
					callback('', arguments[2]);
				}
			}
		} else {
			var message = 'You are not the GM';
			log(message);
			sendChat('GM', '/w ' + msg.who + ' + message');
		}
	};
}(typeof vision === 'undefined' ? vision = {} : vision));

on('ready', function() {
	'use strict';
	vision.checkInstall();
	vision.registerHandlers();
	vision.moveAllFlickers();
});