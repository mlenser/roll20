(function (shaped, undefined) {

	/* Options */
	shaped.createAbilityAsToken = true;
	shaped.monsterAsMinHp = true; // generated token hp can't be lower than the average hp
	shaped.rollMonsterHpOnDrop = true; // will roll HP when character are dropped on map

	/* Setting these to a sheet value will set the token bar value. If they are set to '' or not set then it will use whatever you already have set on the token
	 For a full list of attributes please look at https://app.roll20.net/forum/post/1734923/new-d-and-d-5e-shaped-character-sheet#post-1788863
	 Do not use npc_HP, use HP instead
	 */
	// Green bar
	shaped.parsebar1 = 'npc_AC';
	// Blue bar
	shaped.parsebar2 = ''; //'passive_perception'
	// Red bar
	shaped.parsebar3 = 'HP';  //'speed'



	shaped.statblock = {
		version: '1.4',
		RegisterHandlers: function () {
			on('chat:message', HandleInput);

			if(shaped.rollMonsterHpOnDrop) {
				on("add:graphic", function(obj) {
					shaped.rollTokenHp(obj);
				});
			}

			log('Shaped Scripts ready');
		}
	};

	var status = '',
			errors = [],
			obj = null,
			characterId = null;

	function HandleInput(msg) {
		if(msg.type !== 'api') {
			return;
		}
		log('msg.content' + msg.content);
		args = msg.content.split(/\s+/);
		switch(args[0]) {
			case '!build-monster':
			case '!shaped-parse':
			case '!shaped-import':
				shaped.getSelectedToken(msg, shaped.ImportStatblock);
				break;
			case '!shaped-rollhp':
				return shaped.rollHpForSelectedToken(msg);
				break;
			case '!shaped-convert':
				shaped.getSelectedToken(msg, shaped.parseOldToNew);
				break;
		}
	}

	shaped.getSelectedToken = shaped.getSelectedToken || function(msg, callback, limit) {
		try {
			if(!msg.selected || !msg.selected.length) {
				throw('No token selected');
			}

			limit = parseInt(limit, 10) || 0;

			if(!limit || limit > msg.selected.length + 1 || limit < 1) {
				limit = msg.selected.length;
			}

			for(i = 0; i < limit; i++) {
				if(msg.selected[i]._type === 'graphic') {
					var obj = getObj('graphic', msg.selected[i]._id);
					if(obj && obj.get('subtype') === 'token') {
						callback(obj);
					}
				}
			}
		} catch(e) {
			log(e);
			log('Exception: ' + e);
			sendChat('GM', '/w GM ' + e);
		}
	};

	shaped.rollHpForSelectedToken = function(msg) {
		shaped.getSelectedToken(msg, shaped.rollTokenHp);
	};

	shaped.rollTokenHp = function(token) {
		var number = 0;
		for(var i = 1; i < 4; i++) {
			if(shaped['parsebar' + i] === 'HP') {
				number = i;
				break;
			}
		}
		if(number === 0) {
			throw('One of the shaped.parsebar option has to be set to "HP" for random HP roll');
		}

		var bar = 'bar' + number;
		var represent = '';
		try {
			if((represent = token.get('represents')) === '') {
				throw('Token does not represent a character');
			}

			if(token.get(bar + '_link') !== '') {
				throw('Token ' + bar + ' is linked');
			}

			rollCharacterHp(represent, function(total, original) {
				token.set(bar + '_value', total);
				token.set(bar + '_max', total);
				var message = '/w GM Hp rolled: ' + total;
				if(original > 0) {
					message += ' adjusted from original result of ' + original;
				}
				sendChat('GM', message);
			});
		} catch(e) {
			log('Exception: ' + e);
		}
	};

	function rollCharacterHp(id, callback) {
		var hd = getAttrByName(id, 'npc_HP_hit_dice', 'current');
		if(hd === '') {
			throw 'Character has no HP Hit Dice defined';
		}

		var match = hd.match(/^(\d+)d(\d+)$/);
		if(!match || !match[1] || !match[2]) {
			throw 'Character doesn\'t have valid HP Hit Dice format';
		}

		var nb_dice = parseInt(match[1], 10);
		var nb_face = parseInt(match[2], 10);
		var total = 0;
		var original = 0;

		sendChat('GM', '/roll ' + hd, function(ops) {
			var rollResult = JSON.parse(ops[0].content);
			if(_.has(rollResult, 'total')) {
				total = rollResult.total;

				// Add Con modifier x number of hit dice
				var constitution_mod = Math.floor((getAttrByName(id, 'constitution', 'current') - 10) / 2);
				total = Math.floor(nb_dice * constitution_mod + total);

				if(shaped.monsterAsMinHp) {
					// Calculate average HP, has written in statblock.
					var average_hp = Math.floor(((nb_face + 1) / 2 + constitution_mod) * nb_dice);
					if(average_hp > total) {
						original = total;
						total = average_hp;
					}
				}
				callback(total, original);
			}
		});
	}

	shaped.capitalizeEachWord = function(str) {
		return str.replace(/\w\S*/g, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	};

	shaped.setCharacter = function(name, gmnotes, bio) {
		if(!name) {
			throw('Name require to get or create character');
		}
		name = shaped.capitalizeEachWord(name);

		var obj = findObjs({
			_type: 'character',
			name: name
		});

		if(obj.length === 0) {
			obj = createObj('character', {
				name: name
			});
			status = 'Character ' + name + ' created';
		} else {
			obj = getObj('character', obj[0].id);
			status = 'Character ' + name + ' updated';
		}

		if(!obj) {
			throw('Something prevent script to create or find character ' + name);
		}

		if(gmnotes)
			obj.set({
				gmnotes: gmnotes
			});

		if(bio)
			obj.set({
				bio: bio
			});

		characterId = obj.id;
		if(getAttrByName(characterId, 'is_npc') !== 1) {
			setAttribute('is_npc', 1);
		}

		return obj;
	};

	shaped.ImportStatblock = function(token) {
		status = 'Nothing modified';
		errors = [];
		try {
			var statblock = token.get('gmnotes').trim();

			if(statblock === '') {
				throw('Selected token GM Notes was empty.');
			}

			var name = shaped.parseStatblock(statblock);
			if(characterId) {
				token.set('represents', characterId);
				token.set('name', name);

				processBarSetting(1, token, name);
				processBarSetting(2, token, name);
				processBarSetting(3, token, name);

			}
		} catch(e) {
			status = 'Parsing was incomplete due to error(s)';
			log(e);
			errors.push(e);
		}

		log(status);
		sendChat('Shaped', '/w GM ' + status);

		if(errors.length > 0) {
			log(errors.join('\n'));
			sendChat('Shaped', '/w GM Error(s):\n/w GM ' + errors.join('\n/w GM '));
		}
	};

	function setAttribute(name, currentVal, max) {
		if(!name) {
			throw('Name required to set attribute');
		}

		max = max || '';

		if(!currentVal) {
			log('Error setting empty value: ' + name);
			return;
		}

		var attr = findObjs({
			_type: 'attribute',
			_characterid: characterId,
			name: name
		})[0];

		if(!attr) {
			log('Creating attribute ' + name);
			createObj('attribute', {
				name: name,
				current: currentVal,
				max: max,
				characterid: characterId
			});
		} else if(!attr.get('current') || attr.get('current').toString() !== currentVal) {
			log('Updating attribute ' + name);
			attr.set({
				current: currentVal,
				max: max
			});
		}
	}

	function setAbility(name, description, action, istokenaction) {
		if(!name) {
			throw('Name required to set ability');
		}

		var ability = findObjs({
			_type: 'ability',
			_characterid: characterId,
			name: name
		});

		if(!ability) {
			throw('Something prevent script to create or find ability ' + name);
		}

		if(ability.length === 0) {
			ability = createObj('ability', {
				_characterid: characterId,
				name: name,
				description: description,
				action: action,
				istokenaction: istokenaction
			});
			log('Ability ' + name + ' created');
		} else {
			ability = getObj('ability', ability[0].id);
			if(ability.get('description') != description || ability.get('action') !== action || ability.get('istokenaction') != istokenaction) {
				ability.set({
					description: description,
					action: action,
					istokenaction: istokenaction
				});
				log('Ability ' + name + ' updated');
			}
		}
	}

	shaped.parseStatblock = function(statblock) {
		log('---- Parsing statblock ----');

		text = clean(statblock);
		var keyword = findKeyword(text);
		var section = splitStatblock(text, keyword);
		shaped.setCharacter(section.attr.name, '', section.bio);
		processSection(section);
		return section.attr.name;
	};

	function clean(statblock) {
		statblock = unescape(statblock);
		statblock = statblock.replace(/–/g, '-');
		statblock = statblock.replace(/<br[^>]*>/g, '#').replace(/(<([^>]+)>)/ig, '');
		statblock = statblock.replace(/\s+#\s+/g, '#');
		statblock = statblock.replace(/#(?=[a-z])/g, ' ');
		statblock = statblock.replace(/\s+/g, ' ');

		//log(statblock)  ;
		return statblock;
	}

	function findKeyword(statblock) {
		var keyword = {
			attr: {},
			traits: {},
			actions: {},
			legendary: {}
		};

		var indexAction = 0;
		var indexLegendary = statblock.length;

		// Standard keyword
		var regex = /#\s*(tiny|small|medium|large|huge|gargantuan|armor class|hit points|speed|str|dex|con|int|wis|cha|saving throws|skills|damage resistances|damage immunities|condition immunities|damage vulnerabilities|senses|languages|challenge|traits|actions|legendary actions)(?=\s|#)/gi;
		while(match = regex.exec(statblock)) {
			key = match[1].toLowerCase();
			if(key === 'actions') {
				indexAction = match.index;
				keyword.actions.Actions = match.index;
			} else if(key === 'legendary actions') {
				indexLegendary = match.index;
				keyword.legendary.Legendary = match.index;
			} else {
				keyword.attr[key] = match.index;
			}
		}

		// Power
		regex = /(?:#|\.\s+)([A-Z][\w-]+(?:\s(?:[A-Z][\w-]+|[\(\)\d/-]|of)+)*)(?=\s*\.)/g;
		while(match = regex.exec(statblock)) {
			if(!keyword.attr[match[1].toLowerCase()]) {
				if(match.index < indexAction) {
					keyword.traits[match[1]] = match.index;
				} else if(match.index < indexLegendary) {
					keyword.actions[match[1]] = match.index;
				} else {
					keyword.legendary[match[1]] = match.index;
				}
			}
		}

		return keyword;
	}

	function splitStatblock(statblock, keyword) {
		// Check for bio (flavor text) at the end, separated by at least 3 line break.
		var bio;
		if((pos = statblock.indexOf('###')) != -1) {
			bio = statblock.substring(pos + 3).replace(/^[#\s]/g, '');
			bio = bio.replace(/#/g, '<br>').trim();
			statblock = statblock.slice(0, pos);
		}

		var debut = 0;
		var keyName = 'name';
		var sectionName = 'attr';

		for(var section in keyword) {
			var obj = keyword[section];
			for(var key in obj) {
				var fin = parseInt(obj[key], 10);
				keyword[sectionName][keyName] = extractSection(statblock, debut, fin, keyName);
				keyName = key;
				debut = fin;
				sectionName = section;
			}
		}
		keyword[sectionName][keyName] = extractSection(statblock, debut, statblock.length, keyName);

		delete keyword.actions.Actions;
		delete keyword.legendary.Legendary;

		if(bio) {
			keyword.bio = bio;
		}

		// Patch for multiline abilities
		var abilitiesName = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
		var abilities = '';
		for(i = 0, len = abilitiesName.length; i < len; ++i) {
			if(keyword.attr[abilitiesName[i]]) {
				abilities += keyword.attr[abilitiesName[i]] + ' ';
				delete keyword.attr[abilitiesName[i]];
			}
		}
		keyword.attr.abilities = abilities;

		// Size attribute:
		var size = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
		for(i = 0, len = abilitiesName.length; i < len; ++i) {
			if(keyword.attr[size[i]]) {
				keyword.attr.size = size[i] + ' ' + keyword.attr[size[i]];
				delete keyword.attr[size[i]];
				break;
			}
		}

		//Move legendary action summary to trait.
		if(keyword.legendary['Legendary Actions'] !== undefined) {
			keyword.traits['Legendary Actions'] = keyword.legendary['Legendary Actions'];
			delete keyword.legendary['Legendary Actions'];
		}
		return keyword;
	}

	function extractSection(text, debut, fin, title) {
		section = text.substring(debut, fin);
		// Remove action name from action description and clean.
		section = section.replace(new RegExp('^[\\s\\.#]*' + title.replace(/([-()\\/])/g, '\\$1') + '?[\\s\\.#]*', 'i'), '');
		section = section.replace(/#/g, ' ');
		return section;
	}

	function processSection(section) {
		// Process abilities first cause needed by other attribute.
		if('abilities' in section.attr) parseAbilities(section.attr.abilities);
		if('size' in section.attr) parseSize(section.attr.size);
		if('armor class' in section.attr) parseArmorClass(section.attr['armor class']);
		if('hit points' in section.attr) parseHp(section.attr['hit points']);
		if('speed' in section.attr) parseSpeed(section.attr.speed);
		if('challenge' in section.attr) parseChallenge(section.attr.challenge);
		if('saving throws' in section.attr) parseSavingThrow(section.attr['saving throws']);
		if('skills' in section.attr) parseSkills(section.attr.skills);
		if('senses' in section.attr) parseSenses(section.attr.senses);

		if('damage immunities' in section.attr) setAttribute('damage_immunity', section.attr['damage immunities']);
		if('condition immunities' in section.attr) setAttribute('condition_immunity', section.attr['condition immunities']);
		if('damage vulnerabilities' in section.attr) setAttribute('damage_vulnerability', section.attr['damage vulnerabilities']);
		if('damage resistances' in section.attr) setAttribute('damage_resistance', section.attr['damage resistances']);
		if('languages' in section.attr) setAttribute('prolanguages', section.attr.languages);

		parseTraits(section.traits);
		parseActions(section.actions, section.legendary);
	}

	/* Section parsing function */
	function parseAbilities(abilities) {
		var regex = /(\d+)\s*\(/g;
		var match = [];

		while(matches = regex.exec(abilities)) {
			match.push(matches[1]);
		}

		setAttribute('strength', match[0]);
		setAttribute('dexterity', match[1]);
		setAttribute('constitution', match[2]);
		setAttribute('intelligence', match[3]);
		setAttribute('wisdom', match[4]);
		setAttribute('charisma', match[5]);
	}

	function parseSize(size) {
		var match = size.match(/(.*?) (.*?), (.*)/i);
		setAttribute('size', shaped.capitalizeEachWord(match[1]));
		setAttribute('npc_type', shaped.capitalizeEachWord(match[2]));
		setAttribute('alignment', shaped.capitalizeEachWord(match[3]));
	}

	function parseArmorClass(ac) {
		var match = ac.match(/(\d+)\s?(.*)/);
		setAttribute('npc_AC', match[1]);
		setAttribute('npc_AC_note', match[2].replace(/\(|\)/g,''));
	}

	function parseHD(hd) {
		log('test: ' + hd);
		var splitHD = hd.match(/(\d+)d(\d+)/i),
				numHD = splitHD[1],
				HDsize = 'd' + splitHD[2];

		log('test ' + splitHD + ' ' + numHD + ' ' + HDsize);
		setAttribute('hd_' + HDsize, numHD, numHD);
	}
	function parseHp(hp) {
		var match = hp.match(/.*?(\d+)\s+\(((?:\d+)d(?:\d+))\s?(\+|\-)\s*?(\d+)/i);

		setAttribute('HP', match[1], match[1]);
		setAttribute('npc_HP_hit_dice', match[2] + ' ' + match[3] + ' ' + match[4]);

		parseHD(match[2]);
	}

	function parseSpeed(speed) {
		var baseAttr = 'speed',
				regex = /(|burrow|climb|fly|swim|)\s*(\d+)(?:ft)+(\(.*\))?/gi;

		while(match = regex.exec(speed)) {
			var attrName = baseAttr + (match[1] !== '' ? '_' + match[1].toLowerCase() : ''),
					value = match[2];

			if(match[3]) {
				if(match[3].indexOf('hover')) {
					setAttribute('speed_fly_hover', 'on');
				}
			}
			setAttribute(attrName, value);
		}
	}

	function parseSenses(senses) {
		senses = senses.replace(/[,\s]*passive.*/i,'');
		var regex = /(|blindsight|darkvision|tremorsense|truesight|)\s*(\d+)(?:ft)+(\(.*\))?/gi;

		while(match = regex.exec(senses)) {
			var attrName = match[1].toLowerCase(),
					value = match[2];

			if(match[3]) {
				if(match[3].indexOf('blind beyond')) {
					setAttribute('blindsight_blind_beyond', 'on');
				}
			}
			setAttribute(attrName, value);
		}
	}

	function parseChallenge(cr) {
		input = cr.replace(/[, ]/g, '');
		var match = input.match(/([\d/]+).*?(\d+)/);
		setAttribute('challenge', match[1]);

		var xp = parseInt(match[2]);
		if(getAttrByName(characterId, 'xp') !== xp) {
			setAttribute('xp', xp);
		}
	}

	function parseSavingThrow(save) {
		var regex = /(STR|DEX|CON|INT|WIS|CHA).*?(\d+)/gi;
		var attr, value;
		while(match = regex.exec(save)) {
			// Substract ability modifier from this field since sheet computes it
			switch(match[1].toLowerCase()) {
				case 'str':
					attr = 'strength';
					break;
				case 'dex':
					attr = 'dexterity';
					break;
				case 'con':
					attr = 'constitution';
					break;
				case 'int':
					attr = 'intelligence';
					break;
				case 'wis':
					attr = 'wisdom';
					break;
				case 'cha':
					attr = 'charisma';
					break;
			}
			setAttribute(attr + '_save_bonus', match[2] - Math.floor((getAttrByName(characterId, attr) - 10) / 2));
		}
	}

	function parseSkills(skills) {
		// Need to substract ability modifier skills this field since sheet compute it
		var skillAbility = {
			acrobatics: 'dexterity',
			'animal handling': 'wisdom',
			arcana: 'intelligence',
			athletics: 'strength',
			deception: 'charisma',
			history: 'intelligence',
			insight: 'wisdom',
			intimidation: 'charisma',
			investigation: 'intelligence',
			medicine: 'wisdom',
			nature: 'intelligence',
			perception: 'wisdom',
			performance: 'charisma',
			persuasion: 'charisma',
			religion: 'intelligence',
			'sleight of hand': 'dexterity',
			stealth: 'dexterity',
			survival: 'wisdom'
		};

		var regex = /([\w\s]+).*?(\d+)/gi;
		while(match = regex.exec(skills.replace(/Skills\s+/i, ''))) {
			var skill = match[1].trim().toLowerCase();
			if(skill in skillAbility) {
				var abilitymod = skillAbility[skill],
						attr = skill.replace(/\s/g, '') + '_bonus';
				setAttribute(attr, match[2] - Math.floor((getAttrByName(characterId, abilitymod) - 10) / 2));
			} else {
				errors.push('Skill ' + skill + ' is not a valid skill');
			}
		}
	}
	function parseTraits(traits) {
		var text = '';
		_.each(traits, function(value, key) {
			value = value.replace(/[\.\s]+$/, '.');
			text += '**' + key + '**: ' + value + ' ';
		});

		text = text.slice(0, -1);
		if(text !== '') {
			setAttribute('npc_traits', text);
		}
	}

	function parseActions(actions, legendary) {
		var multiattackText = '';
		var actionPosition = []; // For use with multiattack.

		if('Multiattack' in actions) {
			setAttribute('npc_multiattack', actions.Multiattack);
			multiattackText = actions.Multiattack;
			delete actions.Multiattack;
		}

		var actionNum = 1;
		_.each(actions, function(value, key) {
			var parsedAttack = false,
					parsedDetails = false,
					parsedDamage = false;
			if((pos = key.indexOf('(')) > 1) {
				actionPosition[actionNum] = key.substring(0, pos - 1).toLowerCase();
			} else {
				actionPosition[actionNum] = key.toLowerCase();
			}
			setAttribute('npc_action_name_' + actionNum, key);

			value = value.replace(/ft\s\./gi, 'ft.').replace(/ft\.\s\,/gi, 'ft').replace(/ft\./gi, 'ft');
			value = value.replace(/ld(\d+)/gi, "1d$1").replace(/ld\s+(\d+)/gi, "1d$1").replace(/(\d+)d\s+(\d+)/gi, "$1d$2").replace(/(\d+)\s+d(\d+)/gi, "$1d$2");

			var replaceObj = {
				'abol eth': 'aboleth',
				'Aundefinedr': 'After',
				'com muni cate': 'communicate',
				'dea ls': 'deals',
				'di sease': 'disease',
				'di stance': 'distance',
				'fe et': 'feet',
				'ex istence': 'existence',
				'magica lly': 'magically',
				'minlilte': 'minute',
				'ra nge':'range',
				'rega ins': 'regains',
				'slash ing': 'slashing',
				'ta rget': 'target',
				'withi n': 'within'

			};
			var re = new RegExp(Object.keys(replaceObj).join('|'),'gi');
			value = value.replace(re, function(matched){
				return replaceObj[matched];
			});

			log('value: ' + value);

			var splitAction = value.split('.'),
					attackInfo = splitAction[0],
					damageInfo = splitAction[1],
					splitAttack = attackInfo.split(',');

			var typeRegex = /(melee|ranged|melee or ranged)\s*(spell|weapon)\s*/gi;
			while(type = typeRegex.exec(splitAttack[0])) {
				if(type[1]) {
					var meleeOrRanged = 'Melee or Ranged';
					if(type[1].toLowerCase() === meleeOrRanged.toLowerCase()) {
						type[1] = 'Thrown';
					}
					setAttribute('npc_action_type_' + actionNum, shaped.capitalizeEachWord(type[1]));
				}
				if(type[2]) {
					var attackWeaponOrSpell = shaped.capitalizeEachWord(type[2]);
				}
				parsedAttack = true;
			}
			var toHitRegex = /\+\s?(\d+)\s*(?:to hit)/gi;
			while(toHit = toHitRegex.exec(splitAttack[0])) {
				if(toHit[1]) {
					setAttribute('npc_action_tohit_' + actionNum, toHit[1]);
					setAttribute('npc_action_toggle_attack_' + actionNum, '@{npc_action_var_attack_' + actionNum + '}');
					setAttribute('npc_action_toggle_crit_' + actionNum, '@{npc_action_var_crit_' + actionNum + '}');
				}
				if(splitAttack[2]) {
					setAttribute('npc_action_target_' + actionNum, splitAttack[2].trim().toLowerCase());
					parsedDetails = true;
				}
				parsedAttack = true;
			}
			var reachRegex = /(?:reach)\s?(\d+)\s?(?:ft)/gi;
			while(reach = reachRegex.exec(splitAttack[1])) {
				if(reach[1]) {
					setAttribute('npc_action_reach_' + actionNum, reach[1] + ' ft');
				}
				parsedAttack = true;
				parsedDetails = true;
			}
			var rangeRegex = /(?:range)\s?(\d+)\/(\d+)\s?(ft)/gi;
			while(range = rangeRegex.exec(splitAttack[1])) {
				if(range[1] && range[2]) {
					setAttribute('npc_action_range_' + actionNum, range[1] + '/' + range[2] + ' ft');
				}
				parsedAttack = true;
				parsedDetails = true;
			}
			if(parsedDetails) {
				setAttribute('npc_action_toggle_details_' + actionNum, '@{npc_action_var_details_' + actionNum + '}');
			}

			log('damageInfo: ' + damageInfo);
			var damageRegex = /(?:Hit:|Each).*?(?:(\d+)|(?:\d+).*?((\d+d\d+)[\d\s+]*).*?)\s*?([a-zA-Z]*)\s*?(?:damage)(?:\.|.*?plus|.*?\,)?/gi;
			while(damage = damageRegex.exec(damageInfo)) {
				setAttribute('npc_action_dmg_' + actionNum, damage[1] || damage[2]);
				setAttribute('npc_action_toggle_damage_' + actionNum, '@{npc_action_var_damage_' + actionNum + '}');
				setAttribute('npc_action_dmg_type_' + actionNum, damage[4]);
				setAttribute('npc_action_crit_dmg_' + actionNum, damage[1] || damage[3]);
				parsedDamage = true;
			}
			var secondaryDamageRegex = /(?:plus)\s*?(?:(\d+)|(?:\d+)\s*?\(?((\d+d\d+)[\d\s+]*)\)?)\s*?([a-zA-Z]*)\s*(?:damage)/gi;
			while(secondaryDamage = secondaryDamageRegex.exec(damageInfo)) {
				setAttribute('npc_action_second_dmg_' + actionNum, secondaryDamage[1] || secondaryDamage[2]);
				setAttribute('npc_action_toggle_second_damage_' + actionNum, '@{npc_action_var_second_damage_' + actionNum + '}');
				setAttribute('npc_action_second_dmg_type_' + actionNum, secondaryDamage[4]);
				setAttribute('npc_action_second_crit_dmg_' + actionNum, secondaryDamage[1] || secondaryDamage[3]);
				parsedDamage = true;
			}
			var alternateDamageRegex = /(?:\,)\s*?(?:or)\s*?(?:(\d+)|(?:\d+)\s*?\(?((\d+d\d+)[\d\s+]*)\)?)\s*?([a-zA-Z]*)\s*(?:damage)\s(.*)/gi;
			while(alternateDamage = alternateDamageRegex.exec(damageInfo)) {
				setAttribute('npc_action_alt_dmg_' + actionNum, alternateDamage[1] || alternateDamage[2]);
				setAttribute('npc_action_alt_crit_dmg_' + actionNum, alternateDamage[1] || alternateDamage[3]);
				if(alternateDamage[5]) {
					setAttribute('npc_action_alt_dmg_reason_' + actionNum, alternateDamage[5]);
				}
				setAttribute('npc_action_toggle_alt_damage_' + actionNum, '@{npc_action_var_alt_damage_' + actionNum + '}');
				parsedDamage = true;
			}

			if(parsedDamage) {
				var effectRegex = /(?:\,)\s*?(?:and)\s(.*)/gi;
				while(effect = effectRegex.exec(damageInfo)) {
					setAttribute('npc_action_effect_' + actionNum, effect[1].replace(/(\+\s?(\d+))/g, '$1 : [[1d20+$2]]|[[1d20+$2]]'));
					setAttribute('npc_action_toggle_effects_' + actionNum, '@{npc_action_var_effects_' + actionNum + '}');
				}
			}

			var saveRegex = /(?:DC)\s*?(\d+)\s*?([a-zA-Z]*)\s*?(?:saving throw)\s(.*)/gi;
			while(save = saveRegex.exec(value)) {
				log('save: ' + save);
				if(save[1]) {
					setAttribute('npc_action_save_dc_' + actionNum, save[1]);
				}
				if(save[2]) {
					setAttribute('npc_action_save_stat_' + actionNum, save[2].substring(0, 3));
				}
				if(save[1] || save[2]){
					setAttribute('npc_action_toggle_save_' + actionNum, '@{npc_action_var_save_' + actionNum + '}');
				}
				if(save[3]) {
					setAttribute('npc_action_effect_' + actionNum, save[3]);
					setAttribute('npc_action_toggle_effects_' + actionNum, '@{npc_action_var_effects_' + actionNum + '}');
				}
			}

			if(!parsedAttack && !parsedDamage) {
				//make this work
				value = value.replace(/(?:DC)\s*?(\d+)/gi, '[[$1]]');
				setAttribute('npc_action_effect_' + actionNum, value);
				setAttribute('npc_action_toggle_effects_' + actionNum, '@{npc_action_var_effects_' + actionNum + '}');
			}

			// Create token action
			if(shaped.usePowerAbility) {
				setAbility(key, '', powercardAbility(id, actionNum), shaped.createAbilityAsToken);
			} else {
				setAbility(key, '', '%{selected|npc_action_' + actionNum + '}', shaped.createAbilityAsToken);
			}
			actionNum++;
		});
		/*
		var actionList = actionPosition.join('|').slice(1);

		if(multiattackText !== '') {
			//var regex = new RegExp('(?:(?:(one|two) with its )?(' + actionList + '))', 'gi');
			var regex = new RegExp('(one|two)? (?:with its )?(' + actionList + ')', 'gi');
			var macro = '';

			while(match = regex.exec(multiattackText)) {
				var action = match[2];
				var nb = match[1] || 'one';
				var actionNumber = actionPosition.indexOf(action.toLowerCase());

				if(actionNumber !== -1) {
					macro += '%{selected|NPCAction' + actionNumber + '}\n';
					if(nb == 'two') {
						macro += '%{selected|NPCAction' + actionNumber + '}\n';
					}
					delete actionPosition[actionNumber]; // Remove
				}
			}

			setAttribute('npc_action_name_' + actionNum, 'MultiAttack');
			setAttribute('npc_action_effect_' + actionNum, macro.slice(0, -1));
			//setAttribute('npc_action_multiattack_' + actionNum, '{{npc_showmultiattack=1}} {{npc_multiattack=@{npc_multiattack}}}');

			if(shaped.usePowerAbility) {
				setAbility('MultiAttack', '', powercardAbility(id, actionNum), shaped.createAbilityAsToken);
			} else {
				setAbility('MultiAttack', '', '%{selected|NPCAction' + actionNum + '}', shaped.createAbilityAsToken);
			}
			actionNum++;
		}

		_.each(legendary, function(value, key) {
			//attr_npc_lair_action_emote_1
			//attr_npc_legendary_action_emote_1
			//attr_npc_action_emote_1
			setAttribute('npc_action_name_' + actionNum, key);
			setAttribute('npc_action_type_' + actionNum, '(Legendary Action)');

			var regex = new RegExp('makes a (' + actionList + ')', 'i');
			var match = value.match(regex);
			if(match) {
				var macro = '%{selected|NPCAction' + actionPosition.indexOf(match[1].toLowerCase()) + '}';
				setAttribute('npc_action_effect_' + actionNum, macro);
			} else {
				match = value.match(/(Each|Hit:)/);
				if(match) {
					text = value.substring(0, match.index).replace(/(\+\s?(\d+))/g, '$1 : [[1d20+$2]]|[[1d20+$2]]');
					setAttribute('npc_action_emote_' + actionNum, text);

					text = value.substring(match.index).replace(/(\d+d\d+[\d\s+]*)/g, '[[$1]]');
					setAttribute('npc_action_effect_' + actionNum, text);
				} else {
					text = value.replace(/(\+\s?(\d+))/g, '$1 : [[1d20+$2]]|[[1d20+$2]]');
					setAttribute('npc_action_emote_' + actionNum, text);
				}
			}
			actionNum++;
		});
		*/
	}

	function processBarSetting(i, token, name) {
		var attribute = shaped['parsebar' + i];

		if(attribute) {
			log('Attribute to set to bar ' + i + ': ' + attribute);
		}

		if(attribute && attribute !== '') {
			//value = getAttrByName(characterId, attribute, 'current');
			var command = '\\w GM [[@{' + name + '|'+ attribute + '}]]';
			sendChat('Shaped', command, function(ops) {
				var res = ops[0].inlinerolls['1'].results.total;
				setBarValue(token, i, res);
			});
		}
	}

	function setBarValue(token, barNumber, value) {
		if(value && value !== '') {
			var bar = 'bar' + barNumber;
			log('Setting ' + bar + ' to value ' + value);
			token.set(bar + '_value', value);
			token.set(bar + '_max', value);
		} else {
			log("Can't set empty value to bar " + barNumber);
		}
	}


	function convertAttrFromNPCtoPC(npc_attr_name, attr_name) {
		var npc_attr = getAttrByName(characterId, npc_attr_name),
				attr = getAttrByName(characterId, attr_name);
		if(npc_attr && !attr) {
			log('convert from ' + npc_attr_name + ' to ' + attr_name);
			setAttribute(attr_name, npc_attr);
		}
	}

	shaped.parseOldToNew = function(token) {
		log('---- Parsing old attributes to new ----');

		obj = findObjs({
			_type: 'character',
			name: token.attributes.name
		})[0];
		characterId = obj.id;


		convertAttrFromNPCtoPC('npc_initiative', 'initiative');
		convertAttrFromNPCtoPC('npc_initiative_overall', 'initiative_overall');



		convertAttrFromNPCtoPC('npc_strength', 'strength');
		convertAttrFromNPCtoPC('npc_strength_save_bonus', 'strength_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_strength_bonus', 'basic_strength_bonus');
		convertAttrFromNPCtoPC('npc_dexterity', 'dexterity');
		convertAttrFromNPCtoPC('npc_dexterity_save_bonus', 'dexterity_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_dexterity_bonus', 'basic_dexterity_bonus');
		convertAttrFromNPCtoPC('npc_constitution', 'constitution');
		convertAttrFromNPCtoPC('npc_constitution_save_bonus', 'constitution_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_constitution_bonus', 'basic_constitution_bonus');
		convertAttrFromNPCtoPC('npc_intelligence', 'intelligence');
		convertAttrFromNPCtoPC('npc_intelligence_save_bonus', 'intelligence_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_intelligence_bonus', 'basic_intelligence_bonus');
		convertAttrFromNPCtoPC('npc_wisdom', 'wisdom');
		convertAttrFromNPCtoPC('npc_wisdom_save_bonus', 'wisdom_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_wisdom_bonus', 'basic_wisdom_bonus');
		convertAttrFromNPCtoPC('npc_charisma', 'charisma');
		convertAttrFromNPCtoPC('npc_charisma_save_bonus', 'charisma_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_charisma_bonus', 'basic_charisma_bonus');



		convertAttrFromNPCtoPC('npc_alignment', 'alignment');


		var npc_HP = getAttrByName(characterId, 'npc_HP'),
				HP = getAttrByName(characterId, 'HP'),
				npc_HP_max = getAttrByName(characterId, 'npc_HP', 'max'),
				HP_max = getAttrByName(characterId, 'HP', 'max');
		if(npc_HP && !HP && npc_HP_max && !HP_max) {
			setAttribute('HP', npc_HP, npc_HP_max);
		} else if (npc_HP && !HP) {
			setAttribute('HP', npc_HP);
		} else if (npc_HP_max && !HP_max) {
			setAttribute('HP', 0, npc_HP_max);
		}
		convertAttrFromNPCtoPC('npc_temp_HP', 'temp_HP');

		var npc_hd = getAttrByName(characterId, 'npc_HP_hit_dice');
		if(npc_hd) {
			parseHD(npc_hd);
		}





		convertAttrFromNPCtoPC('npc_speed', 'speed');
		convertAttrFromNPCtoPC('npc_speed_fly', 'speed_fly');
		convertAttrFromNPCtoPC('npc_speed_climb', 'speed_climb');
		convertAttrFromNPCtoPC('npc_speed_swim', 'speed_swim');



		convertAttrFromNPCtoPC('npc_xp', 'xp');
		convertAttrFromNPCtoPC('npc_challenge', 'challenge');
		convertAttrFromNPCtoPC('npc_size', 'size');
		convertAttrFromNPCtoPC('npc_senses', 'vision');
		convertAttrFromNPCtoPC('npc_languages', 'prolanguages');



		convertAttrFromNPCtoPC('npc_damage_resistance', 'damage_resistance');
		convertAttrFromNPCtoPC('npc_damage_vulnerability', 'damage_vulnerability');
		convertAttrFromNPCtoPC('npc_damage_immunity', 'damage_immunity');
		convertAttrFromNPCtoPC('npc_condition_immunity', 'condition_immunity');



		convertAttrFromNPCtoPC('npc_acrobatics_bonus', 'acrobatics_bonus');
		convertAttrFromNPCtoPC('npc_animalhandling_bonus', 'animalhandling_bonus');
		convertAttrFromNPCtoPC('npc_arcana_bonus', 'arcana_bonus');
		convertAttrFromNPCtoPC('npc_athletics_bonus', 'athletics_bonus');
		convertAttrFromNPCtoPC('npc_deception_bonus', 'deception_bonus');
		convertAttrFromNPCtoPC('npc_history_bonus', 'history_bonus');
		convertAttrFromNPCtoPC('npc_insight_bonus', 'insight_bonus');
		convertAttrFromNPCtoPC('npc_intimidation_bonus', 'intimidation_bonus');
		convertAttrFromNPCtoPC('npc_investigation_bonus', 'investigation_bonus');
		convertAttrFromNPCtoPC('npc_medicine_bonus', 'medicine_bonus');
		convertAttrFromNPCtoPC('npc_nature_bonus', 'nature_bonus');
		convertAttrFromNPCtoPC('npc_perception_bonus', 'perception_bonus');
		convertAttrFromNPCtoPC('npc_performance_bonus', 'performance_bonus');
		convertAttrFromNPCtoPC('npc_persuasion_bonus', 'persuasion_bonus');
		convertAttrFromNPCtoPC('npc_religion_bonus', 'religion_bonus');
		convertAttrFromNPCtoPC('npc_sleightofhand_bonus', 'sleightofhand_bonus');
		convertAttrFromNPCtoPC('npc_stealth_bonus', 'stealth_bonus');
		convertAttrFromNPCtoPC('npc_survival_bonus', 'survival_bonus');

		shaped.setBars(token);
	};

	function setBarValueAfterConvert(token, bar, obj) {
		if(obj) {
			log('Setting ' + bar + ' to: id: ' + obj.id + ' current: ' + obj.attributes.current + ' max: ' + obj.attributes.max);
			if(obj.attributes.current) {
				token.set(bar + '_value', obj.attributes.current);
			}
			if(obj.attributes.max) {
				token.set(bar + '_max', obj.attributes.max);
			}
			if(obj.id) {
				token.set(bar + '_link', obj.id);
			}
		} else {
			log("Can't set empty object to bar " + bar);
		}
	}

	function getAndSetBarInfo(token, bar) {
		var bar_link = token.get(bar + '_link');
		if(!bar_link) {
			var parsebar = shaped['parse' + bar];
			log('parsebar: ' + parsebar);
			if(parsebar) {
				var objOfParsebar = findObjs({
					name: parsebar,
					_type: 'attribute',
					_characterid: characterId
				}, {caseInsensitive: true})[0];
				setBarValueAfterConvert(token, bar, objOfParsebar);
			}
		} else {
			objOfBar = {
				id: bar_link,
				attributes: {}
			};
			var bar_value = token.get(bar + '_value');
			if(bar_value) {
				objOfBar.attributes.value = bar_value;
			}
			var bar_max = token.get(bar + '_max');
			if(bar_max) {
				objOfBar.attributes.max = bar_max;
			}
			setBarValueAfterConvert(token, bar, objOfBar);
		}
	}

	shaped.setBars = function(token) {
		log('set bars');

		getAndSetBarInfo(token, 'bar1');
		getAndSetBarInfo(token, 'bar2');
		getAndSetBarInfo(token, 'bar3');
	};

}(typeof shaped === 'undefined' ? shaped = {} : shaped));

on('ready', function() {
	'use strict';
	shaped.statblock.RegisterHandlers();
});