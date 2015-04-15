# roll20
Scripts and other assorted things for roll20


### Changelog

**15th April 2015 (1.66)**

* Reactions now parse on import. No creature has Reactions and Legendary Actions, but if you want to have both please put Reactions after Legendary Actions.
* Added some support for Lair Actions - still need to process them fully
* Added some more items to sanitize list and did it for everything, not just certain parts of import.
* Vision can accept LMoP format now.

**14th April 2015 (1.63)**

* LMoP's range format of ## ft/## ft will now be sanitized to match the MM format of ##/## ft
* Sanitized Traits to get rid of any incorrect words.
* Combined the Damage Regex into one regex. Extensively tested Ancient Black Dragon and Giant Spider. It should work for most things. Still need to test more creatures
* Cleaned up the Save Regex
* Legendary Actions parsed to notes properly if they do not have any action.

**(1.64-1.65)**

* Fixed HP and HD parsing if there is no bonus to hd
* Fixed damage parsing to allow for negative numbers


**13th April 2015 (1.6)**

* Added the option to default bars to the attribute set in the settings. (Works on Importing and Converting)
* Added the option to show the token's name by default. Can be turned off.
* Fixed bars more after some additional testing
* Converting of Actions is now done. The text is processed back into the expected format from the book and then processed.
* Any item set as "Action", "Bonus Action", or "Special Action" is set to a normal action. Reactions will go to the reaction box. Lair and Legendary actions are converted appropriately.
* Speeds were converted properly now
* Visions (Darkvision, Blindsight, etc) were converted properly now
* Saves and Skills now use Proficiency or Expertise if applicable. They will calculate the offset and set it to a bonus if needed.
* NPC Actions now set the multiattack checkbox if the attack is part of the multiattack.
* Saves with "Within # feet" now add that # to range.
* Recharge is now processed from actions
* Line attacks are processed better now.
* Save attacks with damage are processed correctly now.


**12th April 2015 (1.43)**

* You can now specify the default tab for a sheet.
* You can now specify the default settings for the "Settings" tab in the script.
* Changed the default to not use the average hp as a minimum
* Printed out a log message when a creature is done converting.
* Imported JF's 2.4 changes to this script
* Fix bars to take the correct values for converting
* Fix convert to work with creatures whose name is different from their journal names (gets the journal via "represents")