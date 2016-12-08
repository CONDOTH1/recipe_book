var recipes = require("./index.js");

var testSearch = function() {
  recipes.search("bbq pork", function(err, res) {
    console.log("Search results...");
    console.log(res);
  });
};

var testGetById = function() {
  recipes.getById(138284, function(err, res) {
    console.log("Get By ID...");
    console.log(err);
    console.log(res);
  });
};

var testSearchByIngredients = function() {
  recipes.searchByIngredients("beef", "chilli", "cheese", function(err, res) {
    console.log(err);
    console.log(res);
  });
};

var testGetCategories = function() {
  recipes.getCategories(function(err, res) {
    console.log(err);
    console.log(res);
  })
};

testGetCategories();
