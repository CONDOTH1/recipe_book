var request = require("superagent");
var xml2jsParser = require('superagent-xml2jsparser');

const API_ROOT = "http://www.kraftfoods.com/ws/recipews.asmx/";
const SCOPES = "GWS-KF07-Recipes";
const INTEGER = "integer";
const STRING = "string";
const BOOLEAN = "boolean";
const DOUBLE = "double";
const BRAND_ID = 1;
const LANG_ID = 1;
const SITE_ID = 1;

const FIELD_FORMATS = {
  RecipeType: INTEGER,
  LanguageID: INTEGER,
  RecipeID: INTEGER,
  PrepTime: DOUBLE,
  TotalTime: DOUBLE,
  NumberOfIngredients: DOUBLE,
  AvgRating: DOUBLE,
  NumberOfRatings: INTEGER,
  IsHealthy: BOOLEAN,
  IngredientID: INTEGER,
  QuantityNum: DOUBLE,
  NutritionItemID: INTEGER,
  Quantity: DOUBLE,
  DisplayOrder: INTEGER,
  CategoryID: INTEGER,
  SubCategoryID: INTEGER,
  CategoryRank: INTEGER
};

/* Utility method to perform get requests against the API */
var executeApiGet = function(methodName, parameters, callback) {
  request
    .get(API_ROOT + methodName + "?" + convertParametersToQueryStr(parameters))
    .accept('xml')
    .parse(xml2jsParser)
    .end(function(err, res) {
      return callback(err, res);
    });
};

/* Utility method to map fields to their correct types */
var formatField = function(fieldName, fieldValue) {
  if (FIELD_FORMATS[fieldName]) {
    var fieldFormat = FIELD_FORMATS[fieldName];
    if (fieldFormat == INTEGER) {
      try {
        return parseInt(fieldValue);
      } catch (e) {
        return fieldValue;
      }
    } else  if (fieldFormat == DOUBLE) {
      try {
        return parseFloat(fieldValue);
      } catch (e) {
        return fieldValue;
      }
    } else if (fieldFormat == BOOLEAN) {
      if (fieldValue == "true") {
        return true;
      } else {
        return false
      }
    }
  }

  return fieldValue;
};

/* Utility methods to turn parameters object into url query string */
var convertParametersToQueryStr = function(params) {
  var str = "";

  Object.keys(params).forEach(function(key) {
    if (str.length > 0) {
      str += "&";
    }

    str += key + "=" + params[key];
  });

  return str;
};


var normalizeObject = function(item) {
  var result = {};

  Object.keys(item).forEach(function(itemFieldName) {
    if (typeof item[itemFieldName][0] == "object") {
      var keys = Object.keys(item[itemFieldName][0]);
      result[itemFieldName] = normalizeArray(item[itemFieldName][0][keys[0]]);
    } else {
      result[itemFieldName] = formatField(itemFieldName, item[itemFieldName][0]);
    }
  });

  return result;
};

/* Utility method to turn the XML array object into a nicer, more standard JSON array */
var normalizeArray = function(obj) {
  var results = [];

  obj.forEach(function(item) {
    results.push(normalizeObject(item));
  });

  return results;
};

module.exports = {
  search: function(searchStr, callback) {
    executeApiGet("ExecuteRecipeSearch", {
      iSiteID: 1,
      iLanguageID: 1,
      sScopes: SCOPES,
      sClassifications: "",
      sCategories: "",
      sSubCategories: "",
      iPrepStartTime: 0,
      iPrepEndTime: 0,
      iTotalStartTime: 0,
      iTotalEndTime: 0,
      iPageNumber: 1,
      iPageSize: 10,
      sSortColumn: "AvgRating",
      sSortDirection: "",
      sIgnoreWords: "",
      bPhoto: "True",
      sSearchTerm: searchStr
    }, function(err, res) {
      if (err) {
        return callback(err);
      }

      if (!res.body || !res.body.RecipeSummariesResponse || !res.body.RecipeSummariesResponse.RecipeSummaries || res.body.RecipeSummariesResponse.RecipeSummaries.length == 0) {
        return callback("Couldn't find any results");
      }

      if (res.body.RecipeSummariesResponse.TotalCount && res.body.RecipeSummariesResponse.TotalCount[0] == '0') {
        return callback(null, []);
      }

      // Normalize the results
      var recipes = normalizeArray(res.body.RecipeSummariesResponse.RecipeSummaries[0].RecipeSummary);
      return callback(null, recipes);
    });
  },

  searchByIngredients: function(ingredient1, ingredient2, ingredient3, callback) {
    var ingredients =  ["","",""];

    if (ingredient1) {
      ingredients[0] = ingredient1;
    }

    if (ingredient2) {
      ingredients[1] = ingredient2;
    }

    if (ingredient3) {
      ingredients[2] = ingredient3;
    }

    executeApiGet("GetRecipesByIngredients", {
      iLangID: LANG_ID,
      iBrandID: BRAND_ID,
      sSortField: "",
      sSortDirection: "",
      bIsRecipePhotoRequired: "True",
      iStartRow: 1,
      iEndRow: 10,
      sIngredient1: ingredients[0],
      sIngredient2: ingredients[1],
      sIngredient3: ingredients[2],
    }, function(err, res) {
      if (err) {
        return callback(err);
      }

      if (!res.body || !res.body.RecipeSummariesResponse || !res.body.RecipeSummariesResponse.RecipeSummaries || res.body.RecipeSummariesResponse.RecipeSummaries.length == 0) {
        return callback("Couldn't find any results");
      }

      if (res.body.RecipeSummariesResponse.TotalCount && res.body.RecipeSummariesResponse.TotalCount[0] == '0') {
        return callback(null, []);
      }

      // Normalize the results
      var recipes = normalizeArray(res.body.RecipeSummariesResponse.RecipeSummaries[0].RecipeSummary);
      return callback(null, recipes);
    });
  },

  getById: function(id, callback) {
    executeApiGet("GetRecipeByRecipeID", {
      iRecipeID: id,
      bStripHTML: "False",
      iBrandID: BRAND_ID,
      iLangID: LANG_ID
    }, function(err, res) {
      if (err) {
        return callback(err);
      }

      if (!res.body || !res.body.RecipeDetailResponse) {
        return callback("Couldn't find any results");
      }

      return callback(null, normalizeObject(res.body.RecipeDetailResponse.RecipeDetail[0]));
    });
  },

  getCategories(callback) {
    executeApiGet("GetRecipeCategories", {
      iBrandID: BRAND_ID,
      iLangID: LANG_ID
    }, function(err, res) {
      if (err || !res.body || !res.body.GetRecipeCategoryResponse) {
        return callback("Could not get categories");
      }

      return callback(null, normalizeArray(res.body.GetRecipeCategoryResponse.RecipeCategories[0].RecipeCategory));

    })
  }
};
