var Alexa = require('alexa-sdk');
var recipes = require("kraft-recipe-api");
var moment = require('moment-interval');
var ddb = require('dynamodb').ddb({
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETKEYID,
    endpoint: 'dynamodb.eu-west-1.amazonaws.com'
  }
);
var states = {
  SEARCHMODE: '_SEARCHMODE',
  NEWMODE: '_NEWMODE'
};

var alexa;
var APP_ID = process.env.APPID;
var skillName = "Welcome to Recipe Book:";
var welcomeMessage = "Today you've chosen to cook ";
var welcomeTime = ". This dish should take approximately ";
var HelpMessage = "You can ask for the next step, current step or previous step.";
var shutdownMessage = "Ok see you again soon, enjoy your meal.";
var killSkillMessage = "Ok, great, see you next time.";
var endOfRecipe = "Well done, you've finished cooking. Do you want to go back over previous steps?";
var endHelpMessage = "You can ask for the current step, previous step, or go to a step of your choice.";
var timerStartMessage = "The timer has started";
var WelcomeBackMessage = "Welcome Back.";
var noRecipeMessage = "You have not picked a recipe for today. Please choose one in the Recipe Book App.";
var chooseNewStep = "That step doesn't exist, please choose another!";
var reprompt = "Sorry, I didn't understand that. How can I help you?";
var output = "";

var newSessionHandlers = {
  'NewSession': function () {
    this.emit('LaunchRequest');
  },
  'LaunchRequest': function () {
    var handler = this;
    var userId = this.event.session.user.userId;
    ddb.getItem('Recipe_Book_Recipes', userId, null, {}, function (err, response) {
      var today = new Date();
      if (!response || !response[today.toDateString()]) {
        alexa.emit(':tell', noRecipeMessage);
      } else {
        var recipeID = response[today.toDateString()];
        getRecipes(recipeID, handler);
      }
    });
  },
};



var renewSessionHandlers = Alexa.CreateStateHandler(states.NEWMODE, {
  'LaunchRequest': function () {
    var handler = this;
    var userId = this.event.session.user.userId;
    ddb.getItem('Recipe_Book_Recipes', userId, null, {}, function (err, response) {
      var today = new Date();
      if (!response || !response[today.toDateString()]) {
        alexa.emit(':tell', noRecipeMessage);
      } else {
        var recipeID = response[today.toDateString()];
        getRecipes(recipeID, handler);
      }
    });
  }
});

var startSearchHandlers = Alexa.CreateStateHandler(states.SEARCHMODE, {
  'AMAZON.YesIntent': function () {
    alexa.emit(':ask', endHelpMessage, reprompt);
  },

  'AMAZON.NoIntent': function () {
    this.handler.state = states.NEWMODE;
    this.attributes.recipe = {};
    this.attributes.step = 0;
    this.attributes.timers = {};
    this.emit(':tell', shutdownMessage);
  },

  'AMAZON.RepeatIntent': function () {
    this.emit(':ask', output, HelpMessage);
  },

  'nextStepIntent': function () {
    if (checkRecipeEnd(this.attributes)) {
      this.attributes.step += 1;
      emitRecipeStep(this.attributes.step, this.attributes.recipe)
    } else {
      this.emit(':ask', endOfRecipe, reprompt);
    }
  },

  'getIngredientsIntent': function () {
    output = this.attributes.ingredients.join(", ");
    this.emit(':ask', output, reprompt);
  },

  'getSpecificIngredientIntent': function () {
    var ingredient = this.event.request.intent.slots.ingredient.value;
    var specificIngredient = ingredient.replace(/s$/, "");
    output = "You need " + this.attributes.ingredients.find(function (element) {
        return element.toLowerCase().includes(specificIngredient.toLowerCase())
      }) + " for this recipe";
    if (output == undefined) {
      output = "Sorry I can't find that ingredient in the recipe"
    }
    this.emit(':ask', output, reprompt);
  },

  'currentStepIntent': function () {
    emitRecipeStep(this.attributes.step, this.attributes.recipe)
  },

  'previousStepIntent': function () {
    this.attributes.step -= 1;
    emitRecipeStep(this.attributes.step, this.attributes.recipe)
  },

  'goToStepIntent': function () {
    var step = this.event.request.intent.slots.number.value - 1;
    if (step >= this.attributes.recipe["recipe"].length) {
      this.emit(':ask', chooseNewStep, reprompt)
    } else {
      this.attributes.step = step;
      output = this.attributes.recipe["recipe"][this.attributes.step];
      this.emit(':ask', output, reprompt);
    }
  },

  'startTimerIntent': function () {
    var duration = this.event.request.intent.slots.length.value;
    var timerName = this.event.request.intent.slots.description.value;
    var endDate = moment().interval('/' + duration);
    this.attributes.timers[timerName] = endDate.end()._d.toString();
    this.emit(':ask', timerStartMessage, reprompt);
  },

  'timeLeftIntent': function () {
    var timerName = this.event.request.intent.slots.description.value;
    if (!this.attributes.timers[timerName]) {
      output = "Sorry I couldn't find that timer.";
    } else {
      var timeLeft = getTimeLeft(this.attributes.timers[timerName]);
      output = makeTimeString(timeLeft) + timerName;
    }
    this.emit(':ask', output, reprompt);
  },

  'AMAZON.HelpIntent': function () {
    output = HelpMessage;
    this.emit(':ask', output, reprompt);
  },

  'AMAZON.StopIntent': function () {
    this.emit(':tell', killSkillMessage);
  },

  'AMAZON.CancelIntent': function () {
    this.emit(':tell', killSkillMessage);
  },

  'SessionEndedRequest': function () {
    this.emit('AMAZON.StopIntent');
  },

  'Unhandled': function () {
    this.emit(':ask', WelcomeBackMessage, HelpMessage);
  }
});

exports.handler = function (event, context) {
  alexa = Alexa.handler(event, context);
  alexa.AppId = APP_ID;
  alexa.dynamoDBTableName = "Recipe_Book_Sessions";
  alexa.registerHandlers(newSessionHandlers, startSearchHandlers, renewSessionHandlers);
  alexa.execute();
};
// ======== HELPER FUNCTIONS ==============

function parseRecipe(recipeJSON) {
  var details = recipeJSON["PreparationDetails"];
  var mappedArray = details.map(function (element) {
    return element.Description
  });
  var joinedRecipe = mappedArray.join();
  var splitRecipe = joinedRecipe.match(/[A-Z].+?[\.\ \, \n]+?(?=[A-Z][a-z]|$)/g);
  var mappedArrayWithSteps = splitRecipe.map(function (element, index) {
    return "Step" + " " + (index + 1) + ", " + element.trim()
  });
  return {recipe: mappedArrayWithSteps};
}

function getTimeLeft(endDateString) {
  var end = Date.parse(endDateString);
  var now = new Date;
  var hourDiff = end - now;
  var secDiff = hourDiff / 1000;
  var minDiff = hourDiff / 60 / 1000;
  var hDiff = hourDiff / 3600 / 1000;

  var humanReadable = {};
  humanReadable.hours = Math.floor(hDiff);
  humanReadable.minutes = Math.floor(minDiff - 60 * humanReadable.hours);
  humanReadable.seconds = Math.round(secDiff - 60 * humanReadable.minutes);
  return humanReadable;
}

function makeTimeString(timeObject) {
  if (timeObject.hours + timeObject.minutes + timeObject.seconds <= 0) {
    return "The timer has expired for the ";
  }
  var output = "There is ";
  if (timeObject.hours > 0) {
    output += timeObject.hours + " hours, "
  }
  if (timeObject.minutes > 0) {
    output += timeObject.minutes + " minutes, and "
  }
  if (timeObject.seconds > 0) {
    output += timeObject.seconds + " seconds "
  }
  return output + "left on the timer for the ";
}


function setAttributes(result, handler) {
  handler.attributes.recipe = parseRecipe(result);
  handler.attributes.ingredients = parseIngredients(result);
  handler.attributes.step = 0;
  handler.attributes.timeEnd = "null";
  handler.attributes.timers = {};
  handler.handler.state = states.SEARCHMODE;
};

function parseRecipeName(result) {
  return result.RecipeName.replace("&", "and");
};

function getRecipes(recipeID, handler) {
  recipes.getById(recipeID, function (err, result) {
    setAttributes(result, handler);
    var totalTime = result.TotalTime;
    var recipeName = parseRecipeName(result);
    alexa.emit(':ask', skillName + " " + welcomeMessage + recipeName + welcomeTime + totalTime + " minutes.", welcomeMessage);
  });
}

function emitRecipeStep(step, recipe) {
  output = recipe["recipe"][step];
  alexa.emit(':ask', output);
}

function checkRecipeEnd(state) {
  return state.step + 1 < state.recipe['recipe'].length
}

function parseIngredients(result) {
  var IngredientList = result['IngredientDetails'];
  return IngredientList.map(function (element) {
    var quantityText = element.QuantityText.replace("-1/2", " and a half")
    if (element.QuantityText == "1") {
      return quantityText + " " + element.QuantityUnit + " " + element.IngredientName;
    } else {
      return quantityText + " " + element.QuantityUnit + "of " + element.IngredientName;
    }
  })
}
