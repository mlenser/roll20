(function (shaped, undefined) {

	shaped.statblock = {
		version: "1.0",
		RegisterHandlers: function () {
			on('chat:message', HandleInput);

			log("Shaped Convert ready");
		}
	};
	var characterId = null;

	function HandleInput(msg) {
		if(msg.type !== "api") {
			return;
		}
		log("msg.content" + msg.content);
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
			throw("Name required to set attribut");
		}

		max = max || '';

		if(!currentVal) {
			log("Error setting empty value: " + name);
			return;
		}

		var attr = findObjs({
			_type: 'attribute',
			_characterid: characterId,
			name: name
		})[0];

		if(!attr) {
			log("Creating attribut " + name);
			createObj('attribute', {
				name: name,
				current: currentVal,
				max: max,
				characterid: characterId
			});
		} else if(!attr.get('current') || attr.get('current').toString() != currentVal) {
			log("Updating attribut " + name);
			attr.set({
				current: currentVal,
				max: max
			});
		}
	}

	shaped.parseOldToNew = function(token) {
		log("---- Parsing old attributes to new ----");

		var obj = findObjs({
			_type: "character",
			name: token.attributes.name
		})[0];
		characterId = obj.id;

		var npc_initiative = getAttrByName(characterId, 'npc_initiative');
		if(npc_initiative) {
			setAttribute('initiative', npc_initiative);
		}
		var npc_initiative_overall = getAttrByName(characterId, 'npc_initiative_overall');
		if(npc_initiative_overall) {
			setAttribute('initiative_overall', npc_initiative_overall);
		}



		var npc_strength = getAttrByName(characterId, 'npc_strength');
		if(npc_strength) {
			setAttribute('strength', npc_strength);
		}
		var npc_strength_save_bonus = getAttrByName(characterId, 'npc_strength_save_bonus');
		if(npc_strength_save_bonus) {
			setAttribute('strength_save_bonus', npc_strength_save_bonus);
		}
		var npc_basic_strength_bonus = getAttrByName(characterId, 'npc_basic_strength_bonus');
		if(npc_basic_strength_bonus) {
			setAttribute('basic_strength_bonus', npc_basic_strength_bonus);
		}
		var npc_dexterity = getAttrByName(characterId, 'npc_dexterity');
		if(npc_dexterity) {
			setAttribute('dexterity', npc_dexterity);
		}
		var npc_dexterity_save_bonus = getAttrByName(characterId, 'npc_dexterity_save_bonus');
		if(npc_dexterity_save_bonus) {
			setAttribute('dexterity_save_bonus', npc_dexterity_save_bonus);
		}
		var npc_basic_dexterity_bonus = getAttrByName(characterId, 'npc_basic_dexterity_bonus');
		if(npc_basic_dexterity_bonus) {
			setAttribute('basic_dexterity_bonus', npc_basic_dexterity_bonus);
		}
		var npc_constitution = getAttrByName(characterId, 'npc_constitution');
		if(npc_constitution) {
			setAttribute('constitution', npc_constitution);
		}
		var npc_constitution_save_bonus = getAttrByName(characterId, 'npc_constitution_save_bonus');
		if(npc_constitution_save_bonus) {
			setAttribute('constitution_save_bonus', npc_constitution_save_bonus);
		}
		var npc_basic_constitution_bonus = getAttrByName(characterId, 'npc_basic_constitution_bonus');
		if(npc_basic_constitution_bonus) {
			setAttribute('basic_constitution_bonus', npc_basic_constitution_bonus);
		}
		var npc_intelligence = getAttrByName(characterId, 'npc_intelligence');
		if(npc_intelligence) {
			setAttribute('intelligence', npc_intelligence);
		}
		var npc_intelligence_save_bonus = getAttrByName(characterId, 'npc_intelligence_save_bonus');
		if(npc_intelligence_save_bonus) {
			setAttribute('intelligence_save_bonus', npc_intelligence_save_bonus);
		}
		var npc_basic_intelligence_bonus = getAttrByName(characterId, 'npc_basic_intelligence_bonus');
		if(npc_basic_intelligence_bonus) {
			setAttribute('basic_intelligence_bonus', npc_basic_intelligence_bonus);
		}
		var npc_wisdom = getAttrByName(characterId, 'npc_wisdom');
		if(npc_wisdom) {
			setAttribute('wisdom', npc_wisdom);
		}
		var npc_wisdom_save_bonus = getAttrByName(characterId, 'npc_wisdom_save_bonus');
		if(npc_wisdom_save_bonus) {
			setAttribute('wisdom_save_bonus', npc_wisdom_save_bonus);
		}
		var npc_basic_wisdom_bonus = getAttrByName(characterId, 'npc_basic_wisdom_bonus');
		if(npc_basic_wisdom_bonus) {
			setAttribute('basic_wisdom_bonus', npc_basic_wisdom_bonus);
		}
		var npc_charisma = getAttrByName(characterId, 'npc_charisma');
		if(npc_charisma) {
			setAttribute('charisma', npc_charisma);
		}
		var npc_charisma_save_bonus = getAttrByName(characterId, 'npc_charisma_save_bonus');
		if(npc_charisma_save_bonus) {
			setAttribute('charisma_save_bonus', npc_charisma_save_bonus);
		}
		var npc_basic_charisma_bonus = getAttrByName(characterId, 'npc_basic_charisma_bonus');
		if(npc_basic_charisma_bonus) {
			setAttribute('basic_charisma_bonus', npc_basic_charisma_bonus);
		}



		var npc_alignment = getAttrByName(characterId, 'npc_alignment');
		if(npc_alignment) {
			setAttribute('alignment', npc_alignment);
		}



		var npc_HP = getAttrByName(characterId, 'npc_HP'),
				npc_HP_max = getAttrByName(characterId, 'npc_HP', 'max');
		if(npc_HP && npc_HP_max) {
			setAttribute('HP', npc_HP, npc_HP_max);
		} else if (npc_HP) {
			setAttribute('HP', npc_HP);
		} else if (npc_HP_max) {
			setAttribute('HP', 0, npc_HP_max);
		}
		var npc_temp_HP = getAttrByName(characterId, 'npc_temp_HP');
		if(npc_temp_HP) {
			setAttribute('temp_HP', npc_temp_HP);
		}



		var npc_speed = getAttrByName(characterId, 'npc_speed');
		if(npc_speed) {
			setAttribute('speed', npc_speed);
		}
		var npc_speed_fly = getAttrByName(characterId, 'npc_speed_fly');
		if(npc_speed_fly) {
			setAttribute('speed_fly', npc_speed_fly);
		}
		var npc_speed_climb = getAttrByName(characterId, 'npc_speed_climb');
		if(npc_speed_climb) {
			setAttribute('speed_climb', npc_speed_climb);
		}
		var npc_speed_swim = getAttrByName(characterId, 'npc_speed_swim');
		if(npc_speed_swim) {
			setAttribute('speed_swim', npc_speed_swim);
		}



		var npc_xp = getAttrByName(characterId, 'npc_xp');
		if(npc_xp) {
			setAttribute('xp', npc_xp);
		}
		var npc_senses = getAttrByName(characterId, 'npc_senses');
		if(npc_senses) {
			setAttribute('vision', npc_senses);
		}
		var npc_languages = getAttrByName(characterId, 'npc_languages');
		if(npc_languages) {
			setAttribute('prolanguages', npc_languages);
		}



		var npc_damage_resistance = getAttrByName(characterId, 'npc_damage_resistance');
		if(npc_damage_resistance) {
			setAttribute('damage_resistance', npc_damage_resistance);
		}
		var npc_damage_vulnerability = getAttrByName(characterId, 'npc_damage_vulnerability');
		if(npc_damage_vulnerability) {
			setAttribute('damage_vulnerability', npc_damage_vulnerability);
		}
		var npc_damage_immunity = getAttrByName(characterId, 'npc_damage_immunity');
		if(npc_damage_immunity) {
			setAttribute('damage_immunity', npc_damage_immunity);
		}
		var npc_condition_immunity = getAttrByName(characterId, 'npc_condition_immunity');
		if(npc_condition_immunity) {
			setAttribute('condition_immunity', npc_condition_immunity);
		}



		var npc_acrobatics_bonus = getAttrByName(characterId, 'npc_acrobatics_bonus');
		if(npc_acrobatics_bonus) {
			setAttribute('acrobatics_bonus', npc_acrobatics_bonus);
		}
		var npc_animalhandling_bonus = getAttrByName(characterId, 'npc_animalhandling_bonus');
		if(npc_animalhandling_bonus) {
			setAttribute('animalhandling_bonus', npc_animalhandling_bonus);
		}
		var npc_arcana_bonus = getAttrByName(characterId, 'npc_arcana_bonus');
		if(npc_arcana_bonus) {
			setAttribute('arcana_bonus', npc_arcana_bonus);
		}
		var npc_athletics_bonus = getAttrByName(characterId, 'npc_athletics_bonus');
		if(npc_athletics_bonus) {
			setAttribute('athletics_bonus', npc_athletics_bonus);
		}
		var npc_deception_bonus = getAttrByName(characterId, 'npc_deception_bonus');
		if(npc_deception_bonus) {
			setAttribute('deception_bonus', npc_deception_bonus);
		}
		var npc_history_bonus = getAttrByName(characterId, 'npc_history_bonus');
		if(npc_history_bonus) {
			setAttribute('history_bonus', npc_history_bonus);
		}
		var npc_insight_bonus = getAttrByName(characterId, 'npc_insight_bonus');
		if(npc_insight_bonus) {
			setAttribute('insight_bonus', npc_insight_bonus);
		}
		var npc_intimidation_bonus = getAttrByName(characterId, 'npc_intimidation_bonus');
		if(npc_intimidation_bonus) {
			setAttribute('intimidation_bonus', npc_intimidation_bonus);
		}
		var npc_investigation_bonus = getAttrByName(characterId, 'npc_investigation_bonus');
		if(npc_investigation_bonus) {
			setAttribute('investigation_bonus', npc_investigation_bonus);
		}
		var npc_medicine_bonus = getAttrByName(characterId, 'npc_medicine_bonus');
		if(npc_medicine_bonus) {
			setAttribute('medicine_bonus', npc_medicine_bonus);
		}
		var npc_nature_bonus = getAttrByName(characterId, 'npc_nature_bonus');
		if(npc_nature_bonus) {
			setAttribute('nature_bonus', npc_nature_bonus);
		}
		var npc_perception_bonus = getAttrByName(characterId, 'npc_perception_bonus');
		if(npc_perception_bonus) {
			setAttribute('perception_bonus', npc_perception_bonus);
		}
		var npc_performance_bonus = getAttrByName(characterId, 'npc_performance_bonus');
		if(npc_performance_bonus) {
			setAttribute('performance_bonus', npc_performance_bonus);
		}
		var npc_persuasion_bonus = getAttrByName(characterId, 'npc_persuasion_bonus');
		if(npc_persuasion_bonus) {
			setAttribute('persuasion_bonus', npc_persuasion_bonus);
		}
		var npc_religion_bonus = getAttrByName(characterId, 'npc_religion_bonus');
		if(npc_religion_bonus) {
			setAttribute('religion_bonus', npc_religion_bonus);
		}
		var npc_sleightofhand_bonus = getAttrByName(characterId, 'npc_sleightofhand_bonus');
		if(npc_sleightofhand_bonus) {
			setAttribute('sleightofhand_bonus', npc_sleightofhand_bonus);
		}
		var npc_stealth_bonus = getAttrByName(characterId, 'npc_stealth_bonus');
		if(npc_stealth_bonus) {
			setAttribute('stealth_bonus', npc_stealth_bonus);
		}
		var npc_survival_bonus = getAttrByName(characterId, 'npc_survival_bonus');
		if(npc_survival_bonus) {
			setAttribute('survival_bonus', npc_survival_bonus);
		}
	};

}(typeof shaped === 'undefined' ? shaped = {} : shaped));

on("ready", function() {
	'use strict';
	shaped.statblock.RegisterHandlers();
});