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

function getSuperUser(userId) {
  return db.get('superusers').find({ id: userId }).value();
}

function getHouse(houseId) {
  return db.get('houses').find({ id: houseId }).value();
}

function getOg(houseId, ogId) {
  return db.get('houses').find({ id: houseId }).get('ogs').find({ id: ogId }).value();
}

/**
 * Returns a .csv file of current points and reset all points
 *
 * @param {string} userId - id of the user doing reset
 */

module.exports.reset = function (userId) {
  return new Promise((resolve, reject) => {
    const user = getSuperUser(userId);

    if (user === undefined) {
      reject('You are not a superuser!');
      return;
    }

    fs.unlinkSync("data.csv", err => { })
    const json = db.getState().houses

    let fields = Object.keys(json[0])
    let replacer = function (key, value) { return value === null ? '' : value }
    let csv = json.map(function (row) {
      return fields.map(function (fieldName) {
        return JSON.stringify(row[fieldName], replacer)
      }).join(',')
    })
    csv.unshift(fields.join(',')) // add header column
    csv.join('\r\n')
    fs.writeFile("data.csv", csv, function (err) { });

    db.get('houses')
      .map(house => {
        house.score = 0;
        house.ogs.map(og => {
          og.score = 0;
        })
      })
      .write();

    resolve("data.csv");
  });
}

/**
 * Add score to a house.
 *
 * @param {string} houseId - ID of the house to add the score.
 * @param {integer} score - Score to be added.
 * @param {integer} userId - ID of the user invoking this request.
 * @returns {object} - Updated house object.
 */

module.exports.addHouseScore = function (houseId, score, userId) {

  return new Promise((resolve, reject) => {

    const user = getUser(userId);
    const house = getHouse(houseId);

    if (user === undefined) {
      reject('Error adding score: invalid user');
      return;
    }

    if (house === undefined) {
      reject('Error adding score: invalid house id');
      return;
    }

    if (!Number.isInteger(score)) {
      reject('Error adding score: score not an integer');
      return;
    }

    db.get('houses')
      .find({ id: houseId })
      .set('score', house.score + score)
      .write();

    resolve({ house });

  });

};

/**
 * Add score to a og.
 *
 * @param {string} houseId - ID of the house to add the score.
 * @param {string} ogId - ID of the og in the house to add the score.
 * @param {integer} score - Score to be added.
 * @param {integer} userId - ID of the user invoking this request.
 * @returns {object} - Updated house and og object.
 */

module.exports.addOgScore = function (houseId, ogId, score, userId) {

  return new Promise((resolve, reject) => {

    const user = getUser(userId);
    const house = getHouse(houseId);
    const og = getOg(houseId, ogId);

    if (user === undefined) {
      reject('Error adding score: invalid user');
      return;
    }

    if (house === undefined) {
      reject('Error adding score: invalid house id');
      return;
    }

    if (og === undefined) {
      reject('Error adding score: invalid og id');
      return;
    }

    if (!Number.isInteger(score)) {
      reject('Error adding score: score not an integer');
      return;
    }

    db.get('houses')
      .find({ id: houseId })
      .get('ogs')
      .find({ id: ogId })
      .set('score', og.score + score)
      .write();

    resolve({ house, og });

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
    if (Number.isNaN(targetId)) {
      reject('Error: invalid userId');
      return;
    }
    const user = getUser(userId);

    if (user === undefined) {
      reject('Error adding user: invalid user');
      return;
    }

    db.get('users')
      .push({ id: targetId })
      .write();

    resolve(`${targetId} has been added as an admin`);
  });

};

/**
 * Get the model for all houses.
 *
 * @returns {array} - Array of objects, each is a house.
 */

const getHousesModel = () => {
  return db.get('houses').value();
};

module.exports.addOg = function (houseId, ogId, ogName, userId) {
  return new Promise((resolve, reject) => {
    const user = getUser(userId);

    if (user === undefined) {
      reject('Error adding user: invalid user');
      return;
    }

    if (houseId === undefined || ogId === undefined || ogName === undefined) {
      reject('Wrong arguments!');
      return;
    }

    db.get('houses').find({ id: houseId }).get('ogs').push({
      "id": ogId,
      "name": ogName,
      "score": 0
    }).write();

    resolve(`${ogName} has been successfully added to ${houseId}!`);
  });
}

module.exports.addHouse = function (houseId, houseName, userId) {
  return new Promise((resolve, reject) => {

    const user = getUser(userId);

    if (user === undefined) {
      reject('Error adding user: invalid user');
      return;
    }

    if (houseId === undefined || houseName === undefined) {
      reject('Wrong arguments!');
      return;
    }

    db.get('houses').push({
      "id": houseId,
      "name": houseName,
      "score": 0,
      "ogs": []
    }).write();

    resolve(`${houseName} has been added!`);
  });
}

module.exports.removeOg = function (houseId, ogId, userId) {
  return new Promise((resolve, reject) => {

    const user = getUser(userId);

    if (user === undefined) {
      reject('You are not an admin!');
      return;
    }

    if (houseId === undefined || ogId === undefined) {
      reject('Wrong arguments!');
      return;
    }

    db.get('houses')
      .find({ id: houseId })
      .get('ogs')
      .remove({ id: ogId })
      .write();

    resolve('Removed successfully');
  });
}

module.exports.removeHouse = (houseId, userId) => {
  return new Promise((resolve, reject) => {

    const user = getUser(userId);

    if (user === undefined) {
      reject('You are not an admin!');
      return;
    }

    if (houseId === undefined) {
      reject('Wrong arguments!');
      return;
    }

    db.get('houses')
      .remove({ id: houseId })
      .write();

    resolve('Removed successfully');
  });
}

module.exports.ds = (userId) => {
  return new Promise((resolve, reject) => {

    const user = getUser(userId);

    if (user === undefined) {
      reject('You are not an admin!');
      return;
    }

    const housesModel = getHousesModel();
    const houseMessage = housesModel.map(house => {
      const totalScore = house.ogs.reduce((score, og) => score + og.score, house.score);
      return house.ogs.reduce((accumulator, og) => {
        return `${accumulator}\n${og.name} (${og.id}) - \`${og.score}\``;
      }, `*${house.name} (${house.id}) - ${totalScore} = ${totalScore - house.score} + ${house.score}*`);
    });

    const message = houseMessage.reduce((accumulator, mess) => `${accumulator}\n\n${mess}`);
    resolve(message);
  })
}
