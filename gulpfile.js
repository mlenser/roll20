var gulp = require('gulp'),
	inject = require('gulp-inject'),
	uglify = require('gulp-uglify'),
	fs = require("fs");


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
		.pipe(inject(gulp.src(['./data/spellData.json']), {
			starttag: 'spellsData = [',
			endtag: '];',
			transform: function (filePath, file) {
				var fileData = file.contents.toString('utf8'),
					spellData = JSON.parse(fileData);

				fs.readFile('./data/spellDataHouseruleAlterations.json', 'utf-8', function(err, data) {
					var houseruleData = JSON.parse(data);

					for (var key = 0; key < houseruleData.length; key++) {
						var houseruleSpell = houseruleData[key],
							spellToAdjust = search(houseruleSpell.name, spellData);

						if(houseruleSpell.remove) {
							console.log('remove', spellToAdjust.name);
							var indexOfSpell = arrayObjectIndexOf(spellData, spellToAdjust.name, 'name');
							console.log('indexOfSpell', indexOfSpell);
							spellData.splice(indexOfSpell, 1);

							houseruleData.splice(key, 1);
							console.log('remove2');
							key--;
							continue;
						}

						for (var property in houseruleSpell) {
							if (houseruleSpell.hasOwnProperty(property)) {
								if (property === 'newName') {
									spellToAdjust.name = property.newName;
								} else if (property !== 'name' && property !== 'newName') {
									spellToAdjust[property] = houseruleSpell[property];
								}
							}
						}
					}
				});
				var returnedData = JSON.stringify(spellData);

				return returnedData.substring(1, returnedData.length-1);
			}
		}))
		.pipe(gulp.dest('./scripts/dist'));
});