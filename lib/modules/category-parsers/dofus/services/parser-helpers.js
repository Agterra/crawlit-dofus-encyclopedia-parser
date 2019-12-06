const request = require('request-promise-native');
import cheerio from 'cheerio';
import { getId, getElement, getDate, sanatizer } from './format-helpers';

const requestStatsOpts = {
	url: '',
	method: 'POST',
	headers: {
		'cache-control': 'no-cache',
		'content-type': 'application/x-www-form-urlencoded  charset=UTF-8',
		'x-pjax-container': '.ak-item-details-container',
		'x-pjax': 'true',
		'x-requested-with': 'XMLHttpRequest'
	},
	body: '',
	transform: function (body) {
		return cheerio.load(body);
	}
};

module.exports = {
	effectParse: (body) => {
		const $ = cheerio.load(body);
		return getCaracs($);
	},

	recipeParse: (body) => {
		const $ = cheerio.load(body);
		return getReceipe($);
	},

	descriptionParse: (body, url) => {
		const $ = cheerio.load(body);
		const itemId = Number(getId(url));
		const type = getType($);
		const description = getDescription($);
		const level = getLevel($);
		const name = getName($);
		const imgUrl = getImageURL($);

		const item = {
			_id: itemId,
			ankamaId: itemId,
			description: description,
			imgUrl: imgUrl,
			level: level,
			name: name,
			type: type,
			url: url
		};

		return item;
	},

	monsterParse: (body, url) => {
		const $ = cheerio.load(body);
		const type = getType($);
		const itemId = Number(getId(url));
		const name = getName($);
		const imgUrl = getImageURL($);

		const monstre = {
			_id: itemId,
			ankamaId: itemId,
			name: name,
			type: type,
			imgUrl: imgUrl,
			url: url
		};

		return monstre;
	},

	// Because of AJAX call with forms for pet's statistics
	statsRequest: async (url, params = null) => {
		requestStatsOpts.url = url;
		if (params) requestStatsOpts.body = params;
		const $ = await request(requestStatsOpts);

		/// //// Local initialization ///////
		const body = $.html();
		return body;
	},

	getCategoryType: (type) => {
		switch (true) {
		case equipmentRegex.test(type):
			return 'equipments';

		case weaponRegex.test(type):
			return 'weapons';

		default:
			console.log('\x1b[31m%s\x1b[0m', 'Sorry, we are out of ' + type + '.');
			return null;
		}
	}
};

const equipmentRegex = () => {
	const regex = []
		.push('(chapeau|hat)')
		.push('(cloak|cape)')
		.push('(amulet|amulette)')
		.push('(boots|bottes)')
		.push('(ring|anneau)')
		.push('(belt|ceinture)')
		.push('(backpack|sac a dos)')
		.push('(shield|bouclier)')
		.push('(trophy|trophee)')
		.push('(pet|familier)')
		.push('dofus')
		.push('(objet d\'apparat|ceremonial item)')
		.join('|');

	return RegExp(regex);
};

const weaponRegex = () => {
	const regex = []
		.push('(sword|epee)')
		.push('(dagger|dague)')
		.push('(axe|hache)')
		.push('(bow|arc)')
		.push('(hammer|marteau)')
		.push('(pickaxe|pioche)')
		.push('(scythe|faux)')
		.push('(shovel|pelle)')
		.push('(soul stone|pierre d\'ame)')
		.push('(staff|baton)')
		.push('(tool|outil)')
		.push('(wand|baguette)')
		.join('|');

	return RegExp(regex);
};

export const caracCleaner = (carac) => {
	return carac.replace(/\\n|%|\+/, '')
		.replace(/ à | a | to | bis /, ' ')
		.split(' ')
		.filter(elem => elem !== '');
};

export const getType = ($) => {
	return $('.ak-encyclo-detail-type').find('span').text();
};

export const getLevel = ($) => {
	return parseInt($('.ak-encyclo-detail-level').text().split(':')[1].replace(' ', ''));
};

export const getName = ($) => {
	return $('.ak-return-link').text().split('\n')[4];
};

export const getImageURL = ($) => {
	return $('div.ak-encyclo-detail-illu').find('img').attr('src').replace('dofus/ng/img/../../../', '');
};

export const getDescription = ($) => {
	return $('.ak-encyclo-detail-right').find('.ak-panel-content').text().split('\n')[1];
};

export const getCaracs = ($) => {
	const caracsToFilter = $('.ak-content').find('.ak-title');
	return Object.keys(caracsToFilter).map(key => {
		if (caracsToFilter[key].children)
			return caracsToFilter[key].children[0];
	})
		.filter(carac => carac !== undefined)
		.filter(carac => carac.data !== '\n')
		.map(carac => caracCleaner(carac.data))
		.map(carac => {
			if (carac.length > 5 || carac.includes('<'))
				return [carac.join(' ')];
			const size = carac.length;
			let base = carac.slice(0, 2);
			let toConcat = carac.slice(2, size).join(' ');
			if (isNaN(parseInt(carac[1]))) {
				base = carac.slice(0, 1);
				toConcat = carac.slice(1, size).join(' ');
				const val = base.concat(toConcat).filter(elem => elem !== '');
				if (val.length > 0)
					return val;
			} else {
				const val = base.concat(toConcat).filter(elem => elem !== '');
				if (val.length > 0)
					return val;
			}
		})
		.filter(carac => carac !== undefined)
		.map(carac => {
			if (isNaN(parseInt(carac[0]))) {
				return carac = {
					min: null,
					max: null,
					name: carac[0]
				};
			} else if (isNaN(parseInt(carac[1]))) {
				return carac = {
					min: parseInt(carac[0]),
					max: null,
					name: carac[1]
				};
			} else {
				return carac = {
					min: parseInt(carac[0]),
					max: parseInt(carac[1]),
					name: carac[2]
				};
			}
		});
};

export const getReceipe = ($) => {
	const ingredientsBody = $('.ak-container').find('.ak-list-element');
	const quantities = ingredientsBody.find('.ak-front').text().split('x')
		.map(elem => parseInt(elem))
		.filter(elem => !isNaN(elem));
	const imagesToFilter = ingredientsBody.find('.ak-linker').find('img');
	const images = Object.keys(imagesToFilter).map(key => {
		if (imagesToFilter[key].attribs)
			return imagesToFilter[key];
	})
		.filter(value => value !== undefined)
		.map(image => {
			return image.attribs.src;
		});

	// console.log(images)
	const nameToFilter = ingredientsBody.find('.ak-linker');
	const names = retrieveDataFromObjet(nameToFilter);
	const levelsToFilter = ingredientsBody.find('.ak-aside');
	const levels = retrieveDataFromObjet(levelsToFilter).map(level => parseInt(level.split(' ')[1]));

	// Quantity contains the number of ingredients, otherwise it's the other set items
	let i = 0;
	return quantities.map(quantity => {
		const ingredient = {
			quantity: quantity,
			name: names[i],
			level: levels[i],
			image: images[i]
		};
		i += 1;
		return ingredient;
	});
};

export const getItemSet = ($) => {
	const itemSetBody = $('.ak-panel-title').find('a');
	const itemSetName = itemSetBody.text();
	if (itemSetName !== '' && itemSetBody !== undefined)
		return itemSetBody[0].attribs.href;

	return null;
};

export const retrieveDataFromObjet = (object) => {
	return Object.keys(object).map(key => {
		if (object[key].children)
			return object[key].children[0];
	})
		.filter(value => value !== undefined)
		.filter(value => value.data !== '\n' && value.data !== undefined)
		.map(value => value.data);
};