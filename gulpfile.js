var gulp = require('gulp');
var inject = require('gulp-inject');
var uglify = require('gulp-uglify');
var fs = require('fs');
var rename = require('gulp-rename');
var jsoncombine = require('gulp-jsoncombine');

function search(nameKey, myArray){
	for (var i=0; i < myArray.length; i++) {
		if (myArray[i].name === nameKey) {
			return myArray[i];
		}
	}
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
	for(var i = 0, len = myArray.length; i < len; i++) {
		if (myArray[i][property] === searchTerm) {
			return i;
		}
	}
	return -1;
}

function sortArray (array) {
	return array.sort(function(a, b) {
		if(a.name < b.name) {
			return -1;
		} else if(a.name > b.name) {
			return 1;
		}
		return 0;
	});
}

gulp.task('compile', function() {
	return gulp.src('./scripts/5e-shaped-scripts.js')
		.pipe(uglify())
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileSpells', function() {
	gulp.src('./data/spells/spellData.json')
		.pipe(jsoncombine('5e-spells.js', function(sources) {
			var spells = [];
			Object.keys(sources).forEach(function(source) {
				spells = spells.concat(sources[source]);
			});

			sortArray(spells);

			return new Buffer('fifthSpells = { spells:' + JSON.stringify(spells) + '};');
		}))
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileHouseruledSpells', function() {
	gulp.src('./data/spells/*.json')
		.pipe(jsoncombine('5e-spells-houserules.js', function(sources) {
			var spells = [];
			Object.keys(sources).forEach(function(source) {
				if(source === 'spellData') {
					spells = spells.concat(sources[source]);
				} else {
					for (var key = 0; key < sources[source].length; key++) {
						var houseruleSpell = sources[source][key],
							spellToAdjust = search(houseruleSpell.name, spells);

						if(!spellToAdjust) {
							spells.push(houseruleSpell);
						} else {
							if(houseruleSpell.remove) {
								var indexOfSpell = arrayObjectIndexOf(spells, spellToAdjust.name, 'name');
								spells.splice(indexOfSpell, 1);
								console.log('removed', spellToAdjust.name, indexOfSpell);
								continue;
							}

							for (var property in houseruleSpell) {
								if (houseruleSpell.hasOwnProperty(property)) {
									if (property === 'newName') {
										spellToAdjust.name = houseruleSpell[property];
									} else if (property !== 'name' && property !== 'newName') {
										spellToAdjust[property] = houseruleSpell[property];
									}
								}
							}
						}
					}
				}

			});

			sortArray(spells);

			return new Buffer('fifthSpells = { spells:' + JSON.stringify(spells) + '};');
		}))
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileMonsters', function() {
	gulp.src('./data/monsters/*.json')
		.pipe(jsoncombine('5e-monsters.js', function(sources) {
			var monsters = [];
			Object.keys(sources).forEach(function(source) {
				monsters = monsters.concat(sources[source]);
			});

			sortArray(monsters);

			return new Buffer('fifthMonsters = { monsters:' + JSON.stringify(monsters) + '};');
		}))
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileAll', ['compile', 'compileSpells', 'compileHouseruledSpells', 'compileMonsters']);
