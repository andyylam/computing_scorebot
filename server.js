// REQUIREMENTS
const dotenv = require('dotenv');
const express = require('express');
const Telegraf = require('telegraf');
const Model = require('./model');
const winston = require('winston');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'combined.log' })
	]
})

const PORT = process.env.PORT || 8000;

const app = express();
app.listen(PORT, () => {
	console.log(`Our app is running on port ${PORT}`);
});
// DOTENV SETUP

dotenv.config();

// BOT SETUP

const bot = new Telegraf(process.env.BOT_TOKEN);
const website = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendDocument`;

bot.telegram.getMe().then(botInfo => {
	bot.options.username = botInfo.username;
});

// START COMMAND

bot.start(ctx => {
	let message = '';
	message += 'This is a telegram bot created to keep track of scores for Computing FOP! ';
	message += 'Only admins can make view and change scores.\n';
	message += '\n';
	message += '*Commands:* \n';
	message += 'Add a new house. \n';
	message += '/addhouse (houseId) (houseName). \n'
	message += '\n';
	message += 'Add a new og. \n';
	message += '/addog (houseId) (ogId) (ogName). \n'
	message += '\n';
	message += 'Add (score) to (houseId).\n';
	message += '/addhousescore (houseId) (score)\n';
	message += '\n';
	message += 'Add (score) to (ogId) from (houseId).\n';
	message += '/addogscore (houseId) (ogId) (score)\n';
	message += '\n';
	message += 'Add an admin (you must be an admin) (userId).\n';
	message += '/addadmin (userId)\n';
	message += '\n';
	message += 'Display score.\n';
	message += '/displayscore\n';
	message += '\n';
	message += 'Get user ID.\n';
	message += '/who\n';
	message += '\n';
	message += 'Remove an og.\n';
	message += '/removeog (houseId) (ogId)\n';
	message += '\n';
	message += 'Remove a house.\n';
	message += '/removeog (houseId)\n';
	message += '\n';
	message += 'Obtain a .csv file of current points and reset all points to zero\n'
	message += '/reset';
	return ctx.reply(message);
});

// HELP COMMAND

bot.help(ctx => {
	let message = '';
	message += 'This is a telegram bot created to keep track of scores for Computing FOP! ';
	message += 'Only admins can make changes to scores - others can only view scores.\n';
	message += '\n';
	message += '*Commands:* \n';
	message += 'Add a new house. \n';
	message += '/addhouse (houseId) (houseName). \n'
	message += '\n';
	message += 'Add a new og. \n';
	message += '/addog (houseId) (ogId) (ogName). \n'
	message += '\n';
	message += 'Add (score) to (houseId).\n';
	message += '/addhousescore (houseId) (score)\n';
	message += '\n';
	message += 'Add (score) to (ogId) from (houseId).\n';
	message += '/addogscore (houseId) (ogId) (score)\n';
	message += '\n';
	message += 'Add an admin (you must be an admin) (userId).\n';
	message += '/addadmin (userId)\n';
	message += '\n';
	message += 'Display score.\n';
	message += '/displayscore\n';
	message += '\n';
	message += 'Get user ID.\n';
	message += '/who\n';
	message += '\n';
	message += 'Remove an og.\n';
	message += '/removeog (houseId) (ogId)\n';
	message += '\n';
	message += 'Remove a house.\n';
	message += '/removeog (houseId)\n';
	message += '\n';
	message += 'Obtain a .csv file of current points and reset all points to zero\n'
	message += '/reset';
	return ctx.telegram.sendMessage(ctx.chat.id, message, {
		parse_mode: 'Markdown',
		reply_to_message_id: ctx.message.message_id
	});
});

// addhousescore COMMAND

bot.command(['addhousescore'], ctx => {
	const args = ctx.message.text.split(' ');
	const houseId = args[1];
	const score = Number(args[2]);
	const userId = ctx.from.id;

	Model.addHouseScore(houseId, score, userId)
		.then(res => {
			const newScore = res.house.ogs.reduce((accumulator, og) => accumulator + og.score, res.house.score);
			const message = `*${res.house.name}* has *${newScore}* points.`;
			return ctx.telegram.sendMessage(ctx.chat.id, message, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
		})
		.catch(err => ctx.reply(err))
});

// ADDOGSCORE COMMAND

bot.command(['addogscore', 's'], ctx => {
	const args = ctx.message.text.split(' ');
	const houseId = args[1];
	const ogId = args[2];
	const score = Number(args[3]);
	const userId = ctx.from.id;

	Model.addOgScore(houseId, ogId, score, userId).then(res => {
		const message = `*${res.og.name}* from *${res.house.name}* has *${res.og.score} points*`;
		return ctx.telegram.sendMessage(ctx.chat.id, message, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
	}).catch(err => ctx.reply(err));
})
// ADDUSER COMMAND

bot.command(['addadmin', 'u'], ctx => {
	const args = ctx.message.text.split(' ');
	const targetId = Number(args[1]);
	const userId = ctx.from.id;

	Model.addUser(targetId, userId)
		.then(res => ctx.reply(res))
		.catch(err => {
			logger.log({
				level: 'info',
				message: 'Command: ADDADMIN' + err
			});
			return ctx.reply(err)
		});
});

// DISPLAYSCORE COMMAND


bot.command(['displayscore', 'ds'], ctx => {
	const userId = ctx.from.id;

	Model.ds(userId)
		.then(res => ctx.replyWithMarkdown(res))
		.catch(err => {
			logger.log({
				level: 'Command: DISPLAYSCORE' + 'info',
				message: err
			});
			return ctx.reply(err);
		})
});

// WHO COMMAND

bot.command('who', ctx => {
	return ctx.replyWithMarkdown(`${ctx.from.first_name} your ID is \`${ctx.from.id}\``);
});

bot.command('reset', async ctx => {
	const userId = ctx.from.id;
	const message = await Model.ds(userId);

	Model.reset(userId).then(res => {
		ctx.replyWithMarkdown(message);
		return ctx.replyWithDocument({ source: res });
	}).catch(err => {
		logger.log({
			level: 'info',
			message: 'Command: WHO' + err
		});
		return ctx.reply(err);
	});
});

bot.command('addhouse', ctx => {
	const args = ctx.message.text.split(' ');
	const houseId = args[1];
	const houseName = args[2];
	const userId = ctx.from.id;

	Model.addHouse(houseId, houseName, userId)
		.then(res => ctx.reply(res))
		.catch(err => {
			logger.log({
				level: 'info',
				message: 'Command: ADDHOUSE' + err
			});
			return ctx.reply(err);
		});
})

bot.command('addog', ctx => {
	const args = ctx.message.text.split(' ');
	const houseId = args[1];
	const ogId = args[2];
	const ogName = args[3];
	const userId = ctx.from.id;

	Model.addOg(houseId, ogId, ogName, userId)
		.then(res => ctx.reply(res))
		.catch(err => {
			logger.log({
				level: 'info',
				message:  'Command: ADDOG' +  err
			});
			return ctx.reply(err);
		});
})

bot.command('removeog', ctx => {
	const args = ctx.message.text.split(' ');
	const houseId = args[1];
	const ogId = args[2];
	const userId = ctx.from.id;

	Model.removeOg(houseId, ogId, userId)
		.then(res => ctx.reply(res))
		.catch(err => {
			logger.log({
				level: 'info',
				message: 'Command: REMOVEOG' +  err
			});
			return ctx.reply(err);
		});
})
// BOT POLL

bot.command('removehouse', ctx => {
	const args = ctx.message.text.split(' ');
	const houseId = args[1];
	const userId = ctx.from.id;

	Model.removeHouse(houseId, userId)
		.then(res => ctx.reply(res))
		.catch(err => {
			logger.log({
				level: 'info',
				message:  'Command: REMOVEHOUSE' +  err
			});
			return ctx.reply(err);
		});
})

process.on('uncaughtException', err => {
	logger.log({
		level: 'error', 
		message: err
	})
})

process.on('unhandledRejection', (reason, promise) => {
  logger.log({
	  level: 'error',
	  message: 'Unhandled Rejection at:' + reason.stack || reason
  })
})

bot.startPolling();
