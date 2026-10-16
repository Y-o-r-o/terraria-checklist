![Terraria Progression Logo](https://raw.githubusercontent.com/ewauq/ewauq.github.io/refs/heads/master/terraria-checklist/image/external/opengraph-cover.jpg)

# Terraria Progression Checklist
> The Complete Cheat Sheet Walkthrough

This repository contains the source code of the app available at https://ewauq.github.io/terraria-checklist/.

## Installing


[Node.js v20](https://nodejs.org/en/download/package-manager/current) is needed to install and run the project in development environment. No further configuration is needed.

Previous versions of Node should work, I haven't tested it.

```sh
git clone https://github.com/ewauq/terraria-checklist
cd terraria-checklist
npm install
```

## Developing

Once the project is cloned, you just need to start the development server:

```
npm run start
```

The deamon will wait for any changes and will rebuild the project on save.


A hot reload web server (such as [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) on VSCode) is recommended to ease the development workflow.

## Building
Once the app is ready for production, you will need to build it for production:
```
npm run build
```
Then, push the content of the `dist` folder on your web server.


## Updating weapons & accessories
The **Weapons** and **Accessories** collections (recipes, drop chances, NPC locations, upgrade paths and icons) are generated from the [Terraria Wiki](https://terraria.wiki.gg/):
```
npm run generate:gear
```
It updates `database.json`, `src/data/gear.json` and `src/image/item/`.


## Features
* Automatically re-compile CSS from SCSS files on save
* Automatically copy assets to output folder on build
* Automatically updates the 'last update date' during build
* Strong typing with TypeScript 🍧

Happy development ❤️

# Links & Credits

The app is available at https://ewauq.github.io/terraria-checklist/

* Code by [me](https://github.com/ewauq) 👋
* Artwork by [Vsewolod](https://www.deviantart.com/vsewolod/art/Terraria-World-730563825)
* UI Icons by [Google](https://fonts.google.com/icons)
* Game sprites by [Terraria Official Wiki](https://terraria.wiki.gg/wiki/Terraria_Wiki)

## Support & donations
* ☕ [Buy me a Coffee support page](https://buymeacoffee.com/ewauq)
* 📣 Send me your feedback or just say hello at terrariachecklist@pm.me
