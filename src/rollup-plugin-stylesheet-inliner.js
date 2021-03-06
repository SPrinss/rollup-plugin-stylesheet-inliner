const { readFileSync } = require('fs');
const MagicString = require('magic-string');
const path = require('path');

const main = () => {
  return {
    name: 'inline-stylesheets',
    transform (code, filePath) {

      const magicString = new MagicString(code.replace(/<link.*?rel="stylesheet".*?>/gi, (match) => {
        return _inlineStyles(match, filePath);
      }));

      return { 
        code: magicString.toString(),
        map: magicString.generateMap({ hires: true })
      }
    }
  }
}

const _inlineStyles = (linkTag, originalFilePath) => {
  const stylesheetURL = linkTag.match(/href\="(.*?)"/i)[1];
  if(stylesheetURL.match(/^http/)) return linkTag;
  const stylesheetFilePath = _parseFilePath(originalFilePath, stylesheetURL);
  const file = readFileSync(stylesheetFilePath);
  const css = file.toString();
  const importMergedCss = _mergeContentsFromImport(css, originalFilePath);

  return `<style>${importMergedCss}</style>`;
}

const _mergeContentsFromImport = (css, originalFilePath) => {
  const importMatches = Array.from(css.matchAll(/((@import ["|'|`])(.*?\.css)["|'|`];)/g));
  if(!importMatches || importMatches.length === 0) return css;

  // Clear imports from css
  css = css.replace(/((@import ["|'|`])(.*?\.css)["|'|`];)/g, '');

  const styles = [];
  importMatches.forEach(match => {
    const fileName = match[3];
    const cssBaseUrl = readFileSync(_parseFilePath(originalFilePath, `${fileName}`)).toString() || '';
    styles.push(cssBaseUrl);
  })

  // push previously obtained css last since this follows standard cascading logic.
  styles.push(css);

  return _mergeContentsFromImport(styles.join('\n'), originalFilePath);
}

const _parseFilePath = (originalFilePath, cssRelFilePath) => {
  const folderPath = originalFilePath.substring(0, originalFilePath.lastIndexOf('/'));
  const cssFilePath = path.join(folderPath, cssRelFilePath);
  return cssFilePath;
}

module.exports = main;
