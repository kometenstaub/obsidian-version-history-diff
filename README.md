# Version History Diff (for Sync and File Recovery Core plugins)

## Note

This plugin uses private APIs, so it may break at any time. Use at your own risk.

At the moment, it doesn't properly work on mobile devices, probably because of a CSS issue.

## Features

It can 

1. display diffs of both the **Sync** 
2. and the **File Recovery** version history for the currently active file, 
3. open a selected version in a modal and 
4. render it as either markdown or 
5. plain text and 
6. you can overwrite the file with this version as well. 
7. There is a colour-blind mode
8. It also adds a command to open Obsidian's native Sync history view, which is otherwise only accessible via the file menu.

The reason for showing you the note before you revert to this state is that the diffs can be misleading.

## Usage

There are two columns. The chosen version on the right side should be newer than the one on the left side for the diffs to make sense.

I personally find the file recovery diffs better as they are less frequent, but the Sync diffs might be helpful as well.

For Sync, it only displays the Sync versions. For File Recovery, it also shows the current state of the file from disk as latest version (it displays the current time).

Themes should mostly work. For one theme there was an issue which was similar to the issue the plugin has on mobile devices.
If there is something that can be done on my end, feel free to reach out/make a PR.


## Credits

All licenses and attributions can be found in the `esbuild.mjs` file for the code (and therefore in the `main.js` release), the CSS license is in `src/styles.css`. Should any license/attribution be missing, please let me know, and I will look into it.


Special thanks to @SlRvb for adapting the CSS to Obsidian and making the colour-blind mode.
