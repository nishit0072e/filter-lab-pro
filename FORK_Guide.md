# 🚀 How to Deploy FilterLab Pro to GitHub Pages

This guide explains how to deploy **FilterLab Pro** (a Vite + React app) to GitHub Pages.

**Prerequisites**
- Node.js installed
- Git installed

**Step 1 - Local Setup**
1. Create a new folder on your computer named `filter-lab-pro`.
2. File structure should be like this:
```
filter-lab-pro/
├── node_modules/         # Created automatically when you run 'npm install'
├── src/
│   ├── FilterLabPro.jsx  # The main application code (the long file)
│   ├── main.jsx          # The React entry point
│   └── index.css         # Tailwind imports and custom styles
├── index.html            # The HTML entry point
├── package.json          # Project dependencies and scripts
└── vite.config.js        # Build configuration
```
4. Open a terminal in the folder and run:
```
 npm install
```

**Step 2 - GitHub Setup**
1. On GitHub, create a new repository (example name: `filter-lab-pro`). Make it **Public** (or Private if you prefer, but public is typical for Pages demos).
2. IMPORTANT: Edit `vite.config.js` and set the `base` property to match your repo name, for example:
```js
export default {
  base: '/filter-lab-pro/',
  // ...other config
}
```
3. IMPORTANT: Edit `package.json` and add/update the `"homepage"` field:
```
"homepage": "https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>"
```
```
"homepage": "https://yourusername.github.io/filter-lab-pro"
```
**Step 3 - Push and Deploy**  
In your terminal (inside the project folder) run:
```
git init
git add .
git commit -m "Initial commit"
```
Add the remote (replace with your repo URL):
```
git remote add origin https://github.com/<YOUR_USERNAME>/filter-lab-pro.git
```
If your project includes a `deploy` script in `package.json` (common pattern uses `gh-pages`), run:
```
npm run deploy
```
The `npm run deploy` step typically builds the app and pushes the `gh-pages` branch. If you don't have a deploy script, you can create one using `gh-pages` package or use a GitHub Actions workflow to push the `dist` output to `gh-pages`.

**Step 4 — Configure GitHub Pages**

1.  Open your GitHub repository on the website.
    
2.  Go to **Settings ▶ Pages** (or **Settings ▶ Code and automation ▶ Pages** depending on the UI).
    
3.  Under **Build and deployment / Source**, choose **Deploy from a branch** and set the branch to `gh-pages` (or the branch/folder your deploy method used).
    
4.  Save. GitHub will show the published URL. It may take a minute or two to go live.
    

**Accessing the App**  
Your app will be available at:
```
https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/
```


