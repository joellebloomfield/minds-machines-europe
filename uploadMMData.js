/*
 * Script to load MM collections to a given IMS instance. It will delete the collection first if it already exists.
 * Usage: node uploadMMData.js <uaa-uuid> <ims-client-id> <ims-client-secret> <ims-instance-uuid> <subtenant-id> <folder-with-data>
 */


'use strict';

const fs = require('fs');
const request = require('request');
let baseUrl;
let apiUrl = baseUrl+'/v1/collections/';
let uaaUuid;

const collNames = ['LV_Overhead_Asset', 'LV_Single_Phase_Overhead_Line', 'LV_Three_Phase_Overhead_Line', 'LV_Underground_Cable',
  'LV_Underground_Ground_Mounted_Asset', 'MV_Underground_Cable', 'MV_Underground_Ground_Mounted_Asset'];



function getToken(user, pass, callback) {
  const options = {
    url: `https://${uaaUuid}.predix-uaa.run.aws-usw02-pr.ice.predix.io/oauth/token`,
    method: 'POST',
    auth: {
      user: user,
      pass: pass
    },
    form: {
      'grant_type': 'client_credentials'
    },
    json: true
  };

  request(options, function (error, res) {
    if (error) {
      console.log('Problem with token request', error);
    } else {
      callback(res.body);
    }
  });
}

function addCollection(collectionName, contents, user, pass, zoneId, tenantId) {
  return new Promise((resolve, reject) => {
    getToken(user, pass, function (result) {
      var options = {
        method: 'POST',
        url: apiUrl + collectionName,
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Bearer ' + result.access_token,
          'Predix-Zone-Id': zoneId,
          'x-subtenant-id': tenantId
        },
        body: contents
      };

      request(options, function (error, res, body) {
        if (error) {
          console.log('Problem with request', error);
          reject(error);
        } else {
          console.log(`addCollection ${collectionName}`)
          console.log('STATUS:', res.statusCode);
          console.log('BODY:', body);
          resolve(body);
        }
      });
    });
  });
}

function deleteCollection(collectionName, user, pass, zoneId, tenantId) {
  return new Promise((resolve, reject) => {
    getToken(user, pass, function (result) {
      var options = {
        method: 'DELETE',
        url: apiUrl + collectionName,
        headers: {
          'Authorization': 'Bearer ' + result.access_token,
          'Predix-Zone-Id': zoneId,
          'x-subtenant-id': tenantId
        },
        json: true
      };

      request(options, function (error, res, body) {
        if (error) {
          console.log('Problem with request', error);
          reject(error);
        } else {
          console.log(`deleteCollection ${collectionName}`)
          console.log('STATUS:', res.statusCode);
          resolve(body);
        }
      });
    });
  });
}


function main() {
  baseUrl = 'https://intelligent-mapping-prod.run.aws-usw02-pr.ice.predix.io';
  uaaUuid = process.argv[2];
  const username = process.argv[3];
  const password = process.argv[4];
  const zoneId = process.argv[5];             //ims guid
  const tenantId = process.argv[6];
  const folder = process.argv[7];

  apiUrl = baseUrl+'/v1/collections/';
  console.log(`Loading files from ${folder}...`);

  for (let collName of collNames) {
    deleteCollection(collName, username, password, zoneId, tenantId).then(() => {
      addCollection(collName, fs.readFileSync(`${folder}/Clipped.${collName}.geojson`, 'utf-8'), username, password, zoneId, tenantId);
    })
  }
}

main();