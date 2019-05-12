// REQUIREMENTS
const dotenv = require('dotenv');
const express = require('express');
const Telegraf = require('telegraf');
const Model = require('./model');
const http = require('http');

const PORT = process.env.PORT || 3000;

const app = express();
app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
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
  message += 'Hello! I can help you keep track of scores. You can control me by sending me these commands.\n';
  message += '\n';
  message += '/addhousescore - add house score\n';
  message += '/addogscore - add og score\n';
  message += '/adduser - add user\n';
  message += '/help - show detailed help\n';
  message += '/displayscore - display score\n';
  message += '/who - get user ID\n';
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
  message += 'Obtain a .csv file of current points and reset all points to zero\n'
  message += '/reset';
  return ctx.telegram.sendMessage(ctx.chat.id, message, {parse_mode: 'Markdown',
    reply_to_message_id: ctx.message.message_id});
});

// addhousescore COMMAND

bot.command(['addhousescore', 't'], async ctx => {
  const args = ctx.message.text.split(' ');
  const houseId = args[1];
  const score = Number(args[2]);
  const userId = ctx.from.id;
 
  try {
    const res = await Model.addHouseScore(houseId, score, userId);
    const newScore = res.house.ogs.reduce((accumulator, og) => accumulator + og.score, res.house.score);
    const message = `*${res.house.name}* has *${newScore}* points.`;
    return ctx.telegram.sendMessage(ctx.chat.id, message, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
  } catch (err) {
    return ctx.reply(err);
  }
});

// ADDOGSCORE COMMAND

bot.command(['addogscore', 's'], async ctx => {
  const args = ctx.message.text.split(' ');
  const houseId = args[1];
  const ogId = args[2];
  const score = Number(args[3]);
  const userId = ctx.from.id;
  
  try {
    const res = await Model.addOgScore(houseId, ogId, score, userId);
    const message = `*${res.og.name}* from *${res.house.name}* has *${res.og.score} points*`;
    return ctx.telegram.sendMessage(ctx.chat.id, message, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
  } catch (err) {
    return ctx.reply(err);
  }
});

// ADDUSER COMMAND

bot.command(['addadmin', 'u'], async ctx => {
  const args = ctx.message.text.split(' ');
  const targetId = Number(args[1]);
  const userId = ctx.from.id;
  
  try {
    const newScore = await Model.addUser(targetId, userId);
    const message = `User ${targetId} has been added`;
    return ctx.reply(message);
  } catch (err) {
    return ctx.reply(err);
  }
});

// DISPLAYSCORE COMMAND

async function ds() {
  const housesModel = await Model.getHousesModel();
  const houseMessage = housesModel.map(house => {
    const totalScore = house.ogs.reduce((score, og) => score + og.score, house.score);
    return house.ogs.reduce((accumulator, og) => {
      return `${accumulator}\n${og.name} (${og.id}) - \`${og.score}\``;
    }, `*${house.name} (${house.id}) - ${totalScore} = ${totalScore - house.score} + ${house.score}*`);
  });
  
  const message = houseMessage.reduce((accumulator, mess) => `${accumulator}\n\n${mess}`);
  return message;
}

bot.command(['displayscore', 'ds'], async ctx => {
  const message = await ds();
  return ctx.replyWithMarkdown(message);
});

// WHO COMMAND

bot.command('who', async ctx => {
  return ctx.replyWithMarkdown(`${ctx.from.first_name} your ID is \`${ctx.from.id}\``);
});

bot.command('reset', async ctx => {
  const message = await ds();
  ctx.replyWithMarkdown(message);
  const userId = ctx.from.id;
  const document = await Model.reset(userId);
  try {
    return ctx.replyWithDocument({source: document});
  } catch (err) {
    console.log(err);
  }
})

bot.command('addhouse', async ctx => {
  const args = ctx.message.text.split(' ');
  const houseId = args[1];
  const houseName = args[2];
  const userId = ctx.from.id;

  try {
    const res = await Model.addhouse(houseId, houseName, userId);
    const message = `${houseName} has been added. Please add OGs!`;
    return ctx.reply(message);
  } catch (err) {
    return ctx.reply('Unknown error');
  }
})

bot.command('addog', async ctx => {
  const args = ctx.message.text.split(' ');
  const houseId = args[1];
  const ogId = args[2];
  const ogName = args[3];
  const userId = ctx.from.id;

  try {
    const res = await Model.addOg(houseId, ogId, ogName, userId);
    const message = `${ogName} has been added.`;
    return ctx.reply(message);
  } catch (err) {
    return ctx.reply(err);
  }
})
// BOT POLL

bot.startPolling()
