var gulp = require('gulp'),
	inject = require('gulp-inject'),
	uglify = require('gulp-uglify');


gulp.task('compile', function() {
	return gulp.src('./scripts/5e-shaped-scripts.js')
		.pipe(inject(gulp.src(['./data/spellData.json']), {
			starttag: 'spellsData = [',
			endtag: '];',
			transform: function (filePath, file) {
				var data = file.contents.toString('utf8');
				return data.substring(1, data.length-1);;
			}
		}))
		.pipe(uglify())
		.pipe(gulp.dest('./scripts/dist'));
});