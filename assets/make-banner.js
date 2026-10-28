// Builds assets/banner.svg from assets/logo.svg (logo inlined: GitHub blocks external refs in SVG).
// node assets/make-banner.js
const fs = require('fs');
const path = require('path');

const logo = fs.readFileSync(path.join(__dirname, 'logo.svg'), 'utf8')
  .replace(/<svg[^>]*>/, '<svg x="64" y="64" width="272" height="272" viewBox="0 0 512 512">')
  .replace(/<title[^>]*>.*?<\/title>/, '');

const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 400" role="img" aria-labelledby="t">
  <title id="t">tokenfisher: catch only the tokens you need</title>
  <rect width="1280" height="400" rx="28" fill="#0A1C31"/>
  ${logo}
  <g font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="392" y="168" font-size="92" font-weight="800" fill="#FFFFFF" letter-spacing="-2">token<tspan fill="#3DD3F5">fisher</tspan></text>
    <text x="396" y="222" font-size="34" fill="#C9D6E6">Catch only the tokens you need.</text>
    <text x="396" y="290" font-size="26" font-weight="600" fill="#FFC93C">−14.5% cost on the same model · −61.6% with Sonnet routing</text>
    <text x="396" y="330" font-size="22" fill="#7F96B2">Same quality: 60/60 A/B runs pass hidden tests · token diet for Claude Code</text>
  </g>
</svg>
`;
fs.writeFileSync(path.join(__dirname, 'banner.svg'), banner);
console.log('assets/banner.svg written');
