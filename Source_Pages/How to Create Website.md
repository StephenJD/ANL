# How to Create a Hugo Website

## Site Folder Structure

**Filenames must not include spaces.**

Use \\Source_Pages as a repository for any material you might want to use.

The published website uses what you put in \\content\\

The home-page is in \\content\\home\\

Published forms must be put in \\layouts\\partials\\widgets

## 

## Logo and Icon

In Your-Site/assets/images put two .png files of size 512x512 (maximum).

icon.png appears in the browser with the site address. logo.png appears on the page menu.

Website title (as shown in browser nav-bar_) set in \\config\\_default\\languages.toml

`[en]`

`#languageCode = "en"`

`languageName = "English"`

`contentDir = "content/en"`

`title = "AscendNextLevel"`

Set Organisation & Description & Social-media buttons in \\config\\_default\\params.toml

Set site-url in \\config\\_default\\config.toml

## Webpage construction

Every page must live in its own folder under \\content\\...\\.

Pages are either leaf-pages (just content) or branch-pages (links to other pages).

If a page folder has an index.md or \_index.md file, its header-title is used as the menu item, otherwise the folder name is used.

## Home Page

### Native hugo

The \\content\\ folder MUST contain \_index.md, making it a branch-page.

### More control:

Add to \\config\\_default\\config.toml :

`# Use \home as the home leaf-page bundle.`

`[frontmatter]`

`  home = "home/index.md"`

Homepage sections are now in a leaf-folder: \\content\\home with index.md:

`---`

`title: "Home"`

`type: "widget_page"`

`headless: true  # Do not render as its own page`

`---`

Home-page is rendered using \\layouts\\home\\single.html

### Leaf-Pages

A page-folder with an index.md will be constructed from all the files in the folder and any sub-folders. There must not be any nested index.md or \_index.md files.

If there is no index.md then each .md file creates its own leaf-page, otherwise each .md file creates a section on the page.

To create links to other pages, you add them manually in any of the .md files:

Welcome to my site. Here are some links:

\- [About](/about/)

\- [Contact](/contact/)

The page uses \\layouts\\document\\single.html to lay out the page.

### Branch-Pages

A branch-page has an \_index.md and lists its child-pages: The page is laid out according to \\layouts\\document\\list.html -\> \\layouts\\partials\\list_folder_layout.html

The \_index.md provides the title but no content.

Links with summaries will be provided to all other page.md files and subfolders containing \_index.md.

### Section Headers

# Each .md file must start with a header (recommend YAML):

`---`

`title: ANL Home # Appears at the top of the page.`

`headless: true # False if it starts a new page, True if it’s a page section.`

`type: document`

`geometry: margin=2cm`

`geometry: a4paper`

`share: true`

`summary: What this file contains`

`weight: 10`

`---`

`# Ascend Next Level`

## Site-Menu

Defined in \\config\\_default\\menus.toml

`[[main]]`

`  name = "ANL-Home"`

`  url = "#" # for home.`

`  url = "about" # to link to another page or folder.`

`  weight = 10`

## Forms
