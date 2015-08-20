var BloodSpatterAndStatusMarkers = {
	version: '0.04',
	wiki: 'https://wiki.roll20.net/Script:Blood_And_Honor:_Automatic_blood_spatter,_pooling_and_trail_effects',

	hpBar: 3, //1, 2, or 3

	hpCountUp: false,

	// This will make it so only the GM can use the !clearblood command. Change to "true" if you want to check for authorization.
	onlyAllowGMtoRunCommands: true,

	// YOU MUST ADD YOUR OWN SPATTERS AND POOLS TO YOUR LIBRARY AND GET THE IMAGE LINK VIA YOUR WEB BROWSER. FOLLOW THE INSTRUCTIONS HERE: https://wiki.roll20.net/API:Objects#imgsrc_and_avatar_property_restrictions
	// You can add as many as you'd like to either category. Spatters are also used for blood trails.
	spatters: [
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638270/8nmNImR20gW1hYYonWU9EA/thumb.png?1439938892',
			'width': 200,
			'height': 100
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638265/F2Mw_sx4YKSZEhQcoy2ncw/thumb.png?1439938884',
			'width': 200,
			'height': 83
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638261/-1Gv5e3O5f4h_JeFLH5A7g/thumb.png?1439938877',
			'width': 200,
			'height': 40
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638259/xZxDeGB2Tr_q3UEt082_lw/thumb.png?1439938869',
			'width': 200,
			'height': 134
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638254/v6LFCczCxnX3AYmkngA8ow/thumb.png?1439938857',
			'width': 200,
			'height': 46
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638252/H13406ht412U_WRgYVtCwg/thumb.png?1439938846',
			'width': 200,
			'height': 179
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638246/5Sp_Dk2MR-_EMBpJLLiXcA/thumb.png?1439938833',
			'width': 200,
			'height': 146
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638244/iIJPw_YBucZWYMknD028Gw/thumb.png?1439938822',
			'width': 200,
			'height': 139
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638242/A7eIviKjyG6x9Q5wxy8xkQ/thumb.png?1439938811',
			'width': 200,
			'height': 100
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638235/ViN4vWlxbL1PSxkjOFASLg/thumb.png?1439938798',
			'width': 200,
			'height': 134
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638231/kKVxusJuBQMxDUSzNk0QAg/thumb.png?1439938780',
			'width': 200,
			'height': 40
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638226/nN6P5U5vWRoaAd5-XMS5dA/thumb.png?1439938768',
			'width': 200,
			'height': 99
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638217/ZZaTOGr5pPNY01RZKapl6g/thumb.png?1439938744',
			'width': 200,
			'height': 72
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638212/_eaJ7fr_QPWWEW7PmvPzqg/thumb.png?1439938727',
			'width': 200,
			'height': 35
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638206/RE2PGgNz11RZtV1rIzHfpA/thumb.png?1439938712',
			'width': 200,
			'height': 51
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638204/U90Jjp_cIYQRJsT_4XM8eA/thumb.png?1439938698',
			'width': 200,
			'height': 31
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638202/vRaCrr-SoQd1DORtK9IGfg/thumb.png?1439938687',
			'width': 200,
			'height': 130
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638194/JZgn6ALhb3DuCWeSEd2S8g/thumb.png?1439938672',
			'width': 200,
			'height': 182
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638185/BDOgQLzTlXPeWZHpt_AOYA/thumb.png?1439938657',
			'width': 200,
			'height': 100
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638182/nBWgsf-zsN6wHVTKAXMY1g/thumb.png?1439938643',
			'width': 200,
			'height': 146
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638174/qJvQwWJr20D7ShU6bBJ8Qw/thumb.png?1439938628',
			'width': 200,
			'height': 89
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638170/Qe-4mHgUs2zsYGDpjU_5TA/thumb.png?1439938618',
			'width': 200,
			'height': 193
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638163/rd-CJLyawUbLAb0YVxIAxg/thumb.png?1439938604',
			'width': 200,
			'height': 88
		}
	],
	pools: [
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638609/oowTOShdIP-PLoxtz-IkCg/thumb.png?1439939580',
			'width': 181,
			'height': 200
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638598/DIlJabyrE3ducucpa93v6A/thumb.png?1439939571',
			'width': 200,
			'height': 161
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638587/QPdMU5VryXp86pf5ZFsvDA/thumb.png?1439939564',
			'width': 200,
			'height': 128
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638577/havO5udqh2-bjX81r_V51g/thumb.png?1439939550',
			'width': 200,
			'height': 155
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638566/jxAyAP-FK5s52tcfV_oaUw/thumb.png?1439939537',
			'width': 200,
			'height': 77
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638558/xZgwCOqTFYTU4_hfKsDUAg/thumb.png?1439939528',
			'width': 200,
			'height': 196
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638550/VWjQJxKhtJ1qQrLb-Z4Cvg/thumb.png?1439939518',
			'width': 180,
			'height': 200
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638541/Xb1KTMqgty5tAEcr_-53Jg/thumb.png?1439939506',
			'width': 200,
			'height': 173
		},
		{
			'src': 'https://s3.amazonaws.com/files.d20.io/images/11638533/a3xycjVLmVKHainc6a3htg/thumb.png?1439939496',
			'width': 200,
			'height': 200
		}
	],
	chooseBlood: function (type) {
		if (type === 'spatter') {
			return BloodSpatterAndStatusMarkers.spatters[randomInteger(BloodSpatterAndStatusMarkers.spatters.length) - 1];
		}
		if (type === 'pool') {
			return BloodSpatterAndStatusMarkers.pools[randomInteger(BloodSpatterAndStatusMarkers.pools.length) - 1];
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

		var	size = Math.floor(BloodSpatterAndStatusMarkers.getTokenSize(token) * multiplier),
			bloodImage = BloodSpatterAndStatusMarkers.chooseBlood(bloodType),
			bloodTokenSource = bloodImage,
			bloodTokenWidth = size * multiplier,
			bloodTokenHeight = size * multiplier;

		if(bloodImage !== null && typeof(bloodImage) === 'object') {
			bloodTokenSource = bloodImage.src;

			var bloodImageAspectRatio = bloodImage.width / bloodImage.height,
				widthRatioMultiplier = 1,
				heightRatioMultiplier = 1;

			if(bloodImageAspectRatio < 1) {
				widthRatioMultiplier = bloodImageAspectRatio;
			} else if (bloodImageAspectRatio > 1) {
				heightRatioMultiplier = bloodImage.height / bloodImage.width;
			}
			bloodTokenWidth = bloodTokenWidth * widthRatioMultiplier;
			bloodTokenHeight = bloodTokenHeight * heightRatioMultiplier;
		}

		var widthIncrement = bloodTokenWidth * 0.1,
			widthIncrementTotal = widthIncrement,
			heightIncrement = bloodTokenHeight * 0.1,
			heightIncrementTotal = heightIncrement,
			spatterToken = BloodSpatterAndStatusMarkers.fixedCreateObj('graphic', {
				pageid: token.get('_pageid'),
				imgsrc: bloodTokenSource,
				tint_color: BloodSpatterAndStatusMarkers.bloodColor(gmNotes),
				gmnotes: 'blood',
				top: token.get('top') + (randomInteger(Math.floor(size / 2)) * BloodSpatterAndStatusMarkers.getOffset()),
				left: token.get('left') + (randomInteger(Math.floor(size / 2)) * BloodSpatterAndStatusMarkers.getOffset()),
				width: widthIncrement,
				height: heightIncrement,
				rotation: randomInteger(360) - 1,
				layer: 'map'
			});

		toFront(spatterToken);

		(function splatterEnlargeFunction (count) {
			if (count < 10) {
				setTimeout(function () {
					widthIncrementTotal += widthIncrement;
					heightIncrementTotal += heightIncrement;
					spatterToken.set({
						width: widthIncrementTotal,
						height: heightIncrementTotal
					});
					splatterEnlargeFunction(count + 1);
				}, 30);
			}
		})(0);

	},
	getTokenSize: function (token) {
		return (token.get('height') + token.get('width')) / 2; //average the height and the width
	},
	timeout: 0,
	increaseTimeout: function () {
		BloodSpatterAndStatusMarkers.timeout += 2;
		BloodSpatterAndStatusMarkers.watchTimeout();
	},
	interval: null,
	watchTimeout: function () {
		if (BloodSpatterAndStatusMarkers.interval === null) {
			BloodSpatterAndStatusMarkers.interval = setInterval(function () {
				if (BloodSpatterAndStatusMarkers.timeout > 0) {
					BloodSpatterAndStatusMarkers.timeout--;
				} else {
					clearInterval(BloodSpatterAndStatusMarkers.interval);
					BloodSpatterAndStatusMarkers.interval = null;
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
	}(),
	tokenHPChanged: function (token, maxHealth, currentHealth, damageTaken) {
		if (maxHealth === '') {
			return;
		}
		var percentOfHpLost = damageTaken / maxHealth,
			damageMultiplier = 1 + Math.min(percentOfHpLost / 2, 0.5);

		if (
			(!BloodSpatterAndStatusMarkers.hpCountUp && currentHealth <= maxHealth / 2)
			||
			(BloodSpatterAndStatusMarkers.hpCountUp && currentHealth >= maxHealth / 2)
		) {
			token.set({
				status_redmarker: true
			});
			// Create spatter near token if "bloodied". Chance of spatter depends on severity of damage
			if (damageTaken > 0 && currentHealth > 0 && (
				(!BloodSpatterAndStatusMarkers.hpCountUp &&  currentHealth < randomInteger(maxHealth))
				||
				(BloodSpatterAndStatusMarkers.hpCountUp &&  currentHealth > randomInteger(maxHealth))
				)) {
				BloodSpatterAndStatusMarkers.createBlood(token, damageMultiplier, 'spatter');
			}
		} else {
			token.set({
				status_redmarker: false
			});
		}
		if (
			(!BloodSpatterAndStatusMarkers.hpCountUp && currentHealth <= 0)
			||
			(BloodSpatterAndStatusMarkers.hpCountUp && currentHealth >= maxHealth)
		) {
			token.set({
				status_dead: true
			});
			// Create pool near token if health drops below 1.
			if(damageTaken > 0) {
				BloodSpatterAndStatusMarkers.createBlood(token, damageMultiplier, 'pool');
			}
		} else {
			token.set({
				status_dead: false
			});
		}
	}
};

on('ready', function () {
	on('change:graphic:bar' + BloodSpatterAndStatusMarkers.hpBar + '_value', function (token, prev) {
		var maxHealth = token.get('bar' + BloodSpatterAndStatusMarkers.hpBar + '_max'),
			currentHealth = token.get('bar' + BloodSpatterAndStatusMarkers.hpBar + '_value'),
			previousHealth = prev['bar' + BloodSpatterAndStatusMarkers.hpBar + '_value'],
			damageTaken;

		if(!BloodSpatterAndStatusMarkers.hpCountUp) {
			damageTaken = previousHealth - currentHealth
		} else {
			damageTaken = currentHealth - previousHealth;
		}

		BloodSpatterAndStatusMarkers.tokenHPChanged(token, maxHealth, currentHealth, damageTaken);
	});

	//Make blood trails, chance goes up depending on how injured a token is
	on('change:graphic:lastmove', function (token) {
		var maxHealth = token.get('bar' + BloodSpatterAndStatusMarkers.hpBar + '_max');

		if (maxHealth === '' || BloodSpatterAndStatusMarkers.timeout !== 0) {
			return;
		}

		var currentHealth = token.get('bar' + BloodSpatterAndStatusMarkers.hpBar + '_value'),
			healthLost = maxHealth - currentHealth,
			percentOfHpLost = healthLost / maxHealth,
			damageMultiplier = .5 + Math.min(percentOfHpLost / 2, 0.5);

		if (
			(!BloodSpatterAndStatusMarkers.hpCountUp && currentHealth <= maxHealth / 2 && currentHealth < randomInteger(maxHealth))
			||
			(BloodSpatterAndStatusMarkers.hpCountUp && currentHealth >= maxHealth / 2 && currentHealth > randomInteger(maxHealth))
		) {
			BloodSpatterAndStatusMarkers.createBlood(token, damageMultiplier, 'spatter');
			BloodSpatterAndStatusMarkers.increaseTimeout();
		}
	});

	on('chat:message', function (msg) {
		if (msg.type === 'api' && msg.content.indexOf('!clearblood') !== -1) {
			if (BloodSpatterAndStatusMarkers.onlyAllowGMtoRunCommands && !playerIsGM(msg.playerid)) {
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