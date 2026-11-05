// Local offline evidence-index QA; no model, Docker, external requests or messages.
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(resolve(process.env.USERPROFILE||homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=process.cwd(),out=resolve(root,'handoff-out/petclinic-review-package-audit/20261105T093415Z-d1bebdf9');
const moved=resolve(root,'handoff-out/review-portability-45a9dd18/Máy khác có khoảng trắng');
const report={checks:[],browser_errors:[],external_requests:[],offline:true,actual_reviewer_notes_received:false};
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({offline:true,viewport:{width:1400,height:1000}});
 for(const round of [1,2]){
  const page=await context.newPage();page.on('pageerror',e=>report.browser_errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.browser_errors.push(m.text());});
  page.on('request',r=>{if(/^https?:/i.test(r.url()))report.external_requests.push(r.url());});
  const base=resolve(moved,'R'+round);await page.goto(pathToFileURL(resolve(base,'INDEX.html')).href);await page.waitForFunction(()=>document.getElementById('count').textContent.length>0);
  const index=JSON.parse(await readFile(resolve(base,'EVIDENCE_INDEX.json'),'utf8'));
  assert.equal(await page.locator('tbody tr').count(),index.files.length);
  await page.fill('#search','P03 OwnerDetails');await page.waitForFunction(()=>Number.parseInt(document.getElementById('count').textContent)>0);
  const visible=page.locator('tbody tr:visible');assert.ok(await visible.count()>0);assert.ok(await visible.count()<index.files.length);
  assert.ok((await visible.first().innerText()).includes('OwnerDetails'));
  await page.screenshot({path:resolve(out,'r'+round+'-desktop.png')});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:resolve(out,'r'+round+'-mobile.png')});
  const href=await visible.first().locator('a').getAttribute('href');assert.match(href,/^artifacts\/[0-9a-f]{64}\.txt$/);
  await visible.first().locator('a').click();await page.waitForURL(/artifacts/);assert.ok((await page.locator('body').innerText()).length>0);
  report.checks.push({round,logical_rows:index.files.length,search_filter:true,mobile_in_bounds:true,local_payload_opened:true,relocated_directory:true});
  await page.close();
 }
 assert.deepEqual(report.browser_errors,[]);assert.deepEqual(report.external_requests,[]);report.success=true;
}catch(error){report.success=false;report.failure=error.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await writeFile(resolve(out,'BROWSER_QA.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
