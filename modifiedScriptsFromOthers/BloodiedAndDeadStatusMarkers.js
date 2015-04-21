on("change:graphic", function(obj) {
	if(obj.get("bar3_max") === "") return;

	if(obj.get("bar3_value") <= obj.get("bar3_max") / 2) {
		obj.set({
			status_redmarker: true
		});
	}
	else{
		obj.set({
			status_redmarker: false
		})
	}

	if(obj.get("bar3_value") <= 0) {
		obj.set({
			status_dead: true
		});
	}
	else {
		obj.set({
			status_dead: false
		});
	}
});