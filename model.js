// REQUIREMENTS

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');

const adapter = new FileSync('db.json');
const db = low(adapter);

// HELPER GETTERS

function getUser(userId) {
  return db.get('users').find({ id: userId }).value();
}

function getTeam(teamId) {
  return db.get('teams').find({ id: teamId }).value();
}

function getSolo(teamId, soloId) {
  return db.get('teams').find({ id: teamId }).get('solos').find({ id: soloId }).value();
}

// function to log jsonToCSV

module.exports.reset = function (userId) {
  return new Promise((resolve, reject) => {
    const json = db.getState().teams

    let fields = Object.keys(json[0])
    let replacer = function (key, value) { return value === null ? '' : value }
    let csv = json.map(function (row) {
      return fields.map(function (fieldName) {
        return JSON.stringify(row[fieldName], replacer)
      }).join(',')
    })
    csv.unshift(fields.join(',')) // add header column
    csv.join('\r\n')
    fs.writeFile("data.csv", csv, function(err) {});

    db.get('teams')
      .map(team => {
        team.score = 0;
        team.solos.map(solo => {
          solo.score = 0;
        })
      })
      .write();

    return "data.csv";
  });
}

/**
 * Add score to a team.
 *
 * @param {string} teamId - ID of the team to add the score.
 * @param {integer} score - Score to be added.
 * @param {integer} userId - ID of the user invoking this request.
 * @returns {object} - Updated team object.
 */

module.exports.addTeamScore = function (teamId, score, userId) {

  return new Promise((resolve, reject) => {

    const user = getUser(userId);
    const team = getTeam(teamId);

    if (user === undefined) {
      reject('Error adding score: invalid user');
      return;
    }

    if (team === undefined) {
      reject('Error adding score: invalid team id');
      return;
    }

    if (!Number.isInteger(score)) {
      reject('Error adding score: score not an integer');
      return;
    }

    db.get('teams')
      .find({ id: teamId })
      .set('score', team.score + score)
      .write();

    resolve({ team });

  });

};

/**
 * Add score to a solo.
 *
 * @param {string} teamId - ID of the team to add the score.
 * @param {string} soloId - ID of the solo in the team to add the score.
 * @param {integer} score - Score to be added.
 * @param {integer} userId - ID of the user invoking this request.
 * @returns {object} - Updated team and solo object.
 */

module.exports.addSoloScore = function (teamId, soloId, score, userId) {

  return new Promise((resolve, reject) => {

    const user = getUser(userId);
    const team = getTeam(teamId);
    const solo = getSolo(teamId, soloId);

    if (user === undefined) {
      reject('Error adding score: invalid user');
      return;
    }

    if (team === undefined) {
      reject('Error adding score: invalid team id');
      return;
    }

    if (solo === undefined) {
      reject('Error adding score: invalid solo id');
      return;
    }

    if (!Number.isInteger(score)) {
      reject('Error adding score: score not an integer');
      return;
    }

    db.get('teams')
      .find({ id: teamId })
      .get('solos')
      .find({ id: soloId })
      .set('score', solo.score + score)
      .write();

    resolve({ team, solo });

  });

};

/**
 * Add new user.
 *
 * @param {string} targetId - ID of  new user.
 * @param {integer} userId - ID of the user invoking this request.
 */

module.exports.addUser = function (targetId, userId) {

  return new Promise((resolve, reject) => {

    const user = getUser(userId);

    if (user === undefined) {
      reject('Error adding user: invalid user');
      return;
    }

    db.get('users')
      .push({ id: targetId })
      .write();

    resolve();

  });

};

/**
 * Get the model for all teams.
 *
 * @returns {array} - Array of objects, each is a team.
 */

module.exports.getTeamsModel = function () {
  return new Promise((resolve, reject) => {
    resolve(db.get('teams').value());
  });
};
