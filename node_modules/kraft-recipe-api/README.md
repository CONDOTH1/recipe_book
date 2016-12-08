# Kraft Recipes API for NodeJS
This is a work in progress library to wrap the Kraft Recipes API defined here: http://www.kraftfoods.com/ws/RecipeWS.asmx.

The API is defined in SOAP so the aim of this library is to simplify the calls and return back better JSON formatted results than you'd get directly from the XML.

You don't need any API keys to get going with this, you can just call the API straightaway.

## To use
```javascript
var recipes = require("kraft-recipe-api")
```

## Searching for recipes
```javascript
recipes.search("mango chicken", function(err, results) {
  console.log(results);
});
```

## Get Recipe by ID
```javascript
recipes.getById(138284, function(err, result) {
  console.log(result);
});
```

## Search by Ingredients
Search by up to 3 Ingredients (include nulls as parameters if you don't want all of them)
```javascript
recipes.searchByIngredients("beef", "chilli", "cheese", function(err, results) {
  console.log(result);
});
```

## Get a list of all available categories for recipes
```javascript
recipes.getCategories(function(err, results) {
  console.log(result);
});
```
