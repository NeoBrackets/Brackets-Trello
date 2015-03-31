# Brackets-Trello

You are working with [Trello](http://trello.com) to organize every detail in your web projects? This extension will give you even more powerful tools combining [Brackets](http://brackets.io) and Trello. At this point this extension is only Beta but we need your help to improve it so we want to share this tool with you right now!

## Basic functions

- Merge a part of Trello into Brackets (like a small Trello client inside Brackets)
- Add Trello cards inside the editor and push them to Trello
- Make changes on cards

We use the Trello API for it so we need read and write access to your Trello board, hope it's okay for you. 

## Some more advanced functions

- jump to a Trello comment directly using `Shift-Click` 
- Sync your Trello board all x seconds

## First steps

Okay you want to really try it out right now?

- Download this extension
	- prefered: Open the Extension Mangaer search for Trello and download our extension
	- well you should really use the prefered version,
		**but** you can also open the Extension Manager
		and use `Install from Url` and enter the GitHub URL.
- On the right panel you will now see a Trello Icon
- At the first time you will see a Settings Menu
- Enter your Trello API just two clicks and a copy action ;)
- Now you see all your boards just click one and start to play 
- Add a simple comment `// Trello: This is my first comment`
	- This one will appear at the top list called Changes it's an extra list not part of Trello
	- You now have to drag and drop the comment into a list
	- Use the Up Arrow which appears on the left while you mouse over the comment to push it
- Really I have to write a comment drag and drop and push?
	- No! You can write a comment like 
		
		`// Trello Todo: This is my first To Do comment`
	- This creates a green `+1` on the `To Do` list so no drag & drop anymore!
	- But at the moment you have to push it (If you want to push it automatically you need to say a word and we will work on it)
- You've played enough now! Enjoy working productive with this tool

## Idea behind this extension

- We all love Brackets and Trello
- Coding is a big part in our life
- Until now there was a missing link between coding with Brackets and organizing with Trello

Let's say you work with a small team on a project and you do or even don't know each other (Wei Lin lives in China, Amin Ullah Khan in Pakistan and Ole Kröger in Germany). You find a bug in the code or you have an awesome idea which should be added in line 127 in the main file. Well do you really want to write an email in the 21st century for this task?

Maybe a chat tool but your mate has no time at the moment and has to remember it. That's the point where Trello comes in but sth. like Bug in "main.js l.127 missing exception handling" isn't the best option. Just enter a Trello comment right at that line push it directly into Trello via Brackets and your teammate can handle it using this extension and click on the card using `Shift-Click` to directly jump to the comment inline and start fixing or implementing a new neat feature! 

## Screenshots
Overview:

![brackets-trello-readme](https://cloud.githubusercontent.com/assets/4931746/6921326/70fb0af2-d7c4-11e4-9794-4de6719e4b9d.png)

Drag and Drop:

![brackets-trello-readme-drag-drop](https://cloud.githubusercontent.com/assets/4931746/6921359/a7682fd4-d7c4-11e4-88e9-3e5791ffa886.png)


## Version 0.1.0 some things to do

- Shortcut for adding a new comment
	- show all members and lists with a drop down menu right in the code
- Show a dialog when removing a trello comment
	- move the card to `Done` or delete the card in trello board
- Drag lists inside a board
- Moving a card might need to change the code comment (tricky stuff this should be really safe)
- ... add an issue to add some more ideas to our minds!


