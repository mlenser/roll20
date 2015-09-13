# roll20
Scripts for 5e roll20

### TODO

### Changelog

**Sep 13th 2015 (1.97)**

* Fixed higher level query toggle on spells.
* Logs are now sent in chat to whoever invokes the command

**Sep 12th 2015 (1.96)**

* Spell import default to male if there is no gender specified (previously errored out)
* Spells have been moved to their own file
* Included dist versions of the script to make it easier for others to use

**Sep 11th 2015 (1.95)**

* Import custom skills

**Aug 19th 2015 (1.94)**

* New spell duration

**Aug 14th 2015 (1.93)**

* Toggle higher level query output

**Aug 12th 2015 (1.92)**

* hidden gm info

**Aug 10th 2015 (1.91)**

* Fixed Earth Elemental
* Created new commands to create token macros. "!shaped-token-macro --bootstrap" for them all (initiative and query macros). "!shaped-token-macro --init" for initiative. "!shaped-token-macro --query" for the query macros.

**26th July - Aug 4th 2015 (1.90)**

* Huge update of spells see https://app.roll20.net/forum/permalink/2267695/
* Added token query macros

**25th July 2015 (1.88)**

* Spells are now imported based on the selected token(s)
* Spells can now be imported via an array
* Spell names do not need to be capitalized

**19th July 2015 (1.87)**

* Fixed cantrip import for spells

**13th July 2015 (1.86)**

* Command options must now be seperated by a space and 2 dashes " --". Example: "!shaped-spell-import --Dakra --Zone of Truth" or "!shaped-settings --pcs --output_option --show"
* Removed repeating action convert script.

**11th July 2015 (1.85)**

* Added a spell importer. I still need to parse the description and pull out attack,save,damage,heal,effects
* Removed Clone Token.

**3rd July 2015 (1.84)**

* (Dev) Refactored how settings are setup
* Refactored how HP is rolled it will now calculate and display the formula, average, and the amount rolled. These values are based on the HD rows (not the note field) with constitution modifier added for each HD.
* (Dev) Removed Power cards vestigial stuff that wasn't hooked up anyways.


**2nd July 2015 (1.83)**

* Sanitized Mind Flayer - it should also help others
* Sanitized so the description does not pull from the last action in some cases - it will still happen in others.
* Added targeting a creature's name for attacks and saves to the API so it can be edited on import and via settings changer
* Importer will automatically turn on hd toggle tabs.

**30th June 2015 (1.82)**

* Formatting and fix how the success message for !shaped-settings displays to prevent the error in the log.

**29th June 2015 (1.81)**

* Added the ability to change the settings items for all PCs, all NPCs, or all characters.
* Updated the fields for that and importing to match the refactoring done on the sheet.

**27th June 2015 (1.80)**

* Added the ability to show the monster's name to players
* Parsed SdX to 5dX

**28th May 2015 (1.79)**

* Added setting to show bar 1-3

**22nd May 2015 (1.78)**

* Added a function to decrease ammo when it is used.

**16th May 2015 (1.77)**

* Prevent some uncaught errors for certain weird syntaxes
* Allow for recharges on a short or long rest
* Fixed multiattack for werecreatures

**15th May 2015 (1.76)**

* Allow for multiple hit dice

**20th April 2015 (1.75)**

* More Sanitize
* Completely revamped the save regexes. All versions of the save syntax that I know of should be working
* Processed the description of monsters that comes after actions. It's been added to "traits"


**17-19th April 2015**

* Fixed rolling HP
* Fixed level calc to remove abs
* Fixed speed and senses parsing


**16th April 2015 (1.7)**

* Vision is now set on the token.
* Completely revamped the damage Regex
* Parsed the other format of a line (see Ankheg)

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