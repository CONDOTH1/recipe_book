# Recipe Book - Alexa Skill - NodeJS

This is a work in progress which is currently awaiting Amazon Certification. It is designed to accept a recipe from the kraft-recipe-api and then take the user through the recipe. This includes allowing the user to ask Alexa to go through the ingredients, each step of the instructions and to set multiple timers.

## Voice Commands (Utterances)

Go forward through instructions

```
Move to next step
What's next
Next instruction

```
Repeat current instruction

```
Say it again
Repeat instruction
What am I doing now
```

Go backwards through instructions

```
move to previous step
what' was the last step
last instruction
```
Go to specific step

```
Go to step {number}
What was step {number}
Repeat {number} instruction
```

Start timer

```
Start timer for {length} for {description}
Begin clock for {length} for {description}
Time for {length} for {description}
```

Check timer

```
How long is left on the clock for {description}
How much longer for {description}
Time left for {description}

```

Get ingredients

```
What ingredients do I need
What do I need
What are the ingredients

```

Get specific ingredient

```
How much {ingredient} do I need
What amount of {ingredient} do I need

```
