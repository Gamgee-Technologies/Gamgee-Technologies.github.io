// Install Playwright locally, or explicitly supply an existing module path.
const playwright=require(process.env.GAMGEE_PLAYWRIGHT_MODULE||'playwright');
module.exports={...playwright,launchOptions:{headless:true,...(process.env.GAMGEE_BROWSER_CHANNEL?{channel:process.env.GAMGEE_BROWSER_CHANNEL}:{})}};
