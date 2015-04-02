(function (shaped, undefined) {

	/* Options
		 Setting these to a sheet value will set the token bar value. If they are set to '' or not set then it will use whatever you already have set on the token
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
		version: '1.0',
		RegisterHandlers: function () {
			on('chat:message', HandleInput);

			log('Shaped Convert ready');
		}
	};
	var obj = null,
			characterId = null;

	function HandleInput(msg) {
		if(msg.type !== 'api') {
			return;
		}
		log('msg.content' + msg.content);
		args = msg.content.split(/\s+/);
		switch(args[0]) {
			case '!shaped-convert':
				shaped.getSelectedToken(msg, shaped.parseOldToNew);
				break;
		}
	}

	shaped.getSelectedToken = shaped.getSelectedToken || function(msg, callback, limit) {
		try {
			if(msg.selected == undefined || msg.selected.length == undefined) {
				throw('No token selected');
			}

			limit = parseInt(limit, 10) || 0;

			if(limit == undefined || limit > msg.selected.length + 1 || limit < 1)
				limit = msg.selected.length;

			for(i = 0; i < limit; i++) {
				if(msg.selected[i]._type == 'graphic') {
					var obj = getObj('graphic', msg.selected[i]._id);
					if(obj !== undefined && obj.get('subtype') == 'token') {
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
		} else if(!attr.get('current') || attr.get('current').toString() != currentVal) {
			log('Updating attribute ' + name);
			attr.set({
				current: currentVal,
				max: max
			});
		}
	}

	function convertAttrFromNPCtoPC(npc_attr_name, attr_name) {
		var npc_attr = getAttrByName(characterId, npc_attr_name),
				attr = getAttrByName(characterId, attr_name);
		if(npc_attr && !attr) {
			log('convert from ' + npc_attr_name + ' to ' + attr_name)
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



		convertAttrFromNPCtoPC('npc_speed', 'speed');
		convertAttrFromNPCtoPC('npc_speed_fly', 'speed_fly');
		convertAttrFromNPCtoPC('npc_speed_climb', 'speed_climb');
		convertAttrFromNPCtoPC('npc_speed_swim', 'speed_swim');



		convertAttrFromNPCtoPC('npc_xp', 'xp');
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

	function setBarValue(token, bar, obj) {
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
				setBarValue(token, bar, objOfParsebar);
			}
		} else {
			objOfBar = {
				id: bar_link,
				attributes: {}
			}
			var bar_value = token.get(bar + '_value');
			if(bar_value) {
				objOfBar.attributes.value = bar_value;
			}
			var bar_max = token.get(bar + '_max');
			if(bar_max) {
				objOfBar.attributes.max = bar_max;
			}
			setBarValue(token, bar, objOfBar);
		}
	}

	shaped.setBars = function(token) {
		log('set bars');

		getAndSetBarInfo(token, 'bar1');
		getAndSetBarInfo(token, 'bar2');
		getAndSetBarInfo(token, 'bar3');
	}

}(typeof shaped === 'undefined' ? shaped = {} : shaped));

on('ready', function() {
	'use strict';
	shaped.statblock.RegisterHandlers();
});