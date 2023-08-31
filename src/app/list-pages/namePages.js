const path = require('path');

module.exports = {
	names: (page) => {
		let name;
		switch (path.basename(page, '.pug')) {
			case 'index':
				name = 'Главная';
				break;
			default:
				name = 'name page';
				break;
		}
		return name;
	},
};
