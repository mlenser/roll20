var BloodSplatterAndStatusMarkers = {
	version: '0.02',
	wiki: 'https://wiki.roll20.net/Script:Blood_And_Honor:_Automatic_blood_spatter,_pooling_and_trail_effects',

	// This will make it so only the GM can use the !clearblood command. Change to "true" if you want to check for authorization.
	onlyAllowGMtoRunCommands: true,

	// YOU MUST ADD YOUR OWN SPATTERS AND POOLS TO YOUR LIBRARY AND GET THE IMAGE LINK VIA YOUR WEB BROWSER. FOLLOW THE INSTRUCTIONS HERE: https://wiki.roll20.net/API:Objects#imgsrc_and_avatar_property_restrictions
	// You can add as many as you'd like to either category. Spatters are also used for blood trails.
	spatters: [
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11530945/w9YARDmX38ZaVHqZWKNfIA/thumb.png?1439558875',
			'width': 200,
			'height': 72
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11530943/zEFXGKQcEnadKnwx5s4VZg/thumb.png?1439558861',
			'width': 200,
			'height': 130
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11530942/PqwTCJsxW8HGhGNg0b0G8Q/thumb.png?1439558853',
			'width': 200,
			'height': 100
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/8956394/Iwjwl-T9bJRHo-0T8epYLA/thumb.png?1429629267',
			'width': 200,
			'height': 180
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/8956393/p_OuH4S5zCOy6-RFXgdJkA/thumb.png?1429629266',
			'width': 200,
			'height': 88
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/8956392/1JyidqIpo2FJYzkinSUgPA/thumb.png?1429629266',
			'width': 200,
			'height': 146
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/8954514/j9J34y5OMt3CgsMjqtW4wQ/thumb.png?1429618180',
			'width': 200,
			'height': 146
		}
	],
	pools: [
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11530949/t8ND85zP6KCEaWJ-bd1NAg/thumb.png?1439558885',
			'width': 200,
			'height': 173
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11530892/8ZXJdAdcHPUSDzkCeoOPTg/thumb.png?1439558577',
			'width': 160,
			'height': 290,
			'sizeAdjustment': 1.4
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/8956396/13_IKIeiBDhuhxTGysUIqQ/thumb.png?1429629268',
			'width': 200,
			'height': 200
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/8954513/vd0R4uHgI2ZfAE3jbMH8mA/thumb.png?1429618170',
			'width': 200,
			'height': 135
		}
	],
	chooseBlood: function (type) {
		if (type === 'spatter') {
			return BloodSplatterAndStatusMarkers.spatters[randomInteger(BloodSplatterAndStatusMarkers.spatters.length) - 1];
		}
		if (type === 'pool') {
			return BloodSplatterAndStatusMarkers.pools[randomInteger(BloodSplatterAndStatusMarkers.pools.length) - 1];
		}
	},
	getOffset: function () {
		return Math.random() < 0.5 ? 1 : -1;
	},
	bloodColor: function (gmnotes) {
		if (gmnotes.indexOf('bloodcolor_purple') !== -1) {
			return '#0000ff';
		} else if (gmnotes.indexOf('bloodcolor_blue') !== -1) {
			return '#00ffff';
		} else if (gmnotes.indexOf('bloodcolor_orange') !== -1) {
			return '#ffff00';
		} else {
			return 'transparent';
		}
	},
	createBlood: function (token, multiplier, bloodType) {
		var pages = _.union([Campaign().get('playerpageid')], _.values(Campaign().get('playerspecificpages'))),
			dropBlood = _.contains(pages, token.get('pageid')),
			gmNotes = token.get('gmnotes');

		if(!dropBlood || token.get('layer') !== 'objects' || gmNotes.indexOf('noblood') !== -1) {
			return;
		}

		var	size = Math.floor(BloodSplatterAndStatusMarkers.getTokenSize(token) * multiplier),
			bloodImage = BloodSplatterAndStatusMarkers.chooseBlood(bloodType),
			bloodTokenSource = bloodImage,
			randomSizeAdjustment = 1.25 - (Math.random() / 2),
			bloodTokenWidth = size * multiplier * randomSizeAdjustment,
			bloodTokenHeight = size * multiplier * randomSizeAdjustment;

		if(bloodImage !== null && typeof(bloodImage) === 'object') {
			bloodTokenSource = bloodImage.src;

			var bloodImageAspectRatio = bloodImage.width / bloodImage.height,
				widthRatioMultiplier = 1,
				heightRatioMultiplier = 1,
				sizeAdjustment = 1;

			if(bloodImage.sizeAdjustment) {
				sizeAdjustment = bloodImage.sizeAdjustment;
			}

			if(bloodImageAspectRatio < 1) {
				widthRatioMultiplier = bloodImageAspectRatio;
			} else if (bloodImageAspectRatio > 1) {
				heightRatioMultiplier = bloodImage.height / bloodImage.width;
			}
			bloodTokenWidth = bloodTokenWidth * widthRatioMultiplier * sizeAdjustment;
			bloodTokenHeight = bloodTokenHeight * heightRatioMultiplier * sizeAdjustment;
		}

		toFront(BloodSplatterAndStatusMarkers.fixedCreateObj('graphic', {
			imgsrc: bloodTokenSource,
			gmnotes: 'blood',
			pageid: token.get('_pageid'),
			left: token.get('left') + (randomInteger(Math.floor(size / 2)) * BloodSplatterAndStatusMarkers.getOffset()),
			tint_color: BloodSplatterAndStatusMarkers.bloodColor(gmNotes),
			top: token.get('top') + (randomInteger(Math.floor(size / 2)) * BloodSplatterAndStatusMarkers.getOffset()),
			rotation: randomInteger(360) - 1,
			width: bloodTokenWidth,
			height: bloodTokenHeight,
			layer: 'map'
		}));
	},
	getTokenSize: function (token) {
		return (token.get('height') + token.get('width')) / 2; //average the height and the width
	},
	timeout: 0,
	increaseTimeout: function () {
		BloodSplatterAndStatusMarkers.timeout += 2;
		BloodSplatterAndStatusMarkers.watchTimeout();
	},
	interval: null,
	watchTimeout: function () {
		if (BloodSplatterAndStatusMarkers.interval === null) {
			BloodSplatterAndStatusMarkers.interval = setInterval(function () {
				if (BloodSplatterAndStatusMarkers.timeout > 0) {
					BloodSplatterAndStatusMarkers.timeout--;
				} else {
					clearInterval(BloodSplatterAndStatusMarkers.interval);
					BloodSplatterAndStatusMarkers.interval = null;
				}
			}, 2000);
		}
	},
	fixedCreateObj: function () {
		return function () {
			var obj = createObj.apply(this, arguments);
			if (obj && !obj.fbpath) {
				obj.fbpath = obj.changed._fbpath.replace(/([^\/]*\/){4}/, '/');
			}
			return obj;
		};
	}()
};

on('ready', function () {
	on('change:graphic:bar3_value', function (obj, prev) {
		var maxHealth = obj.get('bar3_max');

		if (maxHealth === '') {
			return;
		}
		var currentHealth = obj.get('bar3_value');

		if (currentHealth <= maxHealth / 2) {
			obj.set({
				status_redmarker: true
			});
			// Create spatter near token if "bloodied". Chance of spatter depends on severity of damage
			if (currentHealth > 0 && currentHealth < prev.bar3_value && currentHealth < randomInteger(maxHealth)) {
				var bloodMult = 1 + ((currentHealth - prev.bar3_value) / maxHealth);
				BloodSplatterAndStatusMarkers.createBlood(obj, bloodMult, 'spatter');
			}
		} else {
			obj.set({
				status_redmarker: false
			});
		}
		if (currentHealth <= 0) {
			obj.set({
				status_dead: true
			});
			// Create pool near token if health drops below 1.
			BloodSplatterAndStatusMarkers.createBlood(obj, 1.2, 'pool');
		} else {
			obj.set({
				status_dead: false
			});
		}
	});

	//Make blood trails, chance goes up depending on how injured a token is
	on('change:graphic:lastmove', function (obj) {
		var maxHealth = obj.get('bar3_max');

		if (maxHealth === '' || BloodSplatterAndStatusMarkers.timeout !== 0) {
			return;
		}

		var currentHealth = obj.get('bar3_value');

		if (currentHealth <= maxHealth / 2 && currentHealth < randomInteger(maxHealth)) {
			BloodSplatterAndStatusMarkers.createBlood(obj, 0.9, 'spatter');
			BloodSplatterAndStatusMarkers.increaseTimeout();
		}
	});

	on('chat:message', function (msg) {
		if (msg.type === 'api' && msg.content.indexOf('!clearblood') !== -1) {
			if (BloodSplatterAndStatusMarkers.onlyAllowGMtoRunCommands && !playerIsGM(msg.playerid)) {
				sendChat(msg.who, '/w ' + msg.who + ' You are not authorized to use that command!');
				return;
			} else {
				var objects = filterObjs(function (obj) {
					if (obj.get('type') === 'graphic' && obj.get('gmnotes') === 'blood') {
						return true;
					} else {
						return false;
					}
				});
				_.each(objects, function (obj) {
					obj.remove();
				});
			}
		}
	});
});