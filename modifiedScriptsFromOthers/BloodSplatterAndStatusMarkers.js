var BloodSplatterAndStatusMarkers = {
	version: '0.01',
	wiki: 'https://wiki.roll20.net/Script:Blood_And_Honor:_Automatic_blood_spatter,_pooling_and_trail_effects',

	// This value should match the size of a standard grid in your campaign. Default is 70 px x 70 px square, Roll20's default.
	tokenSize: 70,

	// This will make it so only the GM can use the !clearblood command. Change to "true" if you want to check for authorization.
	onlyAllowGMtoRunCommands: true,

	// YOU MUST ADD YOUR OWN SPATTERS AND POOLS TO YOUR LIBRARY AND GET THE IMAGE LINK VIA YOUR WEB BROWSER. FOLLOW THE INSTRUCTIONS HERE: https://wiki.roll20.net/API:Objects#imgsrc_and_avatar_property_restrictions
	// You can add as many as you'd like to either category. Spatters are also used for blood trails.
	spatters: [
		'https://s3.amazonaws.com/files.d20.io/images/8954514/j9J34y5OMt3CgsMjqtW4wQ/thumb.png?1429618180',
		'https://s3.amazonaws.com/files.d20.io/images/8956394/Iwjwl-T9bJRHo-0T8epYLA/thumb.png?1429629267',
		'https://s3.amazonaws.com/files.d20.io/images/8956393/p_OuH4S5zCOy6-RFXgdJkA/thumb.png?1429629266',
		'https://s3.amazonaws.com/files.d20.io/images/8956392/1JyidqIpo2FJYzkinSUgPA/thumb.png?1429629266',
		'https://s3.amazonaws.com/files.d20.io/images/8956390/ADlQZNGrWsGhvmplOCf-zA/thumb.png?1429629265',
		'https://s3.amazonaws.com/files.d20.io/images/8954514/j9J34y5OMt3CgsMjqtW4wQ/thumb.png?1429618180'
	],
	pools: [
		'https://s3.amazonaws.com/files.d20.io/images/8954513/vd0R4uHgI2ZfAE3jbMH8mA/thumb.png?1429618170',
		'https://s3.amazonaws.com/files.d20.io/images/8956396/13_IKIeiBDhuhxTGysUIqQ/thumb.png?1429629268'
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
		if (randomInteger(2) == 1) {
			return 1;
		} else {
			return -1;
		}
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
	createBlood: function (gPage_id, gLeft, gTop, gWidth, gType, gColor) {
		gLeft = gLeft + (randomInteger(Math.floor(gWidth / 2)) * BloodSplatterAndStatusMarkers.getOffset());
		gTop = gTop + (randomInteger(Math.floor(gWidth / 2)) * BloodSplatterAndStatusMarkers.getOffset());
		toFront(createObj('graphic', {
			imgsrc: gType,
			gmnotes: 'blood',
			pageid: gPage_id,
			left: gLeft,
			tint_color: gColor,
			top: gTop,
			rotation: randomInteger(360) - 1,
			width: gWidth,
			height: gWidth,
			layer: 'map'
		}));
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
	}
};

createObj = (function () {
	return function () {
		var obj = createObj.apply(this, arguments);
		if (obj && !obj.fbpath) {
			obj.fbpath = obj.changed._fbpath.replace(/([^\/]*\/){4}/, '/');
		}
		return obj;
	};
}());

on('ready', function () {

	on('change:graphic:bar3_value', function (obj, prev) {
		var maxHealth = obj.get('bar3_max'),
			bloodiedValue = maxHealth / 2,
			currentHealth = obj.get('bar3_value');

		if (maxHealth === '' || obj.get('layer') != 'objects' || (obj.get('gmnotes')).indexOf('noblood') !== -1) {
			return;
		}
		if (currentHealth <= bloodiedValue) {
			obj.set({
				status_redmarker: true
			});
			// Create spatter near token if "bloodied". Chance of spatter depends on severity of damage
			if (currentHealth > 0 && currentHealth < prev.bar3_value && currentHealth < randomInteger(maxHealth)) {
				var bloodMult = 1 + ((currentHealth - prev.bar3_value) / maxHealth);
				BloodSplatterAndStatusMarkers.createBlood(obj.get('_pageid'), obj.get('left'), obj.get('top'), Math.floor(BloodSplatterAndStatusMarkers.tokenSize * bloodMult), BloodSplatterAndStatusMarkers.chooseBlood('spatter'), BloodSplatterAndStatusMarkers.bloodColor(obj.get('gmnotes')));
			}
		} else if (currentHealth > bloodiedValue) {
			obj.set({
				status_redmarker: false
			});
		}
		if (currentHealth <= 0) {
			obj.set({
				status_dead: true
			});
			// Create pool near token if health drops below 1.
			BloodSplatterAndStatusMarkers.createBlood(obj.get('_pageid'), obj.get('left'), obj.get('top'), Math.floor(BloodSplatterAndStatusMarkers.tokenSize * 1.5), BloodSplatterAndStatusMarkers.chooseBlood('pool'), BloodSplatterAndStatusMarkers.bloodColor(obj.get('gmnotes')));
		} else if (currentHealth > 0) {
			obj.set({
				status_dead: false
			});
		}
	});

	//Make blood trails, chance goes up depending on how injured a token is
	on('change:graphic:lastmove', function (obj) {
		var maxHealth = obj.get('bar3_max'),
			bloodiedValue = maxHealth / 2,
			currentHealth = obj.get('bar3_value');

		if (maxHealth === '' || obj.get('layer') != 'objects' || (obj.get('gmnotes')).indexOf('noblood') !== -1 || BloodSplatterAndStatusMarkers.timeout !== 0) {
			return;
		}

		if (currentHealth <= bloodiedValue && currentHealth < randomInteger(maxHealth)) {
			BloodSplatterAndStatusMarkers.createBlood(obj.get('_pageid'), obj.get('left'), obj.get('top'), Math.floor(BloodSplatterAndStatusMarkers.tokenSize / 2), BloodSplatterAndStatusMarkers.chooseBlood('spatter'), BloodSplatterAndStatusMarkers.bloodColor(obj.get('gmnotes')));
			BloodSplatterAndStatusMarkers.increaseTimeout();
		}
	});

	on('chat:message', function (msg) {
		if (msg.type == 'api' && msg.content.indexOf('!clearblood') !== -1) {
			if (BloodSplatterAndStatusMarkers.onlyAllowGMtoRunCommands && !playerIsGM(msg.playerid)) {
				sendChat(msg.who, '/w ' + msg.who + ' You are not authorized to use that command!');
				return;
			} else {
				var objects = filterObjs(function (obj) {
					if (obj.get('type') == 'graphic' && obj.get('gmnotes') == 'blood') {
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