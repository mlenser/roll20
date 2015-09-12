var gulp = require('gulp'),
	inject = require('gulp-inject'),
	uglify = require('gulp-uglify'),
	fs = require("fs"),
	rename = require("gulp-rename");

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

gulp.task('compile', function() {
	return gulp.src('./scripts/5e-shaped-scripts.js')
		.pipe(uglify())
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileSpells', function() {
	return gulp.src('./scripts/5e-spells.js')
		.pipe(inject(gulp.src(['./data/spellData.json']), {
			starttag: '[',
			endtag: ']',
			transform: function (filePath, file) {
				var fileData = file.contents.toString('utf8'),
					spellData = JSON.parse(fileData);

				var returnedData = JSON.stringify(spellData);

				return returnedData.substring(1, returnedData.length-1);
			}
		}))
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileHouseruledSpells', function() {
	return gulp.src('./scripts/5e-spells.js')
		.pipe(inject(gulp.src(['./data/spellData.json']), {
			starttag: '[',
			endtag: ']',
			transform: function (filePath, file) {
				var fileData = file.contents.toString('utf8'),
					spellData = JSON.parse(fileData);

				var houseruleData = JSON.parse(fs.readFileSync('./data/spellDataHouseruleAlterations.json', 'utf-8'));

				for (var key = 0; key < houseruleData.length; key++) {
					var houseruleSpell = houseruleData[key],
						spellToAdjust = search(houseruleSpell.name, spellData);

					if(!spellToAdjust) {
						spellData.push(houseruleSpell);
					} else {
						if(houseruleSpell.remove) {
							var indexOfSpell = arrayObjectIndexOf(spellData, spellToAdjust.name, 'name');
							spellData.splice(indexOfSpell, 1);
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

				var returnedData = JSON.stringify(spellData);

				return returnedData.substring(1, returnedData.length-1);
			}
		}))
		.pipe(rename('5e-spells-houserules.js'))
		.pipe(gulp.dest('./scripts/dist'));
});

gulp.task('compileAll', ['compile', 'compileSpells', 'compileHouseruledSpells']);
