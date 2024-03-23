# Version History Diff (for Sync and File Recovery Core plugins and Git)

## Note

This plugin uses private APIs, so it may break at any time. Use at your own risk.

## Features

It can 

1. display diffs of the **Sync** 
2. and the **File Recovery** 
3. and **Git** version history for the currently active file, 
   1. For this to work, the [Obsidian Git](https://obsidian.md/plugins?id=obsidian-git) plugin needs to be installed.
4. open a selected version in a modal and 
5. render it as either markdown or 
6. plain text and 
7. you can overwrite the file with this version as well. 
8. There is a colour-blind mode

The reason for showing you the note before you revert to this state is that the diffs can be misleading.

### Sync Diff example

![Sync Diff changes modal](https://raw.githubusercontent.com/kometenstaub/obsidian-version-history-diff/main/demo/sync-diff.png)

![Sync Diff rendered version](https://raw.githubusercontent.com/kometenstaub/obsidian-version-history-diff/main/demo/sync-diff-2.png)

![Sync Diff plain text version](https://raw.githubusercontent.com/kometenstaub/obsidian-version-history-diff/main/demo/sync-diff-3.png)

### Git Diff example with colour-blind mode

![Git Diff dark mode colourblind mode deletion](https://raw.githubusercontent.com/kometenstaub/obsidian-version-history-diff/main/demo/git-diff-colorblind.png)

![Git Diff light mode colourblind mode addition](https://raw.githubusercontent.com/kometenstaub/obsidian-version-history-diff/main/demo/git-diff-colorblind-light.png)

## Usage

There are two columns. The chosen version on the right side should be newer than the one on the left side for the diffs to make sense.

I personally find the file recovery diffs better as they are less frequent, but the Sync diffs might be helpful as well.

For *Sync*, it only displays the Sync versions. For *File Recovery* and *Git*, it also shows the current state of the file from disk as latest version.


## Contributing

**Please open an issue before you make a PR.**

## Credits

All licenses and attributions can be found in the `esbuild.mjs` file for the code (and therefore in the `main.js` release), the CSS license is in `src/styles.scss`. Should any license/attribution be missing, please let me know, and I will look into it.


Special thanks to @SlRvb for adapting the CSS to Obsidian and making the colour-blind mode and to @Vinzent03 for creating the necessary APIs in the Obsidian Git plugin.
