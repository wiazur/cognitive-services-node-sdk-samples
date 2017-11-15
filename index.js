/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';

const util = require('util');
const os = require("os");
const async = require('async');
const Search = require('azure-cognitiveservices-search');
const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials;

if (!process.env['AZURE_SEARCH_KEY']) {
  throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
}

let serviceKey = process.env['AZURE_SEARCH_KEY'];


///////////////////////////////////////////
//     Entrypoint for sample script      //
///////////////////////////////////////////

let credentials = new CognitiveServicesCredentials(serviceKey);
let entitySearchApiClient = new Search.EntitySearchAPIClient(credentials);
let entityModels = entitySearchApiClient.models;

async.series([
  async function () {
    console.log("1. This will look up a single entity (tom cruise) and print out a short description about them.")
    let result;
    try {
      result = await entitySearchApiClient.entitiesOperations.search("tom cruise");
    } catch (err) {
      if (err instanceof entityModels.ErrorResponse) {
        console.log("Encountered exception. " + err.message);
      }
    }
    if (result.entities.value.length > 0) {
      // find the entity that represents the dominant one
      let mainEntity = result.entities.value.find(
        (thing) => thing.entityPresentationInfo.entityScenario == "DominantEntity"
      );
      if (mainEntity) {
        console.log("Searched for \"Tom Cruise\" and found a dominant entity with this description:");
        console.log(mainEntity.description);
      }
      else {
        console.log("Couldn't find main entity tom cruise!");
      }
    }
    else {
      console.log("Didn't see any data..");
    }
  },
  async function () {
    console.log(os.EOL);
    console.log("2. This will handle disambiguation results for an ambiguous query (harry potter).")
    let result;
    try {
      result = await entitySearchApiClient.entitiesOperations.search("harry potter");
    } catch (err) {
      if (err instanceof entityModels.ErrorResponse) {
        console.log("Encountered exception. " + err.message);
      }
    }
    if (result.entities.value.length > 0) {
      // find the entity that represents the dominant one
      let mainEntity = result.entities.value.find(
        (thing) => thing.entityPresentationInfo.entityScenario == "DominantEntity"
      );
      let disambigEntities = result.entities.value.filter(
        (thing) => thing.entityPresentationInfo.entityScenario == "DisambiguationItem"
      )

      if (mainEntity) {
        console.log(util.format("Searched for \"harry potter\" and found a dominant entity with type hint \"%s\" " +
          "with this description:", mainEntity.entityPresentationInfo.entityTypeHints));
        console.log(mainEntity.description);
      }
      else {
        console.log("Couldn't find a reliable dominant entity for harry potter!");
      }

      if (disambigEntities.length > 0) {
        console.log(os.EOL);
        console.log("This query is pretty ambiguous and can be referring to multiple things. " +
          "Did you mean one of these: ")
        let stringBuilder = disambigEntities[0].name + " the " +
          disambigEntities[0].entityPresentationInfo.entityTypeDisplayHint;
        for (let i = 1; i < disambigEntities.length; i++) {
          stringBuilder += ", or " + disambigEntities[i].name + " the " +
            disambigEntities[i].entityPresentationInfo.entityTypeDisplayHint;
        }
        console.log(stringBuilder + "?");
      }
      else {
        console.log("We didn't find any disambiguation items for harry potter, so we must be certain what you're talking about!");
      }
    }
    else {
      console.log("Didn't see any data..");
    }
  },
  async function () {
    console.log(os.EOL);
    console.log("3. This will look up a single restaurant (john howie bellevue) and print out its phone number.");
    let httpResponse;
    try {
      httpResponse = await entitySearchApiClient.entitiesOperations.searchWithHttpOperationResponse("john howie bellevue");
    } catch (err) {
      if (err instanceof entityModels.ErrorResponse) {
        console.log("Encountered exception. " + err.message);
      }
    }
    let result = JSON.parse(httpResponse.response.body);
    if (result.places.value.length > 0) {
      let restaurant = result.places.value[0];
      if (restaurant) {
        console.log("Searched for \"John Howie Bellevue\" and found a restaurant with this phone number:");
        console.log(restaurant.telephone);
      }
      else {
        console.log("Couldn't find a place!");
      }
    }
    else {
      console.log("Didn't see any data..");
    }
  },
  async function () {
    console.log(os.EOL);
    console.log("4. This will look up a list of restaurants (seattle restaurants) and present their names and phone numbers.");
    let httpResponse;
    try {
      httpResponse = await entitySearchApiClient.entitiesOperations.searchWithHttpOperationResponse("seattle restaurants");
    } catch (err) {
      if (err instanceof entityModels.ErrorResponse) {
        console.log("Encountered exception. " + err.message);
      }
    }
    let result = JSON.parse(httpResponse.response.body);
    if (result.places.value.length > 0) {
      // get all the list items that relate to this query
      let listItems = result.places.value.filter(
        (thing) => thing.entityPresentationInfo.entityScenario == "ListItem"
      )
      if (listItems.length > 0) {
        let stringBuilder = "";
        for (let i = 0; i < listItems.length; i++) {
          let place = listItems[i];
          stringBuilder += util.format(", %s (%s)", place.name, place.telephone);
        }
        console.log("Ok, we found these places: ");
        console.log(stringBuilder.slice(1));
      }
      else {
        console.log("Couldn't find any relevant results for \"seattle restaurants\"");
      }
    }
    else {
      console.log("Didn't see any data..");
    }
  },
  async function () {
    console.log(os.EOL);
    console.log("5. This triggers a bad request and shows how to read the error response.");
    let result;
    try {
      result = await entitySearchApiClient.entitiesOperations.search("tome cruise", { market: "no-ty" });
    } catch (err) {
      if (err instanceof entityModels.ErrorResponse) {
        // The status code of the error should be a good indication of what occurred.
        // However, if you'd like more details, you can dig into the response.
        // Please note that depending on the type of error, the response schema might be different,
        // so you aren't guaranteed a specific error response schema.
        console.log(util.format("Exception occurred, status code %s.", err.response.statusCode));

        // if you'd like more descriptive information (if available), look at the error body.
        if (err.body && err.body.errors.length > 0) {
          for (let i = 0; i > err.body.length; i++) {
            if (err.body.errors[i].subCode == "ParameterInvalidValue") {
              console.log(util.format("Turns out the issue is parameter \"%s\" has an invalid value \"%s\". " +
                "Detailed message is \"%s\"", err.body.errors[i].parameter, err.body.errors[i].value, err.body.errors[i].message))
            }
          }
        }
      }
    }
  }
])

