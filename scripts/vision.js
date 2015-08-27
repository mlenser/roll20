(function (vis) {
	vis.flickerURL = 'https://s3.amazonaws.com/files.d20.io/images/4277467/iQYjFOsYC5JsuOPUCI9RGA/thumb.png?1401938659';
	vis.torchRadius = 40;
	vis.flickerPeriod = 400;
	vis.lightRadiusDelta = 0.15;
	vis.flickerInterval = false;
	vis.version = 0.002;
	vis.schemaVersion = 0.002;

	vis.registerHandlers = function () {
		on('chat:message', vis.handleInput);
		on('destroy:graphic', vis.handleTokenDelete);
		on("change:graphic", vis.checkForTokenMove);
		log('vision ' + vis.version + ' ready');
	};

	vis.checkInstall = function () {
		if(!_.has(state,'Vision') || state.Vision.version !==  vis.schemaVersion) {
			log('  > Updating Schema to v' +  vis.schemaVersion + ' <');
			state.Vision = {
				version:  vis.schemaVersion,
				visions: {}
			};
		}
		vis.flickerInterval = setInterval(vis.animateFlicker, vis.flickerPeriod);
	};

	function getGraphic (graphic) {
		return getObj('graphic', graphic);
	}

	vis.handleInput = function (msg) {
		if(msg.type !== 'api') {
			return;
		}
		var args = msg.content.split(/\s+--/);
		switch(args[0]) {
			case '!day':
				vis.getSelectedToken(msg, '', vis.day);
				break;
			case '!night':
				vis.getSelectedToken(msg, '', vis.night);
				break;
			case '!torch':
				vis.getSelectedToken(msg, 'verify', vis.torch, args);
				break;
			case '!darkvision':
				break;
		}
	};

	vis.dayNightToggle = function (token, dayNight) {
		var page = getObj('page', (token && token.get('pageid')) || Campaign().get('playerpageid'));

		if(page) {
			page.set({
				lightglobalillum: dayNight === 'Day' ? true : false
			});
			sendChat('','/w gm It is now <b>' + dayNight + '</b> on '+page.get('name')+'!');
		}
	};

	vis.day = function (token) {
		vis.dayNightToggle(token, 'Day');
	};
	vis.night = function (token) {
		vis.dayNightToggle(token, 'Night');
	};

	vis.torch = function(token, args) {
		var radius = parseInt(args[1], 10) || vis.torchRadius,
			dim_radius = parseInt(args[2], 10) || (radius/2),
			other_players = _.contains([1, '1', 'on', 'yes', 'true', 'sure', 'yup', '-'], args[3] || 1),
			vision = _.findWhere(state.Vision.visions, {parent: token.id}),
			visionToken;

		if(vision) {
			visionToken = getGraphic(vision.id);
			if(visionToken) {
				if(radius === vision.lightRadiusMax && dim_radius === vision.lightDimRadius) {
					visionToken.remove();
					delete state.Vision.visions[vision.id];
				} else {
					visionToken.set({
						layer: 'objects',
						light_radius: radius,
						light_dimradius: dim_radius,
						light_otherplayers: other_players
					});
				}
			}
		}
		if(!visionToken) {
			vision = _.findWhere(state.Vision.visions, {page: token.get('pageid'), active: false});
			while(!visionToken && vision) {
				visionToken = getGraphic(vision.id);
				if(visionToken) {
					visionToken.set({
						layer: 'objects',
						light_radius: radius,
						light_dimradius: dim_radius,
						light_otherplayers: other_players
					});
				} else {
					delete state.Vision.visions[vision.id];
					vision = _.findWhere(state.Vision.visions, {page: token.get('pageid'), active: false});
				}
			}
			visionToken = createObj('graphic',{
				imgsrc: vis.flickerURL,
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
		toBack(visionToken);
		state.Vision.visions[visionToken.id] = {
			id: visionToken.id,
			parent: token.id,
			active: true,
			page: token.get('pageid'),
			lightRadius: radius,
			lightRadiusMax: radius,
			lightDimRadius: dim_radius,
			lightDimRadiusPercentage: radius/dim_radius
		};
	};

	vis.clearVision = function(id) {
		var visionToken = getGraphic(id);
		if(visionToken) {
			visionToken.remove();
		}
		delete state.Vision.visions[id];
	};

	function varyLightRadius (flicker) {
		if(flicker.lightRadiusMax - flicker.lightRadius < vis.lightRadiusDelta) {
			decreaseLightRadius(flicker);
		} else if(flicker.lightRadius - flicker.lightRadiusMax * 0.95 < vis.lightRadiusDelta) {
			increaseLightRadius(flicker);
		} else {
			(Math.random() < 0.5 ? -1 : 1) ? decreaseLightRadius(flicker) : increaseLightRadius(flicker);
		}
	}
	function decreaseLightRadius (flicker) {
		flicker.lightRadius -= vis.lightRadiusDelta;
	}
	function increaseLightRadius (flicker) {
		flicker.lightRadius += vis.lightRadiusDelta;
	}

	vis.animateFlicker = function() {
		var pages = _.union([Campaign().get('playerpageid')], _.values(Campaign().get('playerspecificpages')));

		_.chain(state.Vision.visions).where({active:true})
			.filter(function(obj) {
				return _.contains(pages, obj.page);
			})
			.each(function(flicker) {
				var token = getGraphic(flicker.parent),
					visionToken = getGraphic(flicker.id);

				if(!token) {
					clearVision(flicker.id);
				} else {
					if(!visionToken) {
						delete state.Vision.visions[flicker.id];
					} else {
						varyLightRadius(flicker);

						visionToken.set({
							light_radius: flicker.lightRadius,
							light_dimradius: flicker.lightRadius / flicker.lightDimRadiusPercentage
						});
					}
				}
			});
	};

	vis.moveAllVisions = function () {
		for(var key in state.Vision.visions) {
			if(key) {
				var visionObj = state.Vision.visions[key],
					token = getGraphic(visionObj.parent),
					visionToken = getGraphic(visionObj.id);

				if(visionToken) {
					visionToken.set({
						'top': token.get('top'),
						'left': token.get('left')
					});
				} else {
					delete state.Vision.visions[key];
				}
			}
		}
	};

	vis.checkForTokenMove = function(token) {
		var vision = _.findWhere(state.Vision.visions, {parent: token.id}),
			visionToken;

		if(vision) {
			visionToken = getGraphic(vision.id);
			if(visionToken) {
				visionToken.set({
					'top': token.get('top'),
					'left': token.get('left')
				});
			} else {
				delete state.Vision.visions[key];
			}
		}
	};

	vis.handleTokenDelete = function(token) {
		var vision = _.findWhere(state.Vision.visions, {parent: token.id});

		if(vision) {
			clearVision(vision.id);
		} else {
			vision = _.findWhere(state.Vision.visions, {id: token.id});
			if(vision) {
				delete state.Vision.visions[token.id];
			}
		}
	};

	vis.getSelectedToken = vis.getSelectedToken || function(msg, verify, callback) {
		var message;
		if(playerIsGM(msg.playerid)) {
			if (msg.selected || (msg.selected && msg.selected.length)) {
				for (var i = 0; i < msg.selected.length; i++) {
					if (msg.selected[i]._type === 'graphic') {
						var token = getGraphic(msg.selected[i]._id);
						if (token && token.get('subtype') === 'token') {
							callback(token, arguments[3]);
						}
					}
				}
			} else {
				if(verify === 'verify') {
					message = 'No token selected';
					log(message);
					sendChat('GM', '/w gm ' + message);
				} else {
					callback('', arguments[3]);
				}
			}
		} else {
			message = 'You are not the GM';
			log(message);
			sendChat('GM', '/w ' + msg.who + ' + message');
		}
	};
}(typeof vis === 'undefined' ? vis = {} : vis));

on('ready', function() {
	'use strict';
	vis.checkInstall();
	vis.registerHandlers();
	vis.moveAllVisions();
});